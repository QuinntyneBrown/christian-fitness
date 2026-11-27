using System.Diagnostics;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Tests.Admin;
using ChristianFitness.Api.Tests.Events;
using ChristianFitness.Api.Tests.Preferences;
using ChristianFitness.Api.Tests.Telemetry;
using ChristianFitness.Domain.Directory;
using ChristianFitness.Domain.Events;
using ChristianFitness.Domain.Members;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Time.Testing;
using OpenTelemetry.Logs;
using OpenTelemetry.Trace;

namespace ChristianFitness.Api.Tests.Account;

/// <summary>The API with a clock the tests move, archives in memory and every span and log kept (journey 36).</summary>
public sealed class DeleteAccountFactory : ApiFactory
{
    /// <summary>30 days on is May 10, 2026, the date the mocks name.</summary>
    public static readonly DateTimeOffset Now = new(2026, 4, 10, 12, 45, 0, TimeSpan.Zero);

    public FakeTimeProvider Time { get; } = new(Now);

    public ExportedCollection<Activity> Spans { get; } = new();

    public ExportedCollection<LogRecord> Logs { get; } = new();

    protected override void ConfigureServices(IServiceCollection services)
    {
        services.RemoveAll<TimeProvider>();
        services.AddSingleton<TimeProvider>(Time);
        services.ConfigureOpenTelemetryTracerProvider(tracing => tracing.AddInMemoryExporter(Spans));
        services.ConfigureOpenTelemetryLoggerProvider(logging => logging.AddInMemoryExporter(Logs));
    }
}

/// <summary>Requests and records the deletion tests share.</summary>
internal static class Deletion
{
    public const string Path = "/api/account/deletion";

    public const string RequestedSubject = "Your Christian Fitness account is set to be deleted";

    public static Task<HttpResponseMessage> RequestAsync(HttpClient client, string? cookie, string? confirm = "delete") =>
        AdminEvents.SendAsync(client, HttpMethod.Post, Path, cookie, new { confirm });

    public static async Task<string?> CodeOfAsync(HttpResponseMessage response) =>
        (await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken)).GetProperty("code").GetString();

    public static async Task<Member> MemberAsync(ApiFactory factory, Guid id)
    {
        using var scope = factory.Services.CreateScope();
        return await scope.ServiceProvider.GetRequiredService<AppDbContext>().Members.AsNoTracking()
            .SingleAsync(m => m.Id == id, TestContext.Current.CancellationToken);
    }

    public static async Task<JsonElement> GetJsonAsync(HttpClient client, string path, string cookie)
    {
        using var response = await Browser.SendAsync(client, HttpMethod.Get, path, cookie);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
    }

    /// <summary>Signs in again with the join's password and answers the second session's cookie.</summary>
    public static async Task<string> SecondSessionAsync(HttpClient client, string email)
    {
        using var response = await Browser.SignInAsync(client, email, Staff.Password);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return Browser.SessionCookie(response);
    }
}

/// <summary>
/// L2-066 AC6, AC7 (from deletion), AC9, AC10 and AC11 (journey 36; ADR 0078, ADR 0118): "Delete my
/// account" with the word "delete" signs the member out everywhere at once, hides their profile,
/// gives back their places at events and series not started, takes them out of every group chat,
/// names their sent messages "A former member", deletes their archives, emails them the date of
/// erasure and audits the request with the member as actor. Anything but the word, a staff account
/// and a sixth attempt in an hour change nothing.
/// </summary>
public sealed class DeleteAccountTests(DeleteAccountFactory factory) : IClassFixture<DeleteAccountFactory>
{
    [Fact]
    public async Task Given_a_member_When_they_delete_with_the_word_Then_they_are_signed_out_hidden_their_places_go_back_and_their_messages_are_from_a_former_member()
    {
        using var client = Browser.CreateClient(factory);
        var (cookie, grace) = await Prefs.JoinAsync(factory, client, "grace.delete.request@example.org");
        var second = await Deletion.SecondSessionAsync(client, "grace.delete.request@example.org");
        var (tylerCookie, tyler) = await Prefs.JoinAsync(factory, client, "tyler.delete.request@example.org");
        var seeded = await SeedAsync(grace, tyler);
        var now = factory.Time.GetUtcNow();

        using var response = await Deletion.RequestAsync(client, cookie);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(now, (await Deletion.MemberAsync(factory, grace)).DeletionRequestedAt);

        // Signed out everywhere at once: neither session answers.
        foreach (var session in new[] { cookie, second })
        {
            using var check = await Browser.SendAsync(client, HttpMethod.Get, "/api/session", session);
            Assert.Equal(HttpStatusCode.Unauthorized, check.StatusCode);
        }

        // The place at the run to come and the series went back; the past event's place stays in history.
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var places = await db.Registrations.AsNoTracking().Where(r => r.MemberId == grace).Select(r => r.EventId).ToListAsync(TestContext.Current.CancellationToken);
            Assert.Equal([seeded.Past], places);
            Assert.False(await db.SeriesEnrolments.AnyAsync(x => x.MemberId == grace, TestContext.Current.CancellationToken));
            Assert.False(await db.DataExportRequests.AnyAsync(r => r.MemberId == grace, TestContext.Current.CancellationToken));
            var audit = Assert.Single(await db.AuditEntries.AsNoTracking().Where(a => a.Action == "account.deletion_requested" && a.ActorMemberId == grace).ToListAsync(TestContext.Current.CancellationToken));
            Assert.Equal(("Member", grace, now), (audit.RecordType, audit.RecordId, audit.OccurredAt));
        }

