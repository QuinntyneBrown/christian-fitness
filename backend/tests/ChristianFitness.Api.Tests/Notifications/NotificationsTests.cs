using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Channels;
using ChristianFitness.Api.Tests.Account;
using ChristianFitness.Api.Tests.Events;
using ChristianFitness.Api.Tests.Profiles;
using ChristianFitness.Application.Notifications;
using ChristianFitness.Domain.Members;
using ChristianFitness.Domain.Notifications;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.AspNetCore.Http.Connections;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Notifications;

/// <summary>A notification as the hub pushes it and the list answers it (ADR 0083).</summary>
public sealed record NotificationBody(Guid Id, string Kind, string Title, string Text, string Href, DateTimeOffset CreatedAt, bool Read);

/// <summary>
/// The in-app inbox of ADR 0068 and ADR 0083 (journey 14): a notification is created only through
/// <see cref="INotifier"/> (the test path until journey 15 sends one), pushed live to the member's own
/// connections as <c>NotificationReceived</c>, listed newest first by <c>GET /api/notifications</c> (the
/// newest 50 of the last 30 days, with the unread count of those 30 days) and marked read by
/// <c>POST /api/notifications/read</c>. A member sees and marks only their own; a visitor is refused 401.
/// Hub clients are real SignalR clients against the in-memory server; nothing sleeps.
/// </summary>
public sealed class NotificationsTests(RegisterForEventFactory factory) : IClassFixture<RegisterForEventFactory>
{
    private static readonly TimeSpan Wait = TimeSpan.FromSeconds(10);
    private static readonly JsonSerializerOptions Web = new(JsonSerializerDefaults.Web);

    private sealed record Person(string Cookie, Guid Id);

