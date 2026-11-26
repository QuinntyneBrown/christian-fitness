using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Scheduling;
using ChristianFitness.Domain.Newsletter;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;

namespace ChristianFitness.Api.Tests.Newsletter;

/// <summary>
/// L2-058 AC6, AC8 and AC9 (ADR 0078, ADR 0110): the publishing clock's tick purges a Pending
/// subscription 30 days after its most recent request and an Unsubscribed one 29 days after it left
/// (within the 30 days), with their confirmation links and Unsubscribe tokens; a Subscribed one
/// stays. After a purge the old Unsubscribe link names nothing. Each test runs one tick of a clock
/// built on the host's services, at instants it moves the fake clock to; it never sleeps.
/// </summary>
public sealed class PurgeTests(NewsletterFactory factory) : IClassFixture<NewsletterFactory>
{
    [Fact]
    public async Task Given_a_pending_subscription_When_30_days_pass_since_its_request_Then_a_tick_purges_it_with_its_links_and_not_a_second_sooner()
    {
        using var client = Newsletter.ClientFrom(factory, "198.51.100.60");
        await SubscribeAsync(client, "purge.pending@example.org");
        var id = (await SubscriptionAsync("purge.pending@example.org"))!.Id;

        factory.Time.Advance(TimeSpan.FromDays(30) - TimeSpan.FromSeconds(1));
        await TickAsync();
        Assert.NotNull(await SubscriptionAsync("purge.pending@example.org"));

        factory.Time.Advance(TimeSpan.FromSeconds(1));
        var tick = await TickAsync();

        Assert.True(tick.Purged >= 1);
        Assert.Null(await SubscriptionAsync("purge.pending@example.org"));
        Assert.Equal((0, 0), await LinksOfAsync(id));
    }

    [Fact]
    public async Task Given_a_pending_address_that_asked_again_When_30_days_pass_since_the_first_request_Then_it_is_kept_until_30_days_after_the_last()
    {
        using var client = Newsletter.ClientFrom(factory, "198.51.100.61");
        await SubscribeAsync(client, "purge.again@example.org");
        factory.Time.Advance(TimeSpan.FromDays(10));
        await SubscribeAsync(client, "purge.again@example.org");

        factory.Time.Advance(TimeSpan.FromDays(20));
        await TickAsync();
        Assert.NotNull(await SubscriptionAsync("purge.again@example.org"));

        factory.Time.Advance(TimeSpan.FromDays(10));
        await TickAsync();
        Assert.Null(await SubscriptionAsync("purge.again@example.org"));
    }

    [Fact]
    public async Task Given_an_unsubscribed_address_When_29_days_pass_Then_a_tick_purges_it_and_its_old_link_names_nothing()
    {
        using var client = Newsletter.ClientFrom(factory, "198.51.100.62");
        var email = await SubscribeAsync(client, "purge.left@example.org");
        using var confirmed = await Newsletter.ConfirmAsync(client, Newsletter.ConfirmTokenOf(email));
        using var left = await Newsletter.UnsubscribeAsync(client, Newsletter.UnsubscribeTokenOf(email));
        var id = (await SubscriptionAsync("purge.left@example.org"))!.Id;

        factory.Time.Advance(TimeSpan.FromDays(29) - TimeSpan.FromSeconds(1));
        await TickAsync();
        Assert.NotNull(await SubscriptionAsync("purge.left@example.org"));

        factory.Time.Advance(TimeSpan.FromSeconds(1));
        await TickAsync();

        Assert.Null(await SubscriptionAsync("purge.left@example.org"));
        Assert.Equal((0, 0), await LinksOfAsync(id));
        using var again = Newsletter.ClientFrom(factory, "198.51.100.63");
        using var response = await Newsletter.UnsubscribeAsync(again, Newsletter.UnsubscribeTokenOf(email));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(JsonValueKind.Null, (await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken)).GetProperty("email").ValueKind);
    }

    [Fact]
    public async Task Given_a_subscribed_address_When_a_year_passes_Then_no_tick_purges_it()
    {
        using var client = Newsletter.ClientFrom(factory, "198.51.100.64");
        var email = await SubscribeAsync(client, "purge.stays@example.org");
        using var confirmed = await Newsletter.ConfirmAsync(client, Newsletter.ConfirmTokenOf(email));
        Assert.Equal(HttpStatusCode.OK, confirmed.StatusCode);

        factory.Time.Advance(TimeSpan.FromDays(365));
        await TickAsync();

        Assert.Equal(SubscriptionStatus.Subscribed, (await SubscriptionAsync("purge.stays@example.org"))!.Status);
    }

    /// <summary>One tick of the API's scheduler, on the host's services and clock.</summary>
    private async Task<PublishingTick> TickAsync()
    {
        using var clock = new PublishingClock(factory.Services.GetRequiredService<IServiceScopeFactory>(), factory.Time, NullLogger<PublishingClock>.Instance, "newsletter-purge-tests");
        return await clock.TickAsync(TestContext.Current.CancellationToken);
    }

    private async Task<ChristianFitness.Application.Email.EmailMessage> SubscribeAsync(HttpClient client, string address)
    {
        var before = factory.Emails.Sent().Count;
        using var response = await Newsletter.SubscribeAsync(client, address);
        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        return Assert.Single(Newsletter.SentTo(factory, address, before));
    }

    private async Task<NewsletterSubscription?> SubscriptionAsync(string address)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await db.NewsletterSubscriptions.AsNoTracking().SingleOrDefaultAsync(s => s.Email == address, TestContext.Current.CancellationToken);
    }

    /// <summary>How many confirmation links and Unsubscribe tokens the store keeps for <paramref name="id"/>.</summary>
    private async Task<(int Confirmations, int Tokens)> LinksOfAsync(Guid id)
    {
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return (
            await db.SubscriptionConfirmations.CountAsync(c => c.SubscriptionId == id, TestContext.Current.CancellationToken),
            await db.NewsletterUnsubscribeTokens.CountAsync(t => t.SubscriptionId == id, TestContext.Current.CancellationToken));
    }
}