        Assert.Null(factory.Archives.Of(seeded.ArchiveKey));

        // Her profile stops showing to anyone, and her name to the run's attendees.
        using (var profile = await Browser.SendAsync(client, HttpMethod.Get, $"/api/members/{grace}/profile", tylerCookie))
        {
            Assert.Equal(HttpStatusCode.NotFound, profile.StatusCode);
        }

        var run = await Deletion.GetJsonAsync(client, $"/api/events/{seeded.Past}", tylerCookie);
        Assert.Equal(["Tyler Reed"], run.GetProperty("attendees").EnumerateArray().Select(a => a.GetString()));

        // Her sent messages are from "A former member"; Tyler's own are untouched.
        var group = await Deletion.GetJsonAsync(client, $"/api/events/{seeded.Past}/chat/messages", tylerCookie);
        Assert.Equal(
            [("A former member", "See you at the start line!"), ("Tyler Reed", "Tyler's group message")],
            group.GetProperty("messages").EnumerateArray().Select(m => (m.GetProperty("author").GetString(), m.GetProperty("text").GetString())));
        var direct = await Deletion.GetJsonAsync(client, $"/api/messages/{grace}/messages", tylerCookie);
        Assert.Equal(
            [("A former member", "Want to run together on Saturday?"), ("Tyler Reed", "Yes! 7 AM?")],
            direct.GetProperty("messages").EnumerateArray().Select(m => (m.GetProperty("author").GetString(), m.GetProperty("text").GetString())));
        var rows = (await Deletion.GetJsonAsync(client, "/api/conversations", tylerCookie)).GetProperty("conversations").EnumerateArray().ToList();
        Assert.Equal("A former member", rows.Single(r => r.GetProperty("id").GetGuid() == grace).GetProperty("name").GetString());
        Assert.Equal("Tyler Reed", rows.Single(r => r.GetProperty("id").GetGuid() == seeded.Past).GetProperty("lastMessage").GetProperty("author").GetString());

