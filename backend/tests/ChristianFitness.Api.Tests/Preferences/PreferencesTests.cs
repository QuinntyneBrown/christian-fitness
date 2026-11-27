using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Tests.Account;
using ChristianFitness.Api.Tests.Events;
using ChristianFitness.Api.Tests.Newsletter;
using ChristianFitness.Api.Tests.Profiles;
using ChristianFitness.Application.Notifications;
using ChristianFitness.Domain.Members;
using ChristianFitness.Domain.Newsletter;
using ChristianFitness.Domain.Notifications;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Preferences;

/// <summary>Requests and store access the preferences tests share.</summary>
internal static class Prefs
{
    public const string Path = "/api/preferences";

    /// <summary>Joins <paramref name="email"/> and answers the session cookie and the member's id.</summary>
    public static async Task<(string Cookie, Guid Id)> JoinAsync(ApiFactory factory, HttpClient client, string email)
    {
        var cookie = await OwnProfileTests.JoinedAsync(client, JoinTests.Details(email));
        using var scope = factory.Services.CreateScope();
        var normalized = Member.NormalizeEmail(email);
        var id = await scope.ServiceProvider.GetRequiredService<AppDbContext>().Members
            .Where(m => m.NormalizedEmail == normalized).Select(m => m.Id).SingleAsync(TestContext.Current.CancellationToken);
        return (cookie, id);
    }

    public static async Task<JsonElement> GetAsync(HttpClient client, string cookie)
    {
        using var response = await Browser.SendAsync(client, HttpMethod.Get, Path, cookie);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
    }

    public static Task<HttpResponseMessage> SaveAsync(HttpClient client, string? cookie, object body) =>
        AdminEvents.SendAsync(client, HttpMethod.Put, Path, cookie, body);

    /// <summary>The body the page sends: every email and notification switch.</summary>
    public static Dictionary<string, object> Body(
        bool weekly = false, bool eventAlerts = false, bool trainingPlan = false, bool devotion = false,
        bool eventReminders = true, bool messages = true, bool followedListingDates = true, bool eventChanges = true) =>
        new(StringComparer.Ordinal)
        {
            ["email"] = new { weekly, eventAlerts, trainingPlan, devotion },
            ["notifications"] = new { eventReminders, messages, followedListingDates, eventChanges },
        };

    public static async Task<NewsletterSubscription?> SubscriptionAsync(ApiFactory factory, string email)
    {
        using var scope = factory.Services.CreateScope();
        return await scope.ServiceProvider.GetRequiredService<AppDbContext>().NewsletterSubscriptions.AsNoTracking()
            .SingleOrDefaultAsync(s => s.Email == email, TestContext.Current.CancellationToken);
    }
}

/// <summary>
/// L2-064 AC2 to AC4, AC6 and AC8 to AC10 (journey 33): a member reads their email and notification
/// switches (every email off and every notification on for a new member); Save keeps every changed
/// setting together; an email switch saved on subscribes the account's own address with no
/// confirmation email, its consent recorded; all off unsubscribes it; an unsubscribe from an email
/// shows as switches off; a notification switch saved off stops notifications of that kind.
/// </summary>
public sealed class PreferencesTests(RegisterForEventFactory factory) : IClassFixture<RegisterForEventFactory>
{
    [Fact]
    public async Task Given_a_new_member_When_they_open_preferences_Then_every_email_is_off_and_every_notification_is_on()
    {
        using var client = Browser.CreateClient(factory);
        var (cookie, _) = await Prefs.JoinAsync(factory, client, "grace.prefs.new@example.org");

        var preferences = await Prefs.GetAsync(client, cookie);

        Assert.Equal(["name", "email", "notifications"], preferences.EnumerateObject().Select(p => p.Name).Take(3));
        Assert.Equal("Grace Thompson", preferences.GetProperty("name").GetString());
        Assert.Equal("""{"weekly":false,"eventAlerts":false,"trainingPlan":false,"devotion":false}""", preferences.GetProperty("email").GetRawText());
        Assert.Equal("""{"eventReminders":true,"messages":true,"followedListingDates":true,"eventChanges":true}""", preferences.GetProperty("notifications").GetRawText());
        using var anonymous = await Browser.SendAsync(client, HttpMethod.Get, Prefs.Path, cookie: null);
        Assert.Equal(HttpStatusCode.Unauthorized, anonymous.StatusCode);
    }