    private async Task<Person> MemberAsync(string email)
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await OwnProfileTests.JoinedAsync(client, JoinTests.Details(email));
        using var scope = factory.Services.CreateScope();
        var normalized = Member.NormalizeEmail(email);
        var id = await scope.ServiceProvider.GetRequiredService<AppDbContext>().Members
            .Where(m => m.NormalizedEmail == normalized).Select(m => m.Id)
            .SingleAsync(TestContext.Current.CancellationToken);
        return new Person(cookie, id);
    }

    private async Task NotifyAsync(Guid memberId, string title, NotificationKind kind = NotificationKind.EventReminder, string href = "/events/1")
    {
        using var scope = factory.Services.CreateScope();
        var notifier = scope.ServiceProvider.GetRequiredService<INotifier>();
        await notifier.NotifyAsync(new NotificationRequest(memberId, kind, title, $"About {title}", href), TestContext.Current.CancellationToken);
        factory.Time.Advance(TimeSpan.FromSeconds(1));
    }

    private async Task<(NotificationBody[] Notifications, int Unread)> ListAsync(Person who)
    {
        using var client = Browser.CreateClient(factory);
        using var response = await Browser.SendAsync(client, HttpMethod.Get, "/api/notifications", who.Cookie);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        var notifications = body.GetProperty("notifications").Deserialize<NotificationBody[]>(Web)!;
        return (notifications, body.GetProperty("unread").GetInt32());
    }

    private async Task<HubConnection> ConnectAsync(Person who, Channel<NotificationBody> inbox)
    {
        var hub = new HubConnectionBuilder()
            .WithUrl(new Uri("https://localhost/api/chat"), options =>
            {
                options.Transports = HttpTransportType.LongPolling;
                options.HttpMessageHandlerFactory = _ => factory.Server.CreateHandler();
                options.Headers["Cookie"] = who.Cookie;
            })
            .Build();
        hub.On<NotificationBody>("NotificationReceived", n => inbox.Writer.TryWrite(n));
        await hub.StartAsync(TestContext.Current.CancellationToken);
        return hub;
    }

    private static async Task<NotificationBody> NextAsync(Channel<NotificationBody> inbox, string what)
    {
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(TestContext.Current.CancellationToken);
        timeout.CancelAfter(Wait);
        try
        {
            return await inbox.Reader.ReadAsync(timeout.Token);
        }
        catch (OperationCanceledException)
        {
            throw new TimeoutException($"No notification arrived for {what} within {Wait.TotalSeconds} s.");
        }
    }

    [Fact]
    public async Task Given_notifications_When_listed_Then_newest_first_all_unread_and_only_the_callers_own()
    {
        var grace = await MemberAsync("grace.notes1@example.org");
        var hope = await MemberAsync("hope.notes1@example.org");
        var first = factory.Time.GetUtcNow();
        await NotifyAsync(grace.Id, "Tomorrow: Easter Sunrise 5K");
        await NotifyAsync(hope.Id, "Not for Grace");
        await NotifyAsync(grace.Id, "Cancelled: Mobility Morning", NotificationKind.EventCancelled, "/events/2");

        var (notifications, unread) = await ListAsync(grace);

        Assert.Equal(["Cancelled: Mobility Morning", "Tomorrow: Easter Sunrise 5K"], notifications.Select(n => n.Title));
        Assert.Equal(2, unread);
        var latest = notifications[0];
        Assert.Equal(("event-cancelled", "About Cancelled: Mobility Morning", "/events/2", false, first + TimeSpan.FromSeconds(2)),
            (latest.Kind, latest.Text, latest.Href, latest.Read, latest.CreatedAt));
        Assert.Equal("event-reminder", notifications[1].Kind);
    }

    [Fact]
    public async Task Given_a_connected_member_When_notified_Then_it_arrives_live_on_their_connection_only()
    {
        var grace = await MemberAsync("grace.notes2@example.org");
        var hope = await MemberAsync("hope.notes2@example.org");
        var graceInbox = Channel.CreateUnbounded<NotificationBody>();
        var hopeInbox = Channel.CreateUnbounded<NotificationBody>();
        await using var graceHub = await ConnectAsync(grace, graceInbox);
        await using var hopeHub = await ConnectAsync(hope, hopeInbox);

        await NotifyAsync(grace.Id, "Cancelled date: Couch to 5K", NotificationKind.SeriesDateCancelled, "/series/3");
        await NotifyAsync(hope.Id, "For Hope");

        var atGrace = await NextAsync(graceInbox, "Grace, the recipient");
        Assert.Equal(("Cancelled date: Couch to 5K", "series-date-cancelled", "/series/3", false), (atGrace.Title, atGrace.Kind, atGrace.Href, atGrace.Read));
        Assert.Equal("For Hope", (await NextAsync(hopeInbox, "Hope")).Title);
        Assert.False(graceInbox.Reader.TryRead(out var stray), $"Grace received: {stray?.Title}");
        var (listed, _) = await ListAsync(grace);
        Assert.Equal(atGrace.Id, listed.Single().Id);
    }

    [Fact]
    public async Task Given_unread_notifications_When_marked_read_Then_none_is_unread_and_another_members_stay_unread()
    {
        var grace = await MemberAsync("grace.notes3@example.org");
        var hope = await MemberAsync("hope.notes3@example.org");
        await NotifyAsync(grace.Id, "One");
        await NotifyAsync(grace.Id, "Two");
        await NotifyAsync(hope.Id, "Hope's");

        using var client = Browser.CreateClient(factory);
        using var response = await Browser.SendAsync(client, HttpMethod.Post, "/api/notifications/read", grace.Cookie);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        var (notifications, unread) = await ListAsync(grace);
        Assert.Equal(0, unread);
        Assert.Equal([true, true], notifications.Select(n => n.Read));
        Assert.Equal(1, (await ListAsync(hope)).Unread);
    }

    [Fact]
    public async Task Given_more_than_fifty_When_listed_Then_the_newest_fifty_show_and_every_unread_counts()
    {
        var grace = await MemberAsync("grace.notes4@example.org");
        for (var i = 1; i <= 52; i++)
        {
            await NotifyAsync(grace.Id, $"Note {i}");
        }

        var (notifications, unread) = await ListAsync(grace);

        Assert.Equal(50, notifications.Length);
        Assert.Equal(("Note 52", "Note 3"), (notifications[0].Title, notifications[^1].Title));
        Assert.Equal(52, unread);
    }

    [Fact]
    public async Task Given_a_notification_older_than_30_days_Then_it_is_neither_listed_nor_counted_and_the_next_one_drops_it()
    {
        var grace = await MemberAsync("grace.notes5@example.org");
        await NotifyAsync(grace.Id, "Old");
        factory.Time.Advance(TimeSpan.FromDays(30));
        // The session has long expired; Grace signs in again.
        using var client = Browser.CreateClient(factory);
        using var signedIn = await Browser.SignInAsync(client, "grace.notes5@example.org", JoinTests.Details("grace.notes5@example.org").Password);
        grace = grace with { Cookie = Browser.SessionCookie(signedIn) };

        var (expired, expiredUnread) = await ListAsync(grace);
        await NotifyAsync(grace.Id, "New");

        Assert.Empty(expired);
        Assert.Equal(0, expiredUnread);
        using var scope = factory.Services.CreateScope();
        var stored = await scope.ServiceProvider.GetRequiredService<AppDbContext>().Notifications
            .Where(n => n.MemberId == grace.Id).Select(n => n.Title)
            .ToListAsync(TestContext.Current.CancellationToken);
        Assert.Equal(["New"], stored);
    }

    public static TheoryData<string, string, string, string, bool> Requests() => new()
    {
        // why, title, text, href, known member
        { "a blank title", "   ", "Text", "/events/1", true },
        { "a title of 121", new string('t', 121), "Text", "/events/1", true },
        { "a text of 301", "Title", new string('x', 301), "/events/1", true },
        { "another site", "Title", "Text", "https://evil.example/", true },
        { "a protocol-relative path", "Title", "Text", "//evil.example/", true },
        { "an unknown member", "Title", "Text", "/events/1", false },
    };

    [Theory]
    [MemberData(nameof(Requests))]
    public async Task Given_a_malformed_request_When_notifying_Then_it_throws_and_stores_nothing(string why, string title, string text, string href, bool known)
    {
        var grace = await MemberAsync($"grace.notes6.{why.Replace(' ', '-')}@example.org");
        var memberId = known ? grace.Id : Guid.NewGuid();
        using var scope = factory.Services.CreateScope();
        var notifier = scope.ServiceProvider.GetRequiredService<INotifier>();

        await Assert.ThrowsAsync<ArgumentException>(() =>
            notifier.NotifyAsync(new NotificationRequest(memberId, NotificationKind.EventReminder, title, text, href), TestContext.Current.CancellationToken));

        Assert.Empty((await ListAsync(grace)).Notifications);
    }

    [Fact]
    public async Task Given_a_title_of_120_once_trimmed_When_notifying_Then_it_is_stored_trimmed()
    {
        var grace = await MemberAsync("grace.notes7@example.org");
        using var scope = factory.Services.CreateScope();
        var notifier = scope.ServiceProvider.GetRequiredService<INotifier>();

        await notifier.NotifyAsync(new NotificationRequest(grace.Id, NotificationKind.FollowedHostDates, "  " + new string('t', 120) + " ", "Text", "/listings/1"), TestContext.Current.CancellationToken);

        var stored = (await ListAsync(grace)).Notifications.Single();
        Assert.Equal((new string('t', 120), "followed-host-dates"), (stored.Title, stored.Kind));
    }

    [Fact]
    public async Task Given_a_visitor_When_listing_or_marking_Then_401()
    {
        using var client = Browser.CreateClient(factory);
        using var list = await Browser.SendAsync(client, HttpMethod.Get, "/api/notifications", cookie: null);
        using var read = await Browser.SendAsync(client, HttpMethod.Post, "/api/notifications/read", cookie: null);

        Assert.Equal((HttpStatusCode.Unauthorized, HttpStatusCode.Unauthorized), (list.StatusCode, read.StatusCode));
    }
}
