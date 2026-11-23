using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Tests.Sessions;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Account;

/// <summary>
/// L2-034 AC2: more than 5 account creations from one IP address in one hour refuse the next with
/// HTTP 429 and code <c>rate_limited</c> (ADR 0012). Each test joins from its own address, named in
/// <see cref="ApiFactory.ClientAddressHeader"/>, and moves the shared clock only forward.
/// </summary>
public sealed class JoinRateLimitTests(ProtectionsApiFactory factory) : IClassFixture<ProtectionsApiFactory>
{
    [Fact]
    public async Task Given_5_accounts_created_from_one_address_within_an_hour_When_a_sixth_join_is_attempted_Then_it_is_refused_with_429()
    {
        using var client = ClientFrom("203.0.113.10");
        await CreateAsync(client, "limit", 5, TimeSpan.FromMinutes(5));

        using var response = await JoinAsync(client, "limit.6@example.org");

        await AssertLimitedAsync(response);
        Assert.False(await ExistsAsync("limit.6@example.org"));
    }

    [Fact]
    public async Task Given_5_accounts_created_from_one_address_When_the_first_is_an_hour_old_Then_a_join_creates_an_account_again()
    {
        using var client = ClientFrom("203.0.113.11");
        await CreateAsync(client, "hour", 5, TimeSpan.FromMinutes(1));

        // Created a minute apart: 59 minutes after the first all five are inside the hour.
        factory.Time.Advance(TimeSpan.FromMinutes(55));
        using var stillLimited = await JoinAsync(client, "hour.early@example.org");
        await AssertLimitedAsync(stillLimited);

        factory.Time.Advance(TimeSpan.FromMinutes(1));
        using var response = await JoinAsync(client, "hour.6@example.org");

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.True(await ExistsAsync("hour.6@example.org"));
    }

    [Fact]
    public async Task Given_5_accounts_created_from_one_address_When_another_address_joins_Then_its_account_is_created()
    {
        using var first = ClientFrom("203.0.113.12");
        await CreateAsync(first, "first", 5, TimeSpan.Zero);
        using var other = ClientFrom("203.0.113.13");

        using var response = await JoinAsync(other, "other.1@example.org");

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    // Only accounts created count: a refused join (a taken email, invalid details) is not one.
    [Fact]
    public async Task Given_refused_joins_from_one_address_When_it_creates_accounts_Then_only_the_created_ones_count()
    {
        using var client = ClientFrom("203.0.113.14");
        await CreateAsync(client, "refused", 1, TimeSpan.Zero);
        for (var i = 0; i < 5; i++)
        {
            using var taken = await JoinAsync(client, "refused.1@example.org");
            Assert.Equal(HttpStatusCode.Conflict, taken.StatusCode);
            using var invalid = await client.PostAsJsonAsync(new Uri("/api/account/join", UriKind.Relative), new { fullName = "", email = "x", password = "short" }, TestContext.Current.CancellationToken);
            Assert.Equal(HttpStatusCode.BadRequest, invalid.StatusCode);
        }

        await CreateAsync(client, "refused.more", 4, TimeSpan.Zero);
        using var response = await JoinAsync(client, "refused.6@example.org");

        await AssertLimitedAsync(response);
    }

    // One IPv6 host is usually given a whole /64: its addresses share one limit.
    [Fact]
    public async Task Given_5_accounts_from_addresses_in_one_ipv6_64_When_another_address_in_it_joins_Then_it_is_refused()
    {
        for (var i = 1; i <= 5; i++)
        {
            using var host = ClientFrom($"2001:db8:aa:bb::{i:x}");
            await CreateAsync(host, $"v6.{i}", 1, TimeSpan.Zero);
        }

        using var sameNetwork = ClientFrom("2001:db8:aa:bb:ffff:1:2:3");
        using var refused = await JoinAsync(sameNetwork, "v6.6@example.org");
        using var otherNetwork = ClientFrom("2001:db8:aa:bc::1");
        using var created = await JoinAsync(otherNetwork, "v6.other@example.org");

        await AssertLimitedAsync(refused);
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
    }

    private HttpClient ClientFrom(string address)
    {
        var client = Browser.CreateClient(factory);
        client.DefaultRequestHeaders.Add(ApiFactory.ClientAddressHeader, address);
        return client;
    }

    /// <summary>Creates <paramref name="count"/> accounts, moving the clock <paramref name="apart"/> before each.</summary>
    private async Task CreateAsync(HttpClient client, string prefix, int count, TimeSpan apart)
    {
        for (var i = 1; i <= count; i++)
        {
            factory.Time.Advance(apart);
            using var response = await JoinAsync(client, $"{prefix}.{i}@example.org");
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        }
    }

    private static Task<HttpResponseMessage> JoinAsync(HttpClient client, string email) =>
        client.PostAsJsonAsync(new Uri("/api/account/join", UriKind.Relative), JoinTests.Details(email), TestContext.Current.CancellationToken);

    private async Task<bool> ExistsAsync(string email)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await db.Members.AnyAsync(m => m.NormalizedEmail == email, TestContext.Current.CancellationToken);
    }

    private static async Task AssertLimitedAsync(HttpResponseMessage response)
    {
        Assert.Equal(HttpStatusCode.TooManyRequests, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal(["code", "status", "title", "traceId", "type"], problem.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.Equal("rate_limited", problem.GetProperty("code").GetString());
        Assert.Equal(429, problem.GetProperty("status").GetInt32());
        Assert.Null(Browser.SessionSetCookie(response));
    }
}