    [Fact]
    public async Task Given_switches_changed_When_they_are_saved_Then_all_are_kept_and_the_address_is_subscribed_without_a_confirmation_email()
    {
        using var client = Browser.CreateClient(factory);
        var (cookie, _) = await Prefs.JoinAsync(factory, client, "grace.prefs.save@example.org");
        var emails = factory.Emails.Sent().Count;
        var now = factory.Time.GetUtcNow();

        using var response = await Prefs.SaveAsync(client, cookie, Prefs.Body(weekly: true, devotion: true, messages: false, eventChanges: false));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var saved = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        var read = await Prefs.GetAsync(client, cookie);
        Assert.Equal(saved.GetRawText(), read.GetRawText());
        Assert.Equal("""{"weekly":true,"eventAlerts":false,"trainingPlan":false,"devotion":true}""", read.GetProperty("email").GetRawText());
        Assert.Equal("""{"eventReminders":true,"messages":false,"followedListingDates":true,"eventChanges":false}""", read.GetProperty("notifications").GetRawText());
        var subscription = Assert.IsType<NewsletterSubscription>(await Prefs.SubscriptionAsync(factory, "grace.prefs.save@example.org"));
        Assert.Equal((SubscriptionStatus.Subscribed, now, "Preferences, signed in"), (subscription.Status, subscription.ConsentedAt, subscription.ConsentSource));
        // The address is the account's own: no confirmation email is sent (AC8).
        Assert.Equal(emails, factory.Emails.Sent().Count);

        // An extra alone keeps the address subscribed with the Weekly off: the issue is not sent to it.
        using var extraOnly = await Prefs.SaveAsync(client, cookie, Prefs.Body(devotion: true));
        Assert.Equal(HttpStatusCode.OK, extraOnly.StatusCode);
        var kept = Assert.IsType<NewsletterSubscription>(await Prefs.SubscriptionAsync(factory, "grace.prefs.save@example.org"));
        Assert.Equal((SubscriptionStatus.Subscribed, false, true), (kept.Status, kept.Weekly, kept.Devotion));

        // Every email off unsubscribes the address, as an Unsubscribe link does (AC8).
        using var allOff = await Prefs.SaveAsync(client, cookie, Prefs.Body());
        Assert.Equal(HttpStatusCode.OK, allOff.StatusCode);
        var left = Assert.IsType<NewsletterSubscription>(await Prefs.SubscriptionAsync(factory, "grace.prefs.save@example.org"));
        Assert.Equal((SubscriptionStatus.Unsubscribed, factory.Time.GetUtcNow()), (left.Status, left.UnsubscribedAt));
    }

    [Fact]
    public async Task Given_a_member_who_unsubscribed_from_an_email_When_they_open_preferences_Then_the_email_switches_are_off()
    {
        using var client = Browser.CreateClient(factory);
        var (cookie, _) = await Prefs.JoinAsync(factory, client, "grace.prefs.link@example.org");
        using var saved = await Prefs.SaveAsync(client, cookie, Prefs.Body(weekly: true, eventAlerts: true));
        Assert.Equal(HttpStatusCode.OK, saved.StatusCode);
        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var subscription = await db.NewsletterSubscriptions.SingleAsync(s => s.Email == "grace.prefs.link@example.org", TestContext.Current.CancellationToken);
            subscription.Unsubscribe(factory.Time.GetUtcNow());
            await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        }

        var preferences = await Prefs.GetAsync(client, cookie);

        Assert.Equal("""{"weekly":false,"eventAlerts":false,"trainingPlan":false,"devotion":false}""", preferences.GetProperty("email").GetRawText());
    }

    [Fact]
    public async Task Given_no_session_When_preferences_are_saved_Then_it_is_refused()
    {
        using var client = Browser.CreateClient(factory);

        using var response = await Prefs.SaveAsync(client, cookie: null, Prefs.Body(weekly: true));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // L2-064 AC10: each notification kind follows its switch; the others still arrive.
    [Theory]
    [InlineData("eventReminders", NotificationKind.EventReminder, NotificationKind.EventCancelled)]
    [InlineData("followedListingDates", NotificationKind.FollowedHostDates, NotificationKind.EventReminder)]
    [InlineData("eventChanges", NotificationKind.EventCancelled, NotificationKind.EventReminder)]
    [InlineData("eventChanges", NotificationKind.SeriesDateCancelled, NotificationKind.FollowedHostDates)]
    public async Task Given_a_notification_switch_saved_off_When_one_of_its_kind_is_sent_Then_it_is_not_shown_and_another_kind_still_is(
        string switchName, NotificationKind stopped, NotificationKind stillSent)
    {
        using var client = Browser.CreateClient(factory);
        var (cookie, id) = await Prefs.JoinAsync(factory, client, $"grace.prefs.{switchName}.{stopped}@example.org");
        using var saved = await Prefs.SaveAsync(client, cookie, Prefs.Body(
            eventReminders: switchName != "eventReminders",
            followedListingDates: switchName != "followedListingDates",
            eventChanges: switchName != "eventChanges"));
        Assert.Equal(HttpStatusCode.OK, saved.StatusCode);

        var refused = await NotifyAsync(id, stopped, "Stopped");
        var sent = await NotifyAsync(id, stillSent, "Still sent");

        Assert.Null(refused);
        Assert.NotNull(sent);
        using var response = await Browser.SendAsync(client, HttpMethod.Get, "/api/notifications", cookie);
        var titles = (await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken))
            .GetProperty("notifications").EnumerateArray().Select(n => n.GetProperty("title").GetString());
        Assert.Equal(["Still sent"], titles);
    }

    private async Task<NotificationDto?> NotifyAsync(Guid memberId, NotificationKind kind, string title)
    {
        using var scope = factory.Services.CreateScope();
        return await scope.ServiceProvider.GetRequiredService<INotifier>()
            .NotifyAsync(new NotificationRequest(memberId, kind, title, "About it", "/events/1"), TestContext.Current.CancellationToken);
    }
}
