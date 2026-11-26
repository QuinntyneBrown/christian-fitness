using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Domain.Newsletter;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.AspNetCore.DataProtection.KeyManagement;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Newsletter;

/// <summary>
/// L2-058 AC5, AC8 and AC10: an Unsubscribe link, followed from Subscribe or posted one-click by a
/// mail client, unsubscribes the address at once with no sign-in, answers the same when followed
/// again, works at any later time and after Data Protection key rotation, and is a no-op for a
/// token that names nothing. The class's clock only moves forward.
/// </summary>
public sealed class UnsubscribeTests(NewsletterFactory factory) : IClassFixture<NewsletterFactory>
{
    [Fact]
    public async Task Given_a_subscribed_address_When_its_unsubscribe_link_is_followed_Then_it_is_unsubscribed_and_the_address_is_answered()
    {
        using var client = Newsletter.ClientFrom(factory, "198.51.100.40");
        var email = await SubscribeAndConfirmAsync(client, "grace.leave@example.org");
        var now = factory.Time.GetUtcNow();

        using var response = await Newsletter.UnsubscribeAsync(client, Newsletter.UnsubscribeTokenOf(email));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var answer = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal(["email"], answer.EnumerateObject().Select(p => p.Name));
        Assert.Equal("grace.leave@example.org", answer.GetProperty("email").GetString());
        var subscription = await SubscriptionAsync("grace.leave@example.org");
        Assert.Equal(SubscriptionStatus.Unsubscribed, subscription!.Status);
        Assert.Equal(now, subscription.UnsubscribedAt);
    }

    [Fact]
    public async Task Given_an_unsubscribed_address_When_the_link_is_followed_again_Then_the_answer_is_the_same_and_the_purge_is_not_delayed()
    {
        using var client = Newsletter.ClientFrom(factory, "198.51.100.41");
        var email = await SubscribeAndConfirmAsync(client, "grace.leave.twice@example.org");
        var token = Newsletter.UnsubscribeTokenOf(email);
        using var first = await Newsletter.UnsubscribeAsync(client, token);
        var leftAt = factory.Time.GetUtcNow();
        factory.Time.Advance(TimeSpan.FromDays(3));

        using var second = await Newsletter.UnsubscribeAsync(client, token);

        Assert.Equal(HttpStatusCode.OK, second.StatusCode);
        Assert.Equal(await first.Content.ReadAsStringAsync(TestContext.Current.CancellationToken), await second.Content.ReadAsStringAsync(TestContext.Current.CancellationToken));
        Assert.Equal(leftAt, (await SubscriptionAsync("grace.leave.twice@example.org"))!.UnsubscribedAt);
    }

    [Theory]
    [InlineData("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")]
    [InlineData("")]
    public async Task Given_a_token_that_names_nothing_When_it_is_followed_Then_it_is_a_no_op_answering_no_address(string token)
    {
        using var client = Newsletter.ClientFrom(factory, "198.51.100.42");

        using var response = await Newsletter.UnsubscribeAsync(client, token);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var answer = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal(JsonValueKind.Null, answer.GetProperty("email").ValueKind);
    }

    // RFC 8058: a mail client posts List-Unsubscribe=One-Click to the header's address, from no page
    // of the app and so with no antiforgery token.
    [Fact]
    public async Task Given_the_list_unsubscribe_header_When_a_mail_client_posts_one_click_Then_the_address_is_unsubscribed()
    {
        using var client = Newsletter.ClientFrom(factory, "198.51.100.43");
        var email = await SubscribeAndConfirmAsync(client, "grace.oneclick@example.org");
        using var mailClient = factory.CreateClient();

        using var response = await OneClickAsync(mailClient, email.Headers["List-Unsubscribe"].Trim('<', '>'));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Empty(await response.Content.ReadAsByteArrayAsync(TestContext.Current.CancellationToken));
        Assert.Equal(SubscriptionStatus.Unsubscribed, (await SubscriptionAsync("grace.oneclick@example.org"))!.Status);
    }

