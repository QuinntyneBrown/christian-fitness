using System.Security.Claims;
using ChristianFitness.Domain.Members;
using ChristianFitness.Infrastructure.Persistence;
using ChristianFitness.Infrastructure.Security;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Time.Testing;

namespace ChristianFitness.Application.Tests.Sessions;

/// <summary>
/// L2-004 AC5 (ADR 0009): sessions kept on the server. A removed or expired session opens nothing,
/// and a member's expired sessions are deleted when they next sign in.
/// </summary>
public sealed class DatabaseTicketStoreTests : IAsyncDisposable
{
    private static readonly TimeSpan Lifetime = TimeSpan.FromDays(14);

    private readonly FakeTimeProvider _time = new(new DateTimeOffset(2026, 11, 22, 9, 0, 0, TimeSpan.Zero));
    private readonly ServiceProvider _services;
    private readonly DatabaseTicketStore _store;
    private readonly Member _grace = Member.Join("Grace Thompson", "grace@example.org", "hash", new DateTimeOffset(2026, 11, 1, 9, 0, 0, TimeSpan.Zero));
    private readonly Member _michael = Member.Join("Michael Chen", "michael@example.org", "hash", new DateTimeOffset(2026, 11, 1, 9, 0, 0, TimeSpan.Zero));

    public DatabaseTicketStoreTests()
    {
        var store = $"tickets-{Guid.NewGuid():N}";
        _services = new ServiceCollection()
            .AddDbContext<AppDbContext>(options => options.UseInMemoryDatabase(store))
            .BuildServiceProvider();
        _store = new DatabaseTicketStore(_services.GetRequiredService<IServiceScopeFactory>(), _time);
        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Members.AddRange(_grace, _michael);
        db.SaveChanges();
    }

    [Fact]
    public async Task Given_a_stored_session_When_it_is_read_back_Then_it_holds_the_member_id_only()
    {
        var key = await _store.StoreAsync(TicketFor(_grace), TestContext.Current.CancellationToken);

        var ticket = await _store.RetrieveAsync(key, TestContext.Current.CancellationToken);

        Assert.NotNull(ticket);
        var claim = Assert.Single(ticket.Principal.Claims);
        Assert.Equal((ClaimTypes.NameIdentifier, _grace.Id.ToString()), (claim.Type, claim.Value));
    }

    [Fact]
    public async Task Given_a_removed_session_When_it_is_read_Then_there_is_none()
    {
        var key = await _store.StoreAsync(TicketFor(_grace), TestContext.Current.CancellationToken);

        await _store.RemoveAsync(key, TestContext.Current.CancellationToken);

        Assert.Null(await _store.RetrieveAsync(key, TestContext.Current.CancellationToken));
        Assert.Empty(await KeysAsync());
    }

    [Fact]
    public async Task Given_a_session_past_its_expiry_When_it_is_read_Then_there_is_none_and_it_is_deleted()
    {
        var key = await _store.StoreAsync(TicketFor(_grace), TestContext.Current.CancellationToken);
        _time.Advance(Lifetime - TimeSpan.FromSeconds(1));
        Assert.NotNull(await _store.RetrieveAsync(key, TestContext.Current.CancellationToken));

        _time.Advance(TimeSpan.FromSeconds(1));

        Assert.Null(await _store.RetrieveAsync(key, TestContext.Current.CancellationToken));
        Assert.Empty(await KeysAsync());
    }

    [Fact]
    public async Task Given_a_renewed_session_When_its_first_expiry_passes_Then_it_is_still_open()
    {
        var key = await _store.StoreAsync(TicketFor(_grace), TestContext.Current.CancellationToken);
        _time.Advance(TimeSpan.FromDays(10));

        await _store.RenewAsync(key, TicketFor(_grace), TestContext.Current.CancellationToken);
        _time.Advance(TimeSpan.FromDays(10));

        Assert.NotNull(await _store.RetrieveAsync(key, TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task Given_expired_sessions_When_the_member_signs_in_again_Then_only_their_expired_ones_are_deleted()
    {
        var old = await _store.StoreAsync(TicketFor(_grace), TestContext.Current.CancellationToken);
        var michaels = await _store.StoreAsync(TicketFor(_michael), TestContext.Current.CancellationToken);
        _time.Advance(Lifetime);

        var fresh = await _store.StoreAsync(TicketFor(_grace), TestContext.Current.CancellationToken);

        Assert.Equal(new[] { fresh, michaels }.Order(StringComparer.Ordinal), (await KeysAsync()).Order(StringComparer.Ordinal));
        Assert.DoesNotContain(old, await KeysAsync());
    }

    public ValueTask DisposeAsync() => _services.DisposeAsync();

    /// <summary>A ticket as the cookie scheme makes one: the member id, expiring after the lifetime.</summary>
    private AuthenticationTicket TicketFor(Member member) =>
        new(
            new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, member.Id.ToString())], "Cookies")),
            new AuthenticationProperties { IsPersistent = true, ExpiresUtc = _time.GetUtcNow() + Lifetime },
            "Cookies");

    private async Task<List<string>> KeysAsync()
    {
        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await db.Sessions.Select(session => session.Id).ToListAsync(TestContext.Current.CancellationToken);
    }
}
