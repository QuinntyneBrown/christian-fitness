using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace ChristianFitness.Api.Tests.Newsletter;

/// <summary>
/// L2-057 AC7: more than 5 subscriptions from one network in an hour refuse the next with HTTP 429
/// and code <c>too_many_attempts</c>, and nothing is sent. Every submission counts, whatever the
/// address's standing, so the refusal says nothing about addresses. Each test submits from its own
/// network and moves the shared clock only forward.
/// </summary>
public sealed class SubscribeRateLimitTests(NewsletterFactory factory) : IClassFixture<NewsletterFactory>
{
    [Fact]
    public async Task Given_5_subscriptions_from_one_network_within_an_hour_When_a_6th_is_submitted_Then_it_is_refused_with_429_and_nothing_is_sent()
    {
        using var client = Newsletter.ClientFrom(factory, "192.0.2.10");
        await SubscribeManyAsync(client, "limit", 5, TimeSpan.FromMinutes(5));
        var before = factory.Emails.Sent().Count;

        using var response = await Newsletter.SubscribeAsync(client, "limit.6@example.org");

        await AssertLimitedAsync(response);
        Assert.Equal(before, factory.Emails.Sent().Count);
    }

    [Fact]
    public async Task Given_5_submissions_of_one_address_When_a_6th_names_it_again_Then_it_is_refused_alike()
    {
        using var client = Newsletter.ClientFrom(factory, "192.0.2.11");
        for (var i = 0; i < 5; i++)
        {
            using var accepted = await Newsletter.SubscribeAsync(client, "limit.same@example.org");
            Assert.Equal(HttpStatusCode.Accepted, accepted.StatusCode);
        }

        using var response = await Newsletter.SubscribeAsync(client, "limit.same@example.org");

        await AssertLimitedAsync(response);
    }

    [Fact]
    public async Task Given_5_subscriptions_from_one_network_When_the_first_is_an_hour_old_Then_one_is_accepted_again()
    {
        using var client = Newsletter.ClientFrom(factory, "192.0.2.12");
        await SubscribeManyAsync(client, "hour", 5, TimeSpan.FromMinutes(1));

        // Made a minute apart: 59 minutes after the first all five are inside the hour.
        factory.Time.Advance(TimeSpan.FromMinutes(55));
        using var stillLimited = await Newsletter.SubscribeAsync(client, "hour.6@example.org");
        await AssertLimitedAsync(stillLimited);

        factory.Time.Advance(TimeSpan.FromMinutes(1));
        using var response = await Newsletter.SubscribeAsync(client, "hour.7@example.org");

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
    }

    [Fact]
    public async Task Given_5_subscriptions_from_one_network_When_another_network_submits_Then_it_is_accepted()
    {
        using var first = Newsletter.ClientFrom(factory, "192.0.2.13");
        await SubscribeManyAsync(first, "first", 5, TimeSpan.Zero);
        using var other = Newsletter.ClientFrom(factory, "192.0.2.14");

        using var response = await Newsletter.SubscribeAsync(other, "other.1@example.org");

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
    }

    // The limit counts subscriptions apart from password reset requests (each limiter has its own counts).
    [Fact]
    public async Task Given_5_subscriptions_from_one_network_When_it_asks_for_a_reset_link_Then_it_is_accepted()
    {
        using var client = Newsletter.ClientFrom(factory, "192.0.2.15");
        await SubscribeManyAsync(client, "apart", 5, TimeSpan.Zero);

        using var response = await client.PostAsJsonAsync(new Uri("/api/account/password-reset", UriKind.Relative), new { email = "apart@example.org" }, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
    }

    private async Task SubscribeManyAsync(HttpClient client, string prefix, int count, TimeSpan apart)
    {
        for (var i = 1; i <= count; i++)
        {
            factory.Time.Advance(apart);
            using var response = await Newsletter.SubscribeAsync(client, $"{prefix}.{i}@example.org");
            Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        }
    }

    private static async Task AssertLimitedAsync(HttpResponseMessage response)
    {
        Assert.Equal(HttpStatusCode.TooManyRequests, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal(["code", "status", "title", "traceId", "type"], problem.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.Equal("too_many_attempts", problem.GetProperty("code").GetString());
    }
}
