using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Seeding;
using ChristianFitness.Domain.Members;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Time.Testing;

namespace ChristianFitness.Application.Tests.Seeding;

/// <summary>
/// ADR 0065 and ADR 0087: the seed adds the Christian Fitness account once, by its fixed id, with no
/// password, and a second run changes nothing.
/// </summary>
public sealed class SystemAccountSeedTests : IDisposable
{
    private readonly FakeTimeProvider _time = new(new DateTimeOffset(2026, 11, 25, 9, 0, 0, TimeSpan.Zero));
    private readonly AppDbContext _db = new(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase($"system-seed-{Guid.NewGuid():N}").Options);

    [Fact]
    public async Task Given_no_system_account_When_seed_runs_Then_the_Christian_Fitness_account_is_added_without_a_password()
    {
        var changes = await Runner().RunAsync(TestContext.Current.CancellationToken);

        Assert.Equal(1, changes);
        var account = Assert.Single(await _db.Members.ToListAsync(TestContext.Current.CancellationToken));
        Assert.Equal(
            (SystemMembers.ChristianFitnessId, "Christian Fitness", true, string.Empty, MemberStatus.Active),
            (account.Id, account.Name, account.IsSystem, account.PasswordHash, account.Status));
    }

    [Fact]
    public async Task Given_a_seeded_system_account_When_seed_runs_again_Then_it_changes_nothing()
    {
        await Runner().RunAsync(TestContext.Current.CancellationToken);
        _time.Advance(TimeSpan.FromDays(1));

        var changes = await Runner().RunAsync(TestContext.Current.CancellationToken);

        Assert.Equal(0, changes);
        Assert.Equal(1, await _db.Members.CountAsync(TestContext.Current.CancellationToken));
    }

    public void Dispose() => _db.Dispose();

    private SeedRunner Runner()
    {
        _db.ChangeTracker.Clear();
        IAppDbContext db = _db;
        return new SeedRunner([new SystemAccountSeed(_time)], db);
    }
}
