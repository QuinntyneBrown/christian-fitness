using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Profiles;
using ChristianFitness.Domain.Events;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Time.Testing;

namespace ChristianFitness.Api.Tests.Events;

/// <summary>
/// The API on a clock the tests hold, with the events a test puts in the store and the numbers going
/// it gives them: until registration exists (slice 6.1) nothing in the product creates one, so
/// <see cref="Going"/> stands in for the reader (ADR 0027). Events are put in through the domain, as
/// the admin API would make them.
/// </summary>
public sealed class BrowseEventsFactory : ApiFactory
{
    public static readonly DateTimeOffset Now = new(2026, 4, 15, 12, 45, 0, TimeSpan.Zero);

    public FakeTimeProvider Time { get; } = new(Now);

    /// <summary>How many are going to each event; an event not named has none.</summary>
    public Dictionary<Guid, int> Going { get; } = [];

    protected override void ConfigureServices(IServiceCollection services)
    {
        services.RemoveAll<TimeProvider>();
        services.AddSingleton<TimeProvider>(Time);
        services.RemoveAll<IRegistrationReader>();
        services.AddSingleton<IRegistrationReader>(new GoingReader(Going));
    }

    /// <summary>Puts an event in the store: a draft, or published when <paramref name="published"/>.</summary>
    public async Task<Guid> AddEventAsync(
        string title,
        DateTimeOffset startsAt,
        bool published = true,
        EventCategory category = EventCategory.Run,
        int priceCents = 0,
        int capacity = 50,
        string? imageKey = null)
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var e = Event.CreateDraft(title, category, startsAt, "Martin Goodman Trail", "Waterfront, Toronto", priceCents, capacity, "Come run with us.", Now, imageKey);
        if (published)
        {
            e.Publish(e.CreatedAt);
        }

        db.Events.Add(e);
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        return e.Id;
    }

    private sealed class GoingReader(Dictionary<Guid, int> going) : IRegistrationReader
    {
        public Task<int> GoingAsync(Guid eventId, CancellationToken cancellationToken) => Task.FromResult(going.GetValueOrDefault(eventId));

        public Task<IReadOnlyDictionary<Guid, int>> GoingForAsync(IReadOnlyCollection<Guid> eventIds, CancellationToken cancellationToken) =>
            Task.FromResult<IReadOnlyDictionary<Guid, int>>(eventIds.Where(going.ContainsKey).ToDictionary(id => id, id => going[id]));

        public Task<IReadOnlyList<UpcomingEventDto>> UpcomingForAsync(Guid memberId, DateTimeOffset now, CancellationToken cancellationToken) =>
            Task.FromResult<IReadOnlyList<UpcomingEventDto>>([]);

        public Task<IReadOnlyDictionary<Guid, int>> CountsForAsync(IReadOnlyCollection<Guid> memberIds, CancellationToken cancellationToken) =>
            Task.FromResult<IReadOnlyDictionary<Guid, int>>(new Dictionary<Guid, int>());
    }
}
