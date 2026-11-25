using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Seeding;
using ChristianFitness.Domain.Audit;
using ChristianFitness.Domain.News;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Time.Testing;

namespace ChristianFitness.Application.Tests.Seeding;

/// <summary>
/// L2-077 AC2 (ADR 0094): a new deployment's seed adds the five starting bylines once; running it
/// again adds nothing and changes no byline an Admin has edited or removed, even when every byline
/// was removed.
/// </summary>
public sealed class BylineSeedTests : IDisposable
{
    private readonly FakeTimeProvider _time = new(new DateTimeOffset(2026, 11, 25, 9, 0, 0, TimeSpan.Zero));
    private readonly AppDbContext _db = new(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase($"byline-seed-{Guid.NewGuid():N}").Options);

    [Fact]
    public async Task Given_a_new_deployment_When_seed_runs_Then_it_adds_the_five_starting_bylines_with_their_bios()
    {
        var changes = await Runner().RunAsync(TestContext.Current.CancellationToken);

        Assert.Equal(1, changes);
        var bylines = await _db.Bylines.OrderBy(b => b.NameKey).ToListAsync(TestContext.Current.CancellationToken);
        Assert.Equal(
            [
                ("CF Team", "Notices and event news from the Christian Fitness team."),
                ("Marcus Bell", "Personal trainer who writes beginner guides and profiles of our professionals."),
                ("Naomi Clarke", "Writes about community, church sport and the people behind both."),
                ("Pastor Ruth Adeyemi", "Pastor and writer on faith, rest and the body."),
                ("Priya Raman", "Nutrition writer and meal-prep volunteer in Mississauga."),
            ],
            bylines.Select(b => (b.Name, b.Bio)));
        Assert.All(bylines, b => Assert.Null(b.PhotoKey));
    }

    [Fact]
    public async Task Given_the_seeded_bylines_When_seed_runs_again_Then_it_adds_nothing()
    {
        await Runner().RunAsync(TestContext.Current.CancellationToken);

        var changes = await Runner().RunAsync(TestContext.Current.CancellationToken);

        Assert.Equal(0, changes);
        Assert.Equal(5, await _db.Bylines.CountAsync(TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task Given_an_Admin_edited_a_starting_byline_When_seed_runs_again_Then_the_edit_stays()
    {
        await Runner().RunAsync(TestContext.Current.CancellationToken);
        var naomi = await _db.Bylines.SingleAsync(b => b.Name == "Naomi Clarke", TestContext.Current.CancellationToken);
        naomi.Describe("Naomi Clarke-Hughes", "Community writer.", null);
        await _db.SaveChangesAsync(TestContext.Current.CancellationToken);

        var changes = await Runner().RunAsync(TestContext.Current.CancellationToken);

        Assert.Equal(0, changes);
        Assert.Equal(
            ["CF Team", "Marcus Bell", "Naomi Clarke-Hughes", "Pastor Ruth Adeyemi", "Priya Raman"],
            await _db.Bylines.OrderBy(b => b.NameKey).Select(b => b.Name).ToListAsync(TestContext.Current.CancellationToken));
    }

    // An Admin removed every byline: the audit trail remembers, so the seed never puts them back.
    [Fact]
    public async Task Given_an_Admin_removed_every_byline_When_seed_runs_again_Then_none_comes_back()
    {
        await Runner().RunAsync(TestContext.Current.CancellationToken);
        foreach (var byline in await _db.Bylines.ToListAsync(TestContext.Current.CancellationToken))
        {
            _db.Bylines.Remove(byline);
            _db.AuditEntries.Add(AuditEntry.Record(Guid.NewGuid(), "byline.removed", nameof(Byline), byline.Id, _time.GetUtcNow()));
        }

        await _db.SaveChangesAsync(TestContext.Current.CancellationToken);

        var changes = await Runner().RunAsync(TestContext.Current.CancellationToken);

        Assert.Equal(0, changes);
        Assert.Empty(await _db.Bylines.ToListAsync(TestContext.Current.CancellationToken));
    }

    // An audit entry about something else is not a byline change.
    [Fact]
    public async Task Given_a_deployment_whose_audit_names_only_other_records_When_seed_runs_Then_it_adds_the_starting_bylines()
    {
        _db.AuditEntries.Add(AuditEntry.Record(Guid.NewGuid(), "series.created", "EventSeries", Guid.NewGuid(), _time.GetUtcNow()));
        await _db.SaveChangesAsync(TestContext.Current.CancellationToken);

        var changes = await Runner().RunAsync(TestContext.Current.CancellationToken);

        Assert.Equal(1, changes);
        Assert.Equal(5, await _db.Bylines.CountAsync(TestContext.Current.CancellationToken));
    }

    public void Dispose() => _db.Dispose();

    private SeedRunner Runner()
    {
        _db.ChangeTracker.Clear();
        IAppDbContext db = _db;
        return new SeedRunner([new BylineSeed(_time)], db);
    }
}