        var email = Assert.Single(factory.Emails.Sent(), e => e.To == "grace.delete.request@example.org" && e.Subject == Deletion.RequestedSubject);
        Assert.Equal(
            $"""
            Hi Grace,

            You asked us to delete your account. Your profile is hidden from everyone now, and you're signed out everywhere.

            On May 10, 2026 we'll erase your profile, preferences, follows, registrations, suggestions, feedback and the text of your messages. Places you held at events have gone back to other members, and they aren't restored.

            Changed your mind? Sign in before May 10, 2026 and choose Restore my account.

            Restore my account: {ApiFactory.MemberAppBaseUrl}/sign-in

            Christian Fitness

            If you didn't ask for this, restore your account and change your password, or write to privacy@christian.fitness.
            """,
            email.Text);
    }

    [Fact]
    public async Task Given_a_deleting_member_When_they_write_in_a_group_chat_or_to_a_member_Then_they_are_refused()
    {
        using var client = Browser.CreateClient(factory);
        var (cookie, grace) = await Prefs.JoinAsync(factory, client, "grace.delete.silent@example.org");
        var (tylerCookie, tyler) = await Prefs.JoinAsync(factory, client, "tyler.delete.silent@example.org");
        var seeded = await SeedAsync(grace, tyler);
        using var deleted = await Deletion.RequestAsync(client, cookie);
        Assert.Equal(HttpStatusCode.NoContent, deleted.StatusCode);

        // A connection opened before cannot reach a chat or a member: she is in none and unavailable.
        using var scope = factory.Services.CreateScope();
        var sender = scope.ServiceProvider.GetRequiredService<MediatR.ISender>();
        var group = await sender.Send(new Application.Chat.SendChatMessageCommand(grace, seeded.Past, "Still here?"), TestContext.Current.CancellationToken);
        var direct = await sender.Send(new Application.Chat.SendDirectMessageCommand(grace, tyler, "Still here?"), TestContext.Current.CancellationToken);
        var toHer = await sender.Send(new Application.Chat.SendDirectMessageCommand(tyler, grace, "Are you there?"), TestContext.Current.CancellationToken);
        Assert.Equal(("not_a_participant", "recipient_unavailable", "recipient_unavailable"), (group.Code, direct.Code, toHer.Code));
    }

    [Theory]
    [InlineData("delet")]
    [InlineData("")]
    [InlineData(null)]
    [InlineData("delete my account")]
    public async Task Given_the_word_missing_or_mistyped_When_the_member_confirms_Then_nothing_is_deleted(string? confirm)
    {
        using var client = Browser.CreateClient(factory);
        var email = $"grace.delete.invalid.{Guid.NewGuid():N}@example.org";
        var (cookie, grace) = await Prefs.JoinAsync(factory, client, email);

        using var response = await Deletion.RequestAsync(client, cookie, confirm);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("validation_failed", await Deletion.CodeOfAsync(response));
        Assert.Null((await Deletion.MemberAsync(factory, grace)).DeletionRequestedAt);
        using var session = await Browser.SendAsync(client, HttpMethod.Get, "/api/session", cookie);
        Assert.Equal(HttpStatusCode.OK, session.StatusCode);
        Assert.DoesNotContain(factory.Emails.Sent(), e => e.To == email);
    }

    [Fact]
    public async Task Given_a_staff_account_When_its_holder_deletes_it_Then_it_is_refused_staff_account_and_nothing_changes()
    {
        using var client = Browser.CreateClient(factory);
        var id = Guid.Parse(await Staff.CreateAsync(factory, client, "staff.delete@example.org", StaffRoleName.Moderator));
        var cookie = await Deletion.SecondSessionAsync(client, "staff.delete@example.org");

        using var response = await Deletion.RequestAsync(client, cookie);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal("staff_account", await Deletion.CodeOfAsync(response));
        Assert.Null((await Deletion.MemberAsync(factory, id)).DeletionRequestedAt);
        using var session = await Browser.SendAsync(client, HttpMethod.Get, "/api/session", cookie);
        Assert.Equal(HttpStatusCode.OK, session.StatusCode);
    }

    [Fact]
    public async Task Given_no_session_When_deletion_is_requested_Then_it_is_refused()
    {
        using var client = Browser.CreateClient(factory);

        using var response = await Deletion.RequestAsync(client, cookie: null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Given_a_deletion_When_it_is_traced_and_logged_Then_no_span_or_log_carries_the_member()
    {
        using var client = Browser.CreateClient(factory);
        var (cookie, grace) = await Prefs.JoinAsync(factory, client, "grace.delete.quiet@example.org");

        using var response = await Deletion.RequestAsync(client, cookie);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        AssertNothingRecorded(factory, "grace.delete.quiet", grace.ToString(), "Grace Thompson");
    }

    internal static void AssertNothingRecorded(DeleteAccountFactory factory, params string[] held)
    {
        var recorded = factory.Spans.Snapshot()
            .SelectMany(s => s.TagObjects.Select(t => $"{t.Value}").Append(s.DisplayName))
            .Concat(factory.Logs.Snapshot().Select(log => string.Join(" | ", [log.CategoryName, log.FormattedMessage, log.Body, .. (log.Attributes ?? []).Select(a => $"{a.Key}={a.Value}")])))
            .ToArray();
        foreach (var value in held)
        {
            Assert.DoesNotContain(recorded, r => r.Contains(value, StringComparison.OrdinalIgnoreCase));
        }
    }

    internal sealed record Seeded(Guid Upcoming, Guid Past, Guid Series, string ArchiveKey);

    /// <summary>
    /// Gives Grace a place at a run to come and at one that has started, a series, a group message
    /// and a direct message to Tyler, who writes back to both, and a ready data archive. Tyler takes
    /// his own name and a place at both runs.
    /// </summary>
    internal async Task<Seeded> SeedAsync(Guid grace, Guid tyler)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var now = factory.Time.GetUtcNow();
        var him = await db.Members.SingleAsync(m => m.Id == tyler, TestContext.Current.CancellationToken);
        him.EditProfile("Tyler Reed", "Etobicoke", null, null, [], []);
        var upcoming = Event.CreateDraft("Sunrise Waterfront 5K", EventCategory.Run, now + TimeSpan.FromDays(3), "Martin Goodman Trail", "Waterfront, Toronto", 0, 50, "Come run with us.", now - TimeSpan.FromDays(10));
        upcoming.Publish(now - TimeSpan.FromDays(10));
        var past = Event.CreateDraft("Hill Repeats", EventCategory.Run, now - TimeSpan.FromDays(2), "Riverdale Park", "East End, Toronto", 0, 50, "Up and down.", now - TimeSpan.FromDays(10));
        past.Publish(now - TimeSpan.FromDays(10));
        db.Events.AddRange(upcoming, past);
        var series = EventSeries.Create("Couch to 5K Run Club", EventCategory.Run, "Eight weeks.", null, DirectoryListing.TeamListingId, 0, null, 20, "High Park", "West End", now);
        db.EventSeries.Add(series);
        var start = now - TimeSpan.FromDays(9);
        foreach (var e in new[] { upcoming, past })
        {
            db.Registrations.Add(Registration.Of(e.Id, grace, 0, start));
            db.Registrations.Add(Registration.Of(e.Id, tyler, 0, start));
        }

        db.SeriesEnrolments.Add(SeriesEnrolment.Of(series.Id, grace, 0, start));
        db.ChatMessages.Add(ChatMessage.Of(ChatScope.Of(past), grace, "See you at the start line!", start + TimeSpan.FromMinutes(1)));
        db.ChatMessages.Add(ChatMessage.Of(ChatScope.Of(past), tyler, "Tyler's group message", start + TimeSpan.FromMinutes(2)));
        db.DirectMessages.Add(DirectMessage.Of(grace, tyler, "Want to run together on Saturday?", start + TimeSpan.FromMinutes(3)));
        db.DirectMessages.Add(DirectMessage.Of(tyler, grace, "Yes! 7 AM?", start + TimeSpan.FromMinutes(4)));
        var key = $"{Guid.NewGuid():N}.zip";
        await factory.Archives.SaveAsync(key, new byte[] { 1, 2, 3 }, TestContext.Current.CancellationToken);
        var export = DataExportRequest.Ask(grace, start);
        export.Ready(key, now - TimeSpan.FromDays(1));
        db.DataExportRequests.Add(export);
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        return new Seeded(upcoming.Id, past.Id, series.Id, key);
    }
}

