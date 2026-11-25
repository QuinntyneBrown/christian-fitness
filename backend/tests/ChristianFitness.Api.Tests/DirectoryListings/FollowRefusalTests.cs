using System.Net;
using ChristianFitness.Domain.Directory;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.DirectoryListings;

/// <summary>
/// L2-056 AC5 and AC9 (journey 8; ADR 0088): a suspended member's follow is refused 403
/// <c>account_suspended</c> while their unfollow is allowed; past 60 follows and unfollows in a
/// rolling hour the next is refused 429 <c>too_many_attempts</c>, repeats counting and refusals not.
/// The class has its own store and clock, since it moves time.
/// </summary>
public sealed class FollowRefusalTests(DirectoryFactory factory) : IClassFixture<DirectoryFactory>
{
    private Task<(HttpStatusCode Status, System.Text.Json.JsonElement Body)> SendAsync(HttpMethod method, Guid listing, string cookie) =>
        FollowListingTests.SendAsync(factory, method, listing, cookie);

    private async Task<Guid> MemberIdAsync(string email)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await db.Members.Where(m => m.NormalizedEmail == email).Select(m => m.Id).SingleAsync(TestContext.Current.CancellationToken);
    }

    private async Task<int> LoggedChangesAsync(Guid member)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await db.ListingFollowChanges.CountAsync(c => c.MemberId == member, TestContext.Current.CancellationToken);
    }

    [Fact]
    public async Task Given_a_suspended_member_When_they_follow_Then_it_is_refused_account_suspended_and_nothing_is_stored()
    {
        var tyler = await FollowListingTests.MemberAsync(factory, "tyler.follow-suspended@example.org");
        var listing = await factory.AddListingAsync(ListingKind.Organization, "Faith & Footwork");
        await factory.SuspendAsync(await MemberIdAsync("tyler.follow-suspended@example.org"));

        var (status, body) = await SendAsync(HttpMethod.Put, listing, tyler);

        Assert.Equal(HttpStatusCode.Forbidden, status);
        Assert.Equal("account_suspended", body.GetProperty("code").GetString());
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.False(await db.ListingFollows.AnyAsync(f => f.ListingId == listing, TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task Given_a_suspended_member_who_follows_a_listing_When_they_unfollow_it_Then_they_stop_following()
    {
        var tyler = await FollowListingTests.MemberAsync(factory, "tyler.unfollow-suspended@example.org");
        var listing = await factory.AddListingAsync(ListingKind.Organization, "Lakeshore Runners Fellowship");
        await SendAsync(HttpMethod.Put, listing, tyler);
        await factory.SuspendAsync(await MemberIdAsync("tyler.unfollow-suspended@example.org"));

        var (status, body) = await SendAsync(HttpMethod.Delete, listing, tyler);

        Assert.Equal(HttpStatusCode.OK, status);
        Assert.False(body.GetProperty("following").GetBoolean());
        Assert.Equal(0, body.GetProperty("followers").GetInt32());
    }

    [Fact]
    public async Task Given_60_follows_and_unfollows_in_the_last_hour_When_another_is_sent_Then_it_is_refused_429_until_the_first_is_an_hour_old()
    {
        const string email = "grace.follow-limit@example.org";
        var grace = await FollowListingTests.MemberAsync(factory, email);
        var listing = await factory.AddListingAsync(ListingKind.Company, "Northline Athletic");
        var first = factory.Time.GetUtcNow();

        // 60 changes, a repeat among them: each counts, whatever it changed.
        for (var i = 0; i < 60; i++)
        {
            var method = i == 1 ? HttpMethod.Put : i % 2 == 0 ? HttpMethod.Put : HttpMethod.Delete;
            Assert.Equal(HttpStatusCode.OK, (await SendAsync(method, listing, grace)).Status);
            factory.Time.Advance(TimeSpan.FromSeconds(1));
        }

        var (status, body) = await SendAsync(HttpMethod.Delete, listing, grace);
        Assert.Equal(HttpStatusCode.TooManyRequests, status);
        Assert.Equal("too_many_attempts", body.GetProperty("code").GetString());
        Assert.Equal(HttpStatusCode.TooManyRequests, (await SendAsync(HttpMethod.Put, listing, grace)).Status);

        // One tick before the first change is an hour old it still counts; at the hour it no longer does.
        factory.Time.Advance(first + TimeSpan.FromHours(1) - TimeSpan.FromTicks(1) - factory.Time.GetUtcNow());
        Assert.Equal(HttpStatusCode.TooManyRequests, (await SendAsync(HttpMethod.Delete, listing, grace)).Status);
        factory.Time.Advance(TimeSpan.FromTicks(1));
        var (allowed, answer) = await SendAsync(HttpMethod.Delete, listing, grace);
        Assert.Equal(HttpStatusCode.OK, allowed);
        Assert.False(answer.GetProperty("following").GetBoolean());

        // The refusals were not logged, and the change an hour old was pruned when the next was stored.
        Assert.Equal(60, await LoggedChangesAsync(await MemberIdAsync(email)));
    }

    [Fact]
    public async Task Given_another_member_at_the_limit_When_this_member_follows_Then_the_limit_is_their_own()
    {
        const string email = "david.follow-limit@example.org";
        var david = await FollowListingTests.MemberAsync(factory, email);
        var grace = await FollowListingTests.MemberAsync(factory, "grace.follow-own-limit@example.org");
        var listing = await factory.AddListingAsync(ListingKind.Company, "Northline Athletic");
        for (var i = 0; i < 60; i++)
        {
            await SendAsync(HttpMethod.Put, listing, david);
        }

        Assert.Equal(HttpStatusCode.TooManyRequests, (await SendAsync(HttpMethod.Put, listing, david)).Status);
        Assert.Equal(HttpStatusCode.OK, (await SendAsync(HttpMethod.Put, listing, grace)).Status);
    }
}