    [Fact]
    public async Task Given_a_one_click_post_with_a_token_that_names_nothing_When_it_arrives_Then_it_is_answered_200_and_changes_nothing()
    {
        using var mailClient = factory.CreateClient();

        using var response = await OneClickAsync(mailClient, $"{ApiFactory.MemberAppBaseUrl}{Newsletter.OneClickPath}?token=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    // AC8: no expiry, and nothing that depends on Data Protection keys.
    [Fact]
    public async Task Given_an_unsubscribe_link_a_year_old_after_every_key_was_revoked_When_it_is_posted_Then_it_still_unsubscribes()
    {
        using var client = Newsletter.ClientFrom(factory, "198.51.100.44");
        var email = await SubscribeAndConfirmAsync(client, "grace.rotated@example.org");
        factory.Time.Advance(TimeSpan.FromDays(400));
        factory.Services.GetRequiredService<IKeyManager>().RevokeAllKeys(DateTimeOffset.UtcNow, "Rotated in a test");
        using var mailClient = factory.CreateClient();

        using var response = await OneClickAsync(mailClient, email.Headers["List-Unsubscribe"].Trim('<', '>'));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(SubscriptionStatus.Unsubscribed, (await SubscriptionAsync("grace.rotated@example.org"))!.Status);
    }

    // Unsubscribing spends any open confirmation link, so an older email cannot subscribe the address again.
    [Fact]
    public async Task Given_a_pending_address_When_it_unsubscribes_from_the_confirmation_email_Then_that_confirmation_link_no_longer_works()
    {
        using var client = Newsletter.ClientFrom(factory, "198.51.100.45");
        var before = factory.Emails.Sent().Count;
        using var subscribed = await Newsletter.SubscribeAsync(client, "grace.pending.leave@example.org");
        var email = Assert.Single(Newsletter.SentTo(factory, "grace.pending.leave@example.org", before));
        using var left = await Newsletter.UnsubscribeAsync(client, Newsletter.UnsubscribeTokenOf(email));
        Assert.Equal(HttpStatusCode.OK, left.StatusCode);

        using var response = await Newsletter.ConfirmAsync(client, Newsletter.ConfirmTokenOf(email));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(SubscriptionStatus.Unsubscribed, (await SubscriptionAsync("grace.pending.leave@example.org"))!.Status);
    }

    // ADR 0078: a token survives the resubscription of its record.
    [Fact]
    public async Task Given_an_address_that_left_and_subscribed_again_When_an_old_unsubscribe_link_is_followed_Then_it_unsubscribes_it_again()
    {
        using var client = Newsletter.ClientFrom(factory, "198.51.100.46");
        var first = await SubscribeAndConfirmAsync(client, "grace.back@example.org");
        using var left = await Newsletter.UnsubscribeAsync(client, Newsletter.UnsubscribeTokenOf(first));
        await SubscribeAndConfirmAsync(client, "grace.back@example.org");
        Assert.Equal(SubscriptionStatus.Subscribed, (await SubscriptionAsync("grace.back@example.org"))!.Status);

        using var response = await Newsletter.UnsubscribeAsync(client, Newsletter.UnsubscribeTokenOf(first));

        Assert.Equal("grace.back@example.org", (await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken)).GetProperty("email").GetString());
        Assert.Equal(SubscriptionStatus.Unsubscribed, (await SubscriptionAsync("grace.back@example.org"))!.Status);
    }

    internal static async Task<HttpResponseMessage> OneClickAsync(HttpClient mailClient, string address)
    {
        Assert.StartsWith($"{ApiFactory.MemberAppBaseUrl}{Newsletter.OneClickPath}?token=", address, StringComparison.Ordinal);
        var uri = new Uri(address[ApiFactory.MemberAppBaseUrl.Length..], UriKind.Relative);
        using var body = new FormUrlEncodedContent([new KeyValuePair<string, string>("List-Unsubscribe", "One-Click")]);
        return await mailClient.PostAsync(uri, body, TestContext.Current.CancellationToken);
    }

    /// <summary>Subscribes and confirms <paramref name="address"/>, answering the confirmation email it was sent.</summary>
    private async Task<ChristianFitness.Application.Email.EmailMessage> SubscribeAndConfirmAsync(HttpClient client, string address)
    {
        var before = factory.Emails.Sent().Count;
        using var subscribed = await Newsletter.SubscribeAsync(client, address);
        Assert.Equal(HttpStatusCode.Accepted, subscribed.StatusCode);
        var email = Assert.Single(Newsletter.SentTo(factory, address, before));
        using var confirmed = await Newsletter.ConfirmAsync(client, Newsletter.ConfirmTokenOf(email));
        Assert.Equal(HttpStatusCode.OK, confirmed.StatusCode);
        return email;
    }

    private async Task<NewsletterSubscription?> SubscriptionAsync(string address)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await db.NewsletterSubscriptions.AsNoTracking().SingleOrDefaultAsync(s => s.Email == address, TestContext.Current.CancellationToken);
    }
}
