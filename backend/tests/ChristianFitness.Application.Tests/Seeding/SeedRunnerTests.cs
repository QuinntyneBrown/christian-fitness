using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Seeding;
using ChristianFitness.Domain.Members;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Time.Testing;

namespace ChristianFitness.Application.Tests.Seeding;

/// <summary>
/// L2-041 AC2: the seed command run twice changes nothing the second time. L2-049 AC15 (ADR 0100):
/// the first Admin is made from <c>Seed__AdminEmail</c> with no password and no Google subject, for
/// its first Google sign-in to bind.
/// </summary>
public sealed class SeedRunnerTests : IDisposable
{
    private static readonly StaffSeedOptions Staff = new("Admin@Christian.Fitness", "Community Admin");

    private readonly FakeTimeProvider _time = new(new DateTimeOffset(2026, 11, 22, 9, 0, 0, TimeSpan.Zero));
    private readonly AppDbContext _db = new(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase($"seed-{Guid.NewGuid():N}").Options);

    [Fact]
    public async Task Given_an_empty_database_When_seed_runs_Then_it_adds_the_first_Admin_with_no_password()
    {
        var changes = await RunnerFor(Staff).RunAsync(TestContext.Current.CancellationToken);

        Assert.Equal(1, changes);
        var member = Assert.Single(await _db.Members.ToListAsync(TestContext.Current.CancellationToken));
        Assert.Equal("Admin@Christian.Fitness", member.Email);
        Assert.Equal("admin@christian.fitness", member.NormalizedEmail);
        Assert.Equal("Community Admin", member.Name);
        Assert.Equal(MemberStatus.Active, member.Status);
        Assert.Equal(_time.GetUtcNow(), member.JoinedAt);
        Assert.Equal(string.Empty, member.PasswordHash);
        var role = Assert.Single(await _db.StaffRoles.ToListAsync(TestContext.Current.CancellationToken));
        Assert.Equal((member.Id, StaffRoleName.Admin), (role.MemberId, role.Name));
    }

    [Fact]
    public async Task Given_a_seeded_database_When_seed_runs_again_Then_it_changes_nothing()
    {
        await RunnerFor(Staff).RunAsync(TestContext.Current.CancellationToken);
        var first = Assert.Single(await _db.Members.AsNoTracking().ToListAsync(TestContext.Current.CancellationToken));
        _time.Advance(TimeSpan.FromDays(1));

        var changes = await RunnerFor(Staff with { Name = "Renamed" }).RunAsync(TestContext.Current.CancellationToken);

        Assert.Equal(0, changes);
        var again = Assert.Single(await _db.Members.AsNoTracking().ToListAsync(TestContext.Current.CancellationToken));
        Assert.Equal(
            (first.Id, first.Email, first.Name, first.PasswordHash, first.JoinedAt),
            (again.Id, again.Email, again.Name, again.PasswordHash, again.JoinedAt));
        Assert.Single(await _db.StaffRoles.ToListAsync(TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task Given_the_staff_email_in_another_case_When_seed_runs_Then_it_changes_nothing()
    {
        await RunnerFor(Staff).RunAsync(TestContext.Current.CancellationToken);

        var changes = await RunnerFor(Staff with { Email = "  ADMIN@christian.FITNESS " }).RunAsync(TestContext.Current.CancellationToken);

        Assert.Equal(0, changes);
        Assert.Single(await _db.Members.ToListAsync(TestContext.Current.CancellationToken));
    }

    // ADR 0111: a deployment that has not set up staff Google sign-in yet still releases.
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("  ")]
    public async Task Given_no_admin_email_When_seed_runs_Then_it_adds_no_Admin_and_changes_nothing(string? email)
    {
        var changes = await RunnerFor(new StaffSeedOptions(email!, null)).RunAsync(TestContext.Current.CancellationToken);

        Assert.Equal(0, changes);
        Assert.Empty(await _db.Members.ToListAsync(TestContext.Current.CancellationToken));
        Assert.Empty(await _db.StaffRoles.ToListAsync(TestContext.Current.CancellationToken));
    }

    public void Dispose() => _db.Dispose();

    private SeedRunner RunnerFor(StaffSeedOptions staff)
    {
        _db.ChangeTracker.Clear();
        IAppDbContext db = _db;
        return new SeedRunner([new StaffAccountSeed(staff, _time)], db);
    }
}
