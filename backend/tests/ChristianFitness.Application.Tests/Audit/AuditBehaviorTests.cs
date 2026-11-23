using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Audit;
using ChristianFitness.Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Time.Testing;

namespace ChristianFitness.Application.Tests.Audit;

/// <summary>
/// L2-019 AC3 (ADR 0023): which requests the audit behaviour records, one case per row. The requests
/// here stand for any request: the acceptance tests prove the rule on the real staff commands.
/// </summary>
public sealed class AuditBehaviorTests : IAsyncDisposable
{
    private static readonly Guid Actor = Guid.Parse("01a20000-0000-7000-8000-000000000001");
    private static readonly Guid Changed = Guid.Parse("01a20000-0000-7000-8000-000000000002");

    private readonly FakeTimeProvider _time = new(new DateTimeOffset(2026, 11, 23, 9, 0, 0, TimeSpan.Zero));
    private readonly ServiceProvider _services;

    public AuditBehaviorTests()
    {
        var store = $"audit-behaviour-{Guid.NewGuid():N}";
        _services = new ServiceCollection()
            .AddApplication()
            .AddMediatR(configuration => configuration.RegisterServicesFromAssembly(typeof(AuditBehaviorTests).Assembly))
            .AddDbContext<AppDbContext>(options => options.UseInMemoryDatabase(store))
            .AddScoped<IAppDbContext>(provider => provider.GetRequiredService<AppDbContext>())
            .AddSingleton<TimeProvider>(_time)
            .BuildServiceProvider();
    }

    private const string Recorded = "recorded";
    private const string None = "none";
    private const string Fails = "fails";

    public static TheoryData<string, IBaseRequest, string> Cases() => new()
    {
        // why, request, outcome: an entry recorded, none, or the request fails with none
        { "an auditable change that records and leaves the save to the behaviour", new Change { Records = true }, Recorded },
        { "an auditable change that records, then saves with its own change", new Change { Records = true, Saves = true }, Recorded },
        { "an auditable change refused after recording, before saving", new Change { Records = true, Throws = true }, Fails },
        { "an auditable change refused before recording", new Change { Throws = true }, Fails },
        { "an auditable change that names no record", new Change(), Fails },
        { "a request that is not auditable", new Look(), None },
    };

    [Theory]
    [MemberData(nameof(Cases))]
    public async Task Given_a_request_When_it_is_sent_Then_the_audit_behaviour_records_one_entry_only_for_an_auditable_change_that_succeeds(string why, IBaseRequest request, string outcome)
    {
        Assert.NotNull(why);
        using (var scope = _services.CreateScope())
        {
            var sending = scope.ServiceProvider.GetRequiredService<ISender>().Send((object)request, TestContext.Current.CancellationToken);
            if (outcome == Fails)
            {
                await Assert.ThrowsAnyAsync<InvalidOperationException>(() => sending);
            }
            else
            {
                await sending;
            }
        }

        using var read = _services.CreateScope();
        var entries = await read.ServiceProvider.GetRequiredService<AppDbContext>().AuditEntries
            .Select(entry => new { entry.ActorMemberId, entry.Action, entry.RecordType, entry.RecordId, entry.OccurredAt })
            .ToListAsync(TestContext.Current.CancellationToken);
        if (outcome == Recorded)
        {
            Assert.Equal(new { ActorMemberId = Actor, Action = "probe.changed", RecordType = "Probe", RecordId = Changed, OccurredAt = _time.GetUtcNow() }, Assert.Single(entries));
        }
        else
        {
            Assert.Empty(entries);
        }
    }

    [Fact]
    public void Given_a_handler_outside_an_auditable_command_When_it_records_Then_it_is_refused()
    {
        using var scope = _services.CreateScope();
        var trail = scope.ServiceProvider.GetRequiredService<AuditTrail>();

        Assert.Throws<InvalidOperationException>(() => trail.Record(Actor, "Probe", Changed));
    }

    public ValueTask DisposeAsync() => _services.DisposeAsync();

    /// <summary>Any data-changing staff command, as its handler behaves.</summary>
    public sealed class Change : IRequest, IAuditableCommand
    {
        public bool Records { get; init; }

        public bool Saves { get; init; }

        public bool Throws { get; init; }

        string IAuditableCommand.AuditAction => "probe.changed";

        public override string ToString() => $"Change(records: {Records}, saves: {Saves}, throws: {Throws})";
    }

    /// <summary>Any request that changes nothing.</summary>
    public sealed class Look : IRequest<int>
    {
        public override string ToString() => "Look";
    }

    internal sealed class ChangeHandler(AuditTrail audit, IAppDbContext db) : IRequestHandler<Change>
    {
        public async Task Handle(Change request, CancellationToken cancellationToken)
        {
            if (request.Records)
            {
                audit.Record(Actor, "Probe", Changed);
            }

            if (request.Throws)
            {
                throw new InvalidOperationException("Refused.");
            }

            if (request.Saves)
            {
                await db.SaveChangesAsync(cancellationToken);
            }
        }
    }

    internal sealed class LookHandler : IRequestHandler<Look, int>
    {
        public Task<int> Handle(Look request, CancellationToken cancellationToken) => Task.FromResult(42);
    }
}
