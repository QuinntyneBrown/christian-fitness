using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Domain.Newsletter;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Newsletter;

/// <summary>
/// L2-058 AC2, AC3: a valid confirmation link subscribes the address, records the time and source of
/// consent and answers the address and when the first issue arrives; an expired, used or unknown
/// link is refused <c>subscription_link_expired</c> and subscribes nobody. The class's clock starts
/// on Thursday 26 November 2026 at 9 AM in Toronto and only moves forward.
/// </summary>
public sealed class ConfirmTests(NewsletterFactory factory) : IClassFixture<NewsletterFactory>
{
    [Fact]
    public async Task Given_a_valid_confirmation_link_When_it_is_followed_Then_the_address_is_subscribed_with_its_consent_recorded()
    {
        using var client = Newsletter.ClientFrom(factory, "198.51.100.20");
        var token = await SubscribeAsync(client, "grace.confirm@example.org");
        var now = factory.Time.GetUtcNow();

        using var response = await Newsletter.ConfirmAsync(client, token);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var answer = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal(["email", "firstIssueAt"], answer.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.Equal("grace.confirm@example.org", answer.GetProperty("email").GetString());
        Assert.Equal(WeeklyIssue.NextAfter(now), answer.GetProperty("firstIssueAt").GetDateTimeOffset());
        var subscription = await SubscriptionAsync("grace.confirm@example.org");
        Assert.Equal(SubscriptionStatus.Subscribed, subscription.Status);
        Assert.Equal(now, subscription.ConsentedAt);
        Assert.Equal("Confirmation link", subscription.ConsentSource);
    }

    [Fact]
    public async Task Given_a_link_already_followed_When_it_is_followed_again_Then_it_is_refused_as_expired()
    {
        using var client = Newsletter.ClientFrom(factory, "198.51.100.22");
        var token = await SubscribeAsync(client, "grace.twice@example.org");
        using var first = await Newsletter.ConfirmAsync(client, token);
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);

        using var second = await Newsletter.ConfirmAsync(client, token);

        await AssertExpiredAsync(second);
    }

    [Fact]
    public async Task Given_a_link_7_days_old_When_it_is_followed_Then_it_is_refused_and_nobody_is_subscribed()
    {
        using var client = Newsletter.ClientFrom(factory, "198.51.100.23");
        var token = await SubscribeAsync(client, "grace.expired@example.org");
        factory.Time.Advance(TimeSpan.FromDays(7));

        using var response = await Newsletter.ConfirmAsync(client, token);

        await AssertExpiredAsync(response);
        Assert.Equal(SubscriptionStatus.Pending, (await SubscriptionAsync("grace.expired@example.org")).Status);
    }

    [Fact]
    public async Task Given_a_link_a_moment_under_7_days_old_When_it_is_followed_Then_it_still_confirms()
    {
        using var client = Newsletter.ClientFrom(factory, "198.51.100.24");
        var token = await SubscribeAsync(client, "grace.justintime@example.org");
        factory.Time.Advance(TimeSpan.FromDays(7) - TimeSpan.FromSeconds(1));

        using var response = await Newsletter.ConfirmAsync(client, token);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Theory]
    [InlineData("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")]
    [InlineData("")]
    public async Task Given_an_unknown_link_When_it_is_followed_Then_it_is_refused_as_expired(string token)
    {
        using var client = Newsletter.ClientFrom(factory, "198.51.100.25");

        using var response = await Newsletter.ConfirmAsync(client, token);

        await AssertExpiredAsync(response);
    }

    // Confirming spends every open link of the subscription: an older email's link no longer works.
    [Fact]
    public async Task Given_two_confirmation_emails_When_the_newer_is_followed_Then_the_older_is_refused()
    {
        using var client = Newsletter.ClientFrom(factory, "198.51.100.26");
        var older = await SubscribeAsync(client, "grace.older@example.org");
        var newer = await SubscribeAsync(client, "grace.older@example.org");
        using var confirmed = await Newsletter.ConfirmAsync(client, newer);
        Assert.Equal(HttpStatusCode.OK, confirmed.StatusCode);

        using var response = await Newsletter.ConfirmAsync(client, older);

        await AssertExpiredAsync(response);
    }

    /// <summary>Subscribes <paramref name="email"/> and answers the token of the confirmation link it was sent.</summary>
    private async Task<string> SubscribeAsync(HttpClient client, string email)
    {
        var before = factory.Emails.Sent().Count;
        using var response = await Newsletter.SubscribeAsync(client, email);
        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        return Newsletter.ConfirmTokenOf(Assert.Single(Newsletter.SentTo(factory, email, before)));
    }

    private async Task<NewsletterSubscription> SubscriptionAsync(string email)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await db.NewsletterSubscriptions.AsNoTracking().SingleAsync(s => s.Email == email, TestContext.Current.CancellationToken);
    }

    private static async Task AssertExpiredAsync(HttpResponseMessage response)
    {
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("subscription_link_expired", problem.GetProperty("code").GetString());
    }
}