/// <summary>
/// L2-066 AC11: five deletion attempts by a member in a rolling hour, invalid and refused ones
/// included, leave the sixth refused 429 <c>too_many_attempts</c> until the first is an hour old.
/// Its own class: it moves the clock by an hour.
/// </summary>
public sealed class DeleteAccountLimitTests(DeleteAccountFactory factory) : IClassFixture<DeleteAccountFactory>
{
    [Fact]
    public async Task Given_five_attempts_in_an_hour_When_a_sixth_is_made_Then_it_is_refused_too_many_attempts_until_the_first_is_an_hour_old()
    {
        using var client = Browser.CreateClient(factory);
        var (cookie, grace) = await Prefs.JoinAsync(factory, client, "grace.delete.limit@example.org");
        for (var i = 0; i < 5; i++)
        {
            using var invalid = await Deletion.RequestAsync(client, cookie, "nope");
            Assert.Equal(HttpStatusCode.BadRequest, invalid.StatusCode);
            factory.Time.Advance(TimeSpan.FromMinutes(1));
        }

        using var sixth = await Deletion.RequestAsync(client, cookie);

        Assert.Equal(HttpStatusCode.TooManyRequests, sixth.StatusCode);
        Assert.Equal("too_many_attempts", await Deletion.CodeOfAsync(sixth));
        Assert.Null((await Deletion.MemberAsync(factory, grace)).DeletionRequestedAt);

        // The first attempt was 5 minutes ago; an hour after it, one more is allowed.
        factory.Time.Advance(TimeSpan.FromMinutes(55) - TimeSpan.FromSeconds(1));
        using (var still = await Deletion.RequestAsync(client, cookie))
        {
            Assert.Equal(HttpStatusCode.TooManyRequests, still.StatusCode);
        }

        factory.Time.Advance(TimeSpan.FromSeconds(1));
        using var allowed = await Deletion.RequestAsync(client, cookie);
        Assert.Equal(HttpStatusCode.NoContent, allowed.StatusCode);
    }
}
