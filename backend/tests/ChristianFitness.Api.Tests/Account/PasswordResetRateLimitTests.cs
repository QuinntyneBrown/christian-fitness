using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Tests.Sessions;

namespace ChristianFitness.Api.Tests.Account;

/// <summary>
/// L2-034 AC3: 10 password reset requests from one IP address in one hour, whatever emails they
/// named, refuse the next with HTTP 429 and code <c>rate_limited</c>, and no email is sent (ADR
/// 0014). Each test asks from its own address, named in <see cref="ApiFactory.ClientAddressHeader"/>,
/// and moves the shared clock only forward.
/// </summary>
public sealed class PasswordResetRateLimitTests(ProtectionsApiFactory factory) : IClassFixture<ProtectionsApiFactory>
{
    [Fact]
    public async Task Given_10_reset_requests_from_one_address_within_an_hour_When_an_11th_is_made_for_a_member_Then_it_is_refused_with_429_and_no_email()
    {
        await JoinAsync("grace.limit@example.org");
        using var client = ClientFrom("203.0.113.40");
        await RequestManyAsync(client, "limit", 10, TimeSpan.FromMinutes(5));
        var before = factory.Emails.Sent().Count;

        using var response = await RequestAsync(client, "grace.limit@example.org");

        await AssertLimitedAsync(response);
        Assert.Equal(before, factory.Emails.Sent().Count);
    }

    // The refusal hangs on the address alone: an email no account has is refused the same way.
    [Fact]
    public async Task Given_10_reset_requests_from_one_address_When_an_11th_names_no_account_Then_it_is_refused_alike()
    {
        using var client = ClientFrom("203.0.113.41");
        await RequestManyAsync(client, "nobody", 10, TimeSpan.Zero);

        using var response = await RequestAsync(client, "nobody.11@example.org");

        await AssertLimitedAsync(response);
    }

    // Every request counts, for an account or not: a member's requests fill the window too.
    [Fact]
    public async Task Given_10_requests_for_a_member_from_one_address_When_another_email_is_asked_for_Then_it_is_refused()
    {
        await JoinAsync("grace.many@example.org");
        using var client = ClientFrom("203.0.113.42");
        for (var i = 0; i < 10; i++)
        {
            using var accepted = await RequestAsync(client, "grace.many@example.org");
            Assert.Equal(HttpStatusCode.Accepted, accepted.StatusCode);
        }

        using var response = await RequestAsync(client, "someone.else@example.org");

        await AssertLimitedAsync(response);
    }

    [Fact]
    public async Task Given_10_reset_requests_from_one_address_When_the_first_is_an_hour_old_Then_a_request_is_accepted_again()
    {
        await JoinAsync("grace.hour@example.org");
        using var client = ClientFrom("203.0.113.43");
        await RequestManyAsync(client, "hour", 10, TimeSpan.FromMinutes(1));

        // Made a minute apart: 59 minutes after the first all ten are inside the hour.
        factory.Time.Advance(TimeSpan.FromMinutes(50));
        using var stillLimited = await RequestAsync(client, "grace.hour@example.org");
        await AssertLimitedAsync(stillLimited);

        factory.Time.Advance(TimeSpan.FromMinutes(1));
        var before = factory.Emails.Sent().Count;
        using var response = await RequestAsync(client, "grace.hour@example.org");

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        Assert.Equal("grace.hour@example.org", Assert.Single(factory.Emails.Sent().Skip(before)).To);
    }

    [Fact]
    public async Task Given_10_reset_requests_from_one_address_When_another_address_asks_Then_it_is_accepted()
    {
        using var first = ClientFrom("203.0.113.44");
        await RequestManyAsync(first, "first", 10, TimeSpan.Zero);
        using var other = ClientFrom("203.0.113.45");

        using var response = await RequestAsync(other, "other.1@example.org");

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
    }

    // The account creations of one address and its reset requests are counted apart.
    [Fact]
    public async Task Given_10_reset_requests_from_one_address_When_it_joins_Then_its_account_is_created()
    {
        using var client = ClientFrom("203.0.113.46");
        await RequestManyAsync(client, "apart", 10, TimeSpan.Zero);

        using var response = await client.PostAsJsonAsync(new Uri("/api/account/join", UriKind.Relative), JoinTests.Details("apart.join@example.org"), TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    private HttpClient ClientFrom(string address)
    {
        var client = Browser.CreateClient(factory);
        client.DefaultRequestHeaders.Add(ApiFactory.ClientAddressHeader, address);
        return client;
    }

    /// <summary>Joins from an address of its own, so the join counts against no test's address.</summary>
    private async Task JoinAsync(string email)
    {
        using var client = Browser.CreateClient(factory);
        await SignInTests.JoinAsync(client, email);
    }

    /// <summary>Makes <paramref name="count"/> accepted requests for emails no account has, moving the clock <paramref name="apart"/> before each.</summary>
    private async Task RequestManyAsync(HttpClient client, string prefix, int count, TimeSpan apart)
    {
        for (var i = 1; i <= count; i++)
        {
            factory.Time.Advance(apart);
            using var response = await RequestAsync(client, $"{prefix}.{i}@example.org");
            Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        }
    }

    private static Task<HttpResponseMessage> RequestAsync(HttpClient client, string email) =>
        PasswordResetRequestTests.RequestAsync(client, email);

    private static async Task AssertLimitedAsync(HttpResponseMessage response)
    {
        Assert.Equal(HttpStatusCode.TooManyRequests, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal(["code", "status", "title", "traceId", "type"], problem.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.Equal("rate_limited", problem.GetProperty("code").GetString());
        Assert.Equal(429, problem.GetProperty("status").GetInt32());
    }
}
