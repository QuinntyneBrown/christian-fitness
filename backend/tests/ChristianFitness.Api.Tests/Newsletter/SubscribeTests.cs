using System.Net;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using ChristianFitness.Domain.Newsletter;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Newsletter;

/// <summary>
/// L2-057 AC4, AC5 and L2-058 AC1, AC4: anyone subscribes with an email and no account. The answer
/// is 202 with no body whatever the address's standing; a new or awaiting address is sent one
/// confirmation email holding a single-use link that lasts 7 days, naming who sent it and why, that
/// ignoring it subscribes nobody, Christian Fitness and its postal address, an Unsubscribe link and
/// the one-click headers. Only hashes of the tokens are stored. Each test submits from a network of
/// its own.
/// </summary>
public sealed class SubscribeTests(NewsletterFactory factory) : IClassFixture<NewsletterFactory>
{
    [Fact]
    public async Task Given_a_new_address_When_it_is_submitted_Then_it_is_accepted_with_no_body_and_one_confirmation_email_is_sent()
    {
        using var client = Newsletter.ClientFrom(factory, "198.51.100.1");
        var before = factory.Emails.Sent().Count;

        using var response = await Newsletter.SubscribeAsync(client, "grace.new@example.org");

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        Assert.Empty(await response.Content.ReadAsByteArrayAsync(TestContext.Current.CancellationToken));
        var email = Assert.Single(Newsletter.SentTo(factory, "grace.new@example.org", before));
        Assert.Equal("Confirm your subscription to The Abundant Weekly", email.Subject);
        Assert.Contains("Christian Fitness", email.Text, StringComparison.Ordinal);
        Assert.Contains("Someone, hopefully you, asked to send The Abundant Weekly to this address.", email.Text, StringComparison.Ordinal);
        Assert.Matches(Newsletter.ConfirmLink(), email.Text);
        Assert.Contains("The link works once and lasts 7 days.", email.Text, StringComparison.Ordinal);
        Assert.Contains("If you did not ask, ignore this email: nobody is subscribed until the link is followed.", email.Text, StringComparison.Ordinal);
        Assert.Contains(ApiFactory.PostalAddress, email.Text, StringComparison.Ordinal);
        Assert.Matches(Newsletter.UnsubscribeLink(), email.Text);
        Assert.Single(Newsletter.ConfirmLink().Matches(email.Text));
    }

    [Fact]
    public async Task Given_a_confirmation_email_When_it_is_sent_Then_it_carries_the_one_click_unsubscribe_headers()
    {
        using var client = Newsletter.ClientFrom(factory, "198.51.100.2");
        var before = factory.Emails.Sent().Count;

        using var response = await Newsletter.SubscribeAsync(client, "grace.headers@example.org");

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        var email = Assert.Single(Newsletter.SentTo(factory, "grace.headers@example.org", before));
        var token = Newsletter.UnsubscribeTokenOf(email);
        Assert.Equal(["List-Unsubscribe", "List-Unsubscribe-Post"], email.Headers.Keys.Order(StringComparer.Ordinal));
        Assert.Equal($"<{ApiFactory.MemberAppBaseUrl}/api/public/newsletter/unsubscribe?token={token}>", email.Headers["List-Unsubscribe"]);
        Assert.Equal("List-Unsubscribe=One-Click", email.Headers["List-Unsubscribe-Post"]);
    }

    [Fact]
    public async Task Given_a_new_address_When_it_is_stored_Then_it_is_pending_and_only_the_hashes_of_its_tokens_are_kept()
    {
        using var client = Newsletter.ClientFrom(factory, "198.51.100.3");
        var before = factory.Emails.Sent().Count;

        using var response = await Newsletter.SubscribeAsync(client, "  Grace.Stored@Example.ORG ");

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        var email = Assert.Single(Newsletter.SentTo(factory, "grace.stored@example.org", before));
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var subscription = await db.NewsletterSubscriptions.SingleAsync(s => s.Email == "grace.stored@example.org", TestContext.Current.CancellationToken);
        Assert.Equal(SubscriptionStatus.Pending, subscription.Status);
        Assert.Equal(factory.Time.GetUtcNow(), subscription.RequestedAt);
        Assert.Null(subscription.ConsentedAt);
        var confirmation = await db.SubscriptionConfirmations.SingleAsync(c => c.SubscriptionId == subscription.Id, TestContext.Current.CancellationToken);
        Assert.Equal(HashOf(Newsletter.ConfirmTokenOf(email)), confirmation.TokenHash);
        Assert.Equal(factory.Time.GetUtcNow().AddDays(7), confirmation.ExpiresAt);
        Assert.Null(confirmation.UsedAt);
        var unsubscribe = await db.NewsletterUnsubscribeTokens.SingleAsync(t => t.SubscriptionId == subscription.Id, TestContext.Current.CancellationToken);
        Assert.Equal(HashOf(Newsletter.UnsubscribeTokenOf(email)), unsubscribe.TokenHash);
    }

