using ChristianFitness.Application.News;
using ChristianFitness.Application.Newsletter;
using ChristianFitness.Application.Preferences;
using ChristianFitness.Application.Scheduling;
using MediatR;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace ChristianFitness.Api.Scheduling;

/// <summary>What one tick did: whether this replica held the lease, how many stories it published, subscriptions it purged and data archives it built.</summary>
public sealed record PublishingTick(bool Held, int Published, int Purged = 0, int Exported = 0);

/// <summary>
/// The API's one scheduler (ADR 0069, ADR 0104): every <see cref="Interval"/> of its
/// <see cref="TimeProvider"/> it takes or renews the scheduler lease and, only while it holds it,
/// runs each due job in a scope of its own: <see cref="PublishDueStoriesCommand"/>, then
/// <see cref="PurgeNewsletterSubscriptionsCommand"/> (ADR 0110), then the newsletter's due issue,
/// then <see cref="BuildDataExportsCommand"/> (ADR 0117). A
/// replica that cannot take the lease skips the tick, and one that loses it starts no more work.
/// The lease lasts <see cref="LeaseDuration"/> from the holder's last tick, so another replica takes
/// over within a minute of the holder stopping. A failed tick is logged by the exception's type only
/// and the next tick tries again, so due work stays eligible after a failure or a restart.
/// </summary>
public sealed partial class PublishingClock : BackgroundService
{
    /// <summary>How often the clock ticks: a story goes out within a minute of its time (L2-069 AC4).</summary>
    public static readonly TimeSpan Interval = TimeSpan.FromSeconds(30);

    /// <summary>How long a take or renewal holds the lease.</summary>
    public static readonly TimeSpan LeaseDuration = TimeSpan.FromSeconds(60);

    /// <summary>The lease's name: the publishing clock's work.</summary>
    public const string LeaseName = "publishing-clock";

    private readonly IServiceScopeFactory _scopes;
    private readonly TimeProvider _time;
    private readonly ILogger<PublishingClock> _logger;
    private readonly string _holder;
    private PeriodicTimer? _timer;

    /// <summary>A clock named <paramref name="holder"/>, or by its machine and a new id.</summary>
    public PublishingClock(IServiceScopeFactory scopes, TimeProvider time, ILogger<PublishingClock> logger, string? holder = null)
    {
        _scopes = scopes;
        _time = time;
        _logger = logger;
        _holder = holder ?? $"{Environment.MachineName}/{Guid.NewGuid():N}";
    }

    /// <summary>Raised after each tick with what it did, so a test can await a tick rather than sleep.</summary>
    public event EventHandler<PublishingTick>? Ticked;

    /// <summary>
    /// One tick: takes or renews the lease in one scope and, if this replica holds it, publishes the
    /// due stories in another.
    /// </summary>
    public async Task<PublishingTick> TickAsync(CancellationToken cancellationToken)
    {
        bool held;
        using (var scope = _scopes.CreateScope())
        {
            var sender = scope.ServiceProvider.GetRequiredService<ISender>();
            held = await sender.Send(new TakeSchedulerLeaseCommand(LeaseName, _holder, LeaseDuration), cancellationToken).ConfigureAwait(false);
        }

        if (!held)
        {
            return new PublishingTick(false, 0);
        }

        using (var scope = _scopes.CreateScope())
        {
            var sender = scope.ServiceProvider.GetRequiredService<ISender>();
            var published = await sender.Send(new PublishDueStoriesCommand(), cancellationToken).ConfigureAwait(false);
            using var purgeScope = _scopes.CreateScope();
            var purged = await purgeScope.ServiceProvider.GetRequiredService<ISender>()
                .Send(new PurgeNewsletterSubscriptionsCommand(), cancellationToken).ConfigureAwait(false);
            using var issueScope = _scopes.CreateScope();
            await issueScope.ServiceProvider.GetRequiredService<ISender>()
                .Send(new SendDueIssueCommand(), cancellationToken).ConfigureAwait(false);
            using var exportScope = _scopes.CreateScope();
            var exported = await exportScope.ServiceProvider.GetRequiredService<ISender>()
                .Send(new BuildDataExportsCommand(), cancellationToken).ConfigureAwait(false);
            return new PublishingTick(true, published, purged, exported);
        }
    }

    /// <summary>The timer starts with the clock, before the first tick is awaited, so no move of the clock is missed.</summary>
    public override Task StartAsync(CancellationToken cancellationToken)
    {
        _timer = new PeriodicTimer(Interval, _time);
        return base.StartAsync(cancellationToken);
    }

    public override void Dispose()
    {
        _timer?.Dispose();
        base.Dispose();
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var timer = _timer ?? throw new InvalidOperationException("The clock is started before it runs.");
        while (await timer.WaitForNextTickAsync(stoppingToken).ConfigureAwait(false))
        {
            PublishingTick tick;
            try
            {
                tick = await TickAsync(stoppingToken).ConfigureAwait(false);
            }
#pragma warning disable CA1031 // One failed tick must not stop the clock; the next one tries again.
            catch (Exception exception) when (exception is not OperationCanceledException || !stoppingToken.IsCancellationRequested)
#pragma warning restore CA1031
            {
                LogTickFailed(_logger, exception.GetType().FullName);
                tick = new PublishingTick(false, 0);
            }

            if (tick.Published > 0)
            {
                LogPublished(_logger, tick.Published);
            }

            if (tick.Purged > 0)
            {
                LogPurged(_logger, tick.Purged);
            }

            if (tick.Exported > 0)
            {
                LogExported(_logger, tick.Exported);
            }

            Ticked?.Invoke(this, tick);
        }
    }

    [LoggerMessage(Level = LogLevel.Error, Message = "A publishing clock tick failed: {ExceptionType}")]
    private static partial void LogTickFailed(ILogger logger, string? exceptionType);

    [LoggerMessage(Level = LogLevel.Information, Message = "The publishing clock published {Count} scheduled stories")]
    private static partial void LogPublished(ILogger logger, int count);

    [LoggerMessage(Level = LogLevel.Information, Message = "The publishing clock purged {Count} newsletter subscriptions")]
    private static partial void LogPurged(ILogger logger, int count);

    // The count only: never whose archive, nor what it holds (L2-066 AC10).
    [LoggerMessage(Level = LogLevel.Information, Message = "The publishing clock built {Count} data archives")]
    private static partial void LogExported(ILogger logger, int count);
}

/// <summary>Registers the publishing clock as the API's hosted scheduler (ADR 0069).</summary>
public static class PublishingClockServiceCollectionExtensions
{
    public static IServiceCollection AddPublishingClock(this IServiceCollection services)
    {
        services.TryAddEnumerable(ServiceDescriptor.Singleton<IHostedService, PublishingClock>());
        return services;
    }
}