    // L2-057 AC5: an awaiting address is sent the confirmation again, with a new link.
    [Fact]
    public async Task Given_an_address_awaiting_confirmation_When_it_is_submitted_again_Then_a_new_confirmation_is_sent()
    {
        using var client = Newsletter.ClientFrom(factory, "198.51.100.4");
        var before = factory.Emails.Sent().Count;
        using var first = await Newsletter.SubscribeAsync(client, "grace.again@example.org");
        factory.Time.Advance(TimeSpan.FromHours(2));

        using var second = await Newsletter.SubscribeAsync(client, "grace.again@example.org");

        Assert.Equal(HttpStatusCode.Accepted, second.StatusCode);
        var emails = Newsletter.SentTo(factory, "grace.again@example.org", before);
        Assert.Equal(2, emails.Length);
        Assert.NotEqual(Newsletter.ConfirmTokenOf(emails[0]), Newsletter.ConfirmTokenOf(emails[1]));
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var subscription = await db.NewsletterSubscriptions.SingleAsync(s => s.Email == "grace.again@example.org", TestContext.Current.CancellationToken);
        Assert.Equal(factory.Time.GetUtcNow(), subscription.RequestedAt);
    }

    // L2-057 AC5: a subscribed address is answered the same, and nothing about it changes.
    [Fact]
    public async Task Given_a_subscribed_address_When_it_is_submitted_Then_the_answer_is_the_same_and_no_email_is_sent()
    {
        using var client = Newsletter.ClientFrom(factory, "198.51.100.5");
        var before = factory.Emails.Sent().Count;
        using var first = await Newsletter.SubscribeAsync(client, "grace.subscribed@example.org");
        var token = Newsletter.ConfirmTokenOf(Assert.Single(Newsletter.SentTo(factory, "grace.subscribed@example.org", before)));
        using var confirmed = await Newsletter.ConfirmAsync(client, token);
        Assert.Equal(HttpStatusCode.OK, confirmed.StatusCode);
        var afterConfirm = factory.Emails.Sent().Count;

        using var response = await Newsletter.SubscribeAsync(client, "grace.subscribed@example.org");

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        Assert.Empty(await response.Content.ReadAsByteArrayAsync(TestContext.Current.CancellationToken));
        Assert.Empty(Newsletter.SentTo(factory, "grace.subscribed@example.org", afterConfirm));
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var subscription = await db.NewsletterSubscriptions.SingleAsync(s => s.Email == "grace.subscribed@example.org", TestContext.Current.CancellationToken);
        Assert.Equal(SubscriptionStatus.Subscribed, subscription.Status);
    }

    // L2-057 AC5: the page never reveals whether an address is subscribed.
    [Fact]
    public async Task Given_a_new_a_pending_and_a_subscribed_address_When_each_is_submitted_Then_the_answers_are_identical()
    {
        using var client = Newsletter.ClientFrom(factory, "198.51.100.6");
        var before = factory.Emails.Sent().Count;
        using var pending = await Newsletter.SubscribeAsync(client, "grace.same.pending@example.org");
        using var toConfirm = await Newsletter.SubscribeAsync(client, "grace.same.subscribed@example.org");
        var token = Newsletter.ConfirmTokenOf(Assert.Single(Newsletter.SentTo(factory, "grace.same.subscribed@example.org", before)));
        using var confirmed = await Newsletter.ConfirmAsync(client, token);
        using var other = Newsletter.ClientFrom(factory, "198.51.100.7");

        using var fresh = await Newsletter.SubscribeAsync(other, "grace.same.new@example.org");
        using var again = await Newsletter.SubscribeAsync(other, "grace.same.pending@example.org");
        using var subscribed = await Newsletter.SubscribeAsync(other, "grace.same.subscribed@example.org");

        HttpResponseMessage[] answers = [fresh, again, subscribed];
        Assert.All(answers, a => Assert.Equal(HttpStatusCode.Accepted, a.StatusCode));
        var shapes = await Task.WhenAll(answers.Select(ShapeOfAsync));
        Assert.Equal(shapes[0], shapes[1]);
        Assert.Equal(shapes[0], shapes[2]);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("grace.thompson@gmail")]
    [InlineData("grace thompson@gmail.com")]
    [InlineData("grace.thompson.gmail.com")]
    public async Task Given_a_malformed_or_empty_email_When_it_is_submitted_Then_it_is_refused_email_invalid_and_nothing_is_sent(string email)
    {
        using var client = Newsletter.ClientFrom(factory, "198.51.100.8");
        var before = factory.Emails.Sent().Count;

        using var response = await Newsletter.SubscribeAsync(client, email);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("validation_failed", problem.GetProperty("code").GetString());
        Assert.Equal(["email"], problem.GetProperty("fieldCodes").EnumerateObject().Select(p => p.Name));
        Assert.Equal("email_invalid", problem.GetProperty("fieldCodes").GetProperty("email").GetString());
        Assert.Equal(before, factory.Emails.Sent().Count);
    }

    [Fact]
    public async Task Given_an_email_over_254_characters_When_it_is_submitted_Then_it_is_refused_email_invalid()
    {
        using var client = Newsletter.ClientFrom(factory, "198.51.100.9");
        var email = new string('g', 243) + "@example.org";

        using var response = await Newsletter.SubscribeAsync(client, email);

        Assert.Equal(255, email.Length);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("email_invalid", problem.GetProperty("fieldCodes").GetProperty("email").GetString());
    }

    private static async Task<string> ShapeOfAsync(HttpResponseMessage response)
    {
        var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        var headers = response.Headers.Select(h => h.Key).Where(k => k != "traceparent").Order(StringComparer.Ordinal);
        return $"{(int)response.StatusCode} [{string.Join(",", headers)}] {body}";
    }

    private static string HashOf(string token) => Convert.ToHexStringLower(SHA256.HashData(Encoding.ASCII.GetBytes(token)));
}
