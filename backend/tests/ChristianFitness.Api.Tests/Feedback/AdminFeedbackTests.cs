using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Tests.Admin;
using ChristianFitness.Api.Tests.Events;
using ChristianFitness.Domain.Feedback;
using ChristianFitness.Domain.Members;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Feedback;

/// <summary>Requests and store access the inbox's tests share.</summary>
internal static class Inbox
{
    public const string Path = "/api/admin/feedback";

    public static async Task<string> SignInAsync(FeedbackFactory factory, HttpClient client, string email, StaffRoleName role = StaffRoleName.Admin)
    {
        await Staff.CreateAsync(factory, client, email, role);
        using var signedIn = await Staff.SignInWithGoogleAsync(factory, client, email);
        return Staff.Cookie(signedIn);
    }

    public static async Task<JsonElement> GetAsync(HttpClient client, string cookie, string path = "")
    {
        using var response = await AdminEvents.SendAsync(client, HttpMethod.Get, Path + path, cookie);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await JsonAsync(response);
    }

    public static Task<HttpResponseMessage> PostAsync(HttpClient client, string? cookie, Guid note, string action, object? body = null) =>
        AdminEvents.SendAsync(client, HttpMethod.Post, $"{Path}/{note}/{action}", cookie, body);

    public static async Task<JsonElement> JsonAsync(HttpResponseMessage response) =>
        await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken).ConfigureAwait(false);

    /// <summary>Joins <paramref name="email"/> as a member ("Grace Thompson") and answers their id.</summary>
    public static async Task<Guid> MemberAsync(FeedbackFactory factory, string email)
    {
        using var client = Browser.CreateClient(factory);
        return Guid.Parse(await Staff.CreateAsync(factory, client, email, role: null));
    }

    /// <summary>Puts a note from <paramref name="memberId"/> in the store, sent at <paramref name="sentAt"/>.</summary>
    public static async Task<FeedbackNote> NoteAsync(
        FeedbackFactory factory,
        Guid memberId,
        string text,
        DateTimeOffset sentAt,
        FeedbackKind kind = FeedbackKind.Idea,
        bool mayEmail = true,
        string? screenshotKey = null,
        Guid? storyId = null)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var note = FeedbackNote.Send(memberId, kind, text, "events/:id", storyId, "Easter Sunrise 5K", mayEmail, "macOS", "Chrome 126", screenshotKey, sentAt);
        db.FeedbackNotes.Add(note);
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        return note;
    }

    public static async Task<FeedbackNote> StoredAsync(FeedbackFactory factory, Guid id)
    {
        using var scope = factory.Services.CreateScope();
        return await scope.ServiceProvider.GetRequiredService<AppDbContext>().FeedbackNotes.AsNoTracking().SingleAsync(n => n.Id == id, TestContext.Current.CancellationToken);
    }
}

/// <summary>
/// L2-074 AC1 to AC3, AC8 and AC9 (journey 31, slices 1 and 2): staff of either role list every
/// note newest first with its kind, sender, time, the start of its text and status; a tab filters by
/// status and every tab is counted; the navigation's count is the New notes; a chosen note shows in
/// full with who sent it; a screenshot is served to a staff session only.
/// </summary>
public sealed class ListFeedbackTests(FeedbackFactory factory) : IClassFixture<FeedbackFactory>
{
    [Fact]
    public async Task Given_notes_of_each_status_When_staff_list_them_Then_they_show_newest_first_with_every_tab_counted()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await Inbox.SignInAsync(factory, client, "dana.inbox@example.org");
        var before = (await Inbox.GetAsync(client, cookie)).GetProperty("counts");
        var countsBefore = (await AdminEvents.SendAsync(client, HttpMethod.Get, "/api/admin/counts", cookie)).Content;
        var newBefore = (await countsBefore.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken)).GetProperty("newFeedback").GetInt32();
        var member = await Inbox.MemberAsync(factory, "grace.inbox@example.org");
        var start = factory.Time.GetUtcNow().AddHours(-5);
        var oldest = await Inbox.NoteAsync(factory, member, "List oldest " + new string('x', 200), start, FeedbackKind.Problem);
        var replied = await Inbox.NoteAsync(factory, member, "List replied", start.AddHours(1), FeedbackKind.Thanks);
        var resolved = await Inbox.NoteAsync(factory, member, "List resolved", start.AddHours(2), FeedbackKind.Correction);
        var newest = await Inbox.NoteAsync(factory, member, "List newest", start.AddHours(3));
        using var reply = await Inbox.PostAsync(client, cookie, replied.Id, "replies", new { text = "Thank you." });
        Assert.Equal(HttpStatusCode.Created, reply.StatusCode);
        using var resolve = await Inbox.PostAsync(client, cookie, resolved.Id, "resolve");
        Assert.Equal(HttpStatusCode.OK, resolve.StatusCode);

        var all = await Inbox.GetAsync(client, cookie);
        var onlyNew = await Inbox.GetAsync(client, cookie, "?status=new");

        Assert.Equal(["counts", "items"], all.EnumerateObject().Select(p => p.Name));
        var rows = all.GetProperty("items").EnumerateArray().Where(r => r.GetProperty("excerpt").GetString()!.StartsWith("List ", StringComparison.Ordinal)).ToArray();
        Assert.Equal(["id", "kind", "sender", "sentAt", "excerpt", "status"], rows[0].EnumerateObject().Select(p => p.Name));
        Assert.Equal(
            [
                (newest.Id, "idea", "Grace Thompson", "List newest", "new"),
                (resolved.Id, "correction", "Grace Thompson", "List resolved", "resolved"),
                (replied.Id, "thanks", "Grace Thompson", "List replied", "replied"),
                (oldest.Id, "problem", "Grace Thompson", ("List oldest " + new string('x', 200))[..120], "new"),
            ],
            rows.Select(r => (r.GetProperty("id").GetGuid(), r.GetProperty("kind").GetString()!, r.GetProperty("sender").GetString()!, r.GetProperty("excerpt").GetString()!, r.GetProperty("status").GetString()!)));
        var counts = all.GetProperty("counts");
        Assert.Equal(["all", "new", "replied", "resolved"], counts.EnumerateObject().Select(p => p.Name));
        Assert.Equal(
            (Of(before, "all") + 4, Of(before, "new") + 2, Of(before, "replied") + 1, Of(before, "resolved") + 1),
            (Of(counts, "all"), Of(counts, "new"), Of(counts, "replied"), Of(counts, "resolved")));
        Assert.All(onlyNew.GetProperty("items").EnumerateArray(), r => Assert.Equal("new", r.GetProperty("status").GetString()));
        Assert.Contains(onlyNew.GetProperty("items").EnumerateArray(), r => r.GetProperty("id").GetGuid() == newest.Id);
        using var navigation = await AdminEvents.SendAsync(client, HttpMethod.Get, "/api/admin/counts", cookie);
        Assert.Equal(newBefore + 2, (await Inbox.JsonAsync(navigation)).GetProperty("newFeedback").GetInt32());
    }

    [Fact]
    public async Task Given_a_note_with_a_screenshot_When_staff_open_it_Then_it_shows_in_full_and_the_screenshot_is_for_staff_only()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await Inbox.SignInAsync(factory, client, "joel.inbox@example.org", StaffRoleName.Moderator);
        var member = await Inbox.MemberAsync(factory, "grace.inbox.note@example.org");
        await factory.SuspendAsync("grace.inbox.note@example.org");
        var key = Guid.NewGuid().ToString("N") + ".png";
        byte[] png = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 1, 2, 3];
        await factory.Screenshots.SaveAsync(key, png, TestContext.Current.CancellationToken);
        var story = Guid.NewGuid();
        var sent = await Inbox.NoteAsync(factory, member, "The <b>calendar</b> shows the wrong day.", factory.Time.GetUtcNow().AddMinutes(-30), FeedbackKind.Correction, mayEmail: false, key, story);

        var note = await Inbox.GetAsync(client, cookie, $"/{sent.Id}");

        Assert.Equal(["id", "kind", "status", "sentAt", "text", "sender", "page", "storyId", "device", "browser", "hasScreenshot", "mayEmail", "replies"], note.EnumerateObject().Select(p => p.Name));
        Assert.Equal(
            ("correction", "new", "The <b>calendar</b> shows the wrong day.", story, "macOS", "Chrome 126", true, false),
            (note.GetProperty("kind").GetString(), note.GetProperty("status").GetString(), note.GetProperty("text").GetString(), note.GetProperty("storyId").GetGuid(),
             note.GetProperty("device").GetString(), note.GetProperty("browser").GetString(), note.GetProperty("hasScreenshot").GetBoolean(), note.GetProperty("mayEmail").GetBoolean()));
        Assert.Equal("""{"name":"Grace Thompson","email":"grace.inbox.note@example.org","suspended":true}""", note.GetProperty("sender").GetRawText());
        Assert.Equal("""{"routeTemplate":"events/:id","title":"Easter Sunrise 5K"}""", note.GetProperty("page").GetRawText());
        Assert.Equal(0, note.GetProperty("replies").GetArrayLength());

        using var image = await AdminEvents.SendAsync(client, HttpMethod.Get, $"{Inbox.Path}/{sent.Id}/screenshot", cookie);
        using var anonymous = await AdminEvents.SendAsync(client, HttpMethod.Get, $"{Inbox.Path}/{sent.Id}/screenshot", cookie: null);
        using var unknown = await AdminEvents.SendAsync(client, HttpMethod.Get, $"{Inbox.Path}/{Guid.NewGuid()}", cookie);

        Assert.Equal(HttpStatusCode.OK, image.StatusCode);
        Assert.Equal("image/png", image.Content.Headers.ContentType?.MediaType);
        Assert.Equal(png, await image.Content.ReadAsByteArrayAsync(TestContext.Current.CancellationToken));
        Assert.True(image.Headers.CacheControl is { NoStore: true });
        Assert.Equal(HttpStatusCode.Unauthorized, anonymous.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, unknown.StatusCode);
        Assert.Equal("not_found", (await Inbox.JsonAsync(unknown)).GetProperty("code").GetString());
    }

    private static int Of(JsonElement counts, string name) => counts.GetProperty(name).GetInt32();
}

/// <summary>
/// L2-074 AC5 to AC7 and AC11 (journey 31, slices 3 and 4): a reply reaches the member by email
/// when they allowed it, else as a direct message from Christian Fitness, is kept with the note and
/// makes it Replied; an empty reply is refused; Mark resolved and Reopen move the status; each
/// change is audited.
/// </summary>
public sealed class AnswerFeedbackTests(FeedbackFactory factory) : IClassFixture<FeedbackFactory>
{
    [Fact]
    public async Task Given_a_member_who_allowed_email_When_staff_reply_Then_it_is_emailed_kept_and_the_note_is_Replied()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await Inbox.SignInAsync(factory, client, "dana.reply@example.org");
        var member = await Inbox.MemberAsync(factory, "grace.reply@example.org");
        var sent = await Inbox.NoteAsync(factory, member, "Could events show the weather?", factory.Time.GetUtcNow().AddHours(-1));
        var emails = factory.Emails.Sent().Count;

        using var response = await Inbox.PostAsync(client, cookie, sent.Id, "replies", new { text = "  Good idea. It is on the list.  " });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var answer = await Inbox.JsonAsync(response);
        Assert.Equal(["status", "deliveredBy", "reply"], answer.EnumerateObject().Select(p => p.Name));
        Assert.Equal(("replied", "email"), (answer.GetProperty("status").GetString(), answer.GetProperty("deliveredBy").GetString()));
        var email = Assert.Single(factory.Emails.Sent().Skip(emails));
        Assert.Equal("grace.reply@example.org", email.To);
        Assert.Contains("Good idea. It is on the list.", email.Text, StringComparison.Ordinal);
        Assert.StartsWith("Hi Grace,", email.Text, StringComparison.Ordinal);
        var note = await Inbox.GetAsync(client, cookie, $"/{sent.Id}");
        Assert.Equal("replied", note.GetProperty("status").GetString());
        var kept = Assert.Single(note.GetProperty("replies").EnumerateArray());
        Assert.Equal(["text", "sentAt", "by"], kept.EnumerateObject().Select(p => p.Name));
        Assert.Equal(("Good idea. It is on the list.", factory.Time.GetUtcNow(), "Grace Thompson"), (kept.GetProperty("text").GetString(), kept.GetProperty("sentAt").GetDateTimeOffset(), kept.GetProperty("by").GetString()));
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var entry = Assert.Single(await db.AuditEntries.AsNoTracking().Where(e => e.RecordId == sent.Id).ToListAsync(TestContext.Current.CancellationToken));
        Assert.Equal(("feedback.replied", nameof(FeedbackNote)), (entry.Action, entry.RecordType));
    }

    [Fact]
    public async Task Given_a_member_who_did_not_allow_email_When_staff_reply_Then_it_arrives_as_a_message_from_Christian_Fitness()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await Inbox.SignInAsync(factory, client, "joel.reply@example.org", StaffRoleName.Moderator);
        var member = await Inbox.MemberAsync(factory, "grace.reply.dm@example.org");
        var sent = await Inbox.NoteAsync(factory, member, "The map pin is off.", factory.Time.GetUtcNow().AddHours(-1), FeedbackKind.Problem, mayEmail: false);
        var emails = factory.Emails.Sent().Count;

        using var response = await Inbox.PostAsync(client, cookie, sent.Id, "replies", new { text = "We moved the pin." });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal("message", (await Inbox.JsonAsync(response)).GetProperty("deliveredBy").GetString());
        Assert.Equal(emails, factory.Emails.Sent().Count);
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var message = Assert.Single(await db.DirectMessages.AsNoTracking().Where(m => m.RecipientId == member).ToListAsync(TestContext.Current.CancellationToken));
        Assert.Equal((SystemMembers.ChristianFitnessId, "Reply to your feedback:\nWe moved the pin."), (message.SenderId, message.Text));
        Assert.Equal(FeedbackStatus.Replied, (await Inbox.StoredAsync(factory, sent.Id)).Status);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task Given_an_empty_reply_When_it_is_sent_Then_nothing_is_sent_and_the_box_is_named(string text)
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await Inbox.SignInAsync(factory, client, $"dana.reply.empty{text.Length}@example.org");
        var member = await Inbox.MemberAsync(factory, $"grace.reply.empty{text.Length}@example.org");
        var sent = await Inbox.NoteAsync(factory, member, "Thanks for the run club.", factory.Time.GetUtcNow().AddHours(-1), FeedbackKind.Thanks);
        var emails = factory.Emails.Sent().Count;

        using var response = await Inbox.PostAsync(client, cookie, sent.Id, "replies", new { text });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await Inbox.JsonAsync(response);
        Assert.Equal(("validation_failed", "reply_required"), (problem.GetProperty("code").GetString(), problem.GetProperty("fieldCodes").GetProperty("text").GetString()));
        Assert.Equal(emails, factory.Emails.Sent().Count);
        Assert.Equal(FeedbackStatus.New, (await Inbox.StoredAsync(factory, sent.Id)).Status);
    }

    [Fact]
    public async Task Given_a_suspended_member_who_did_not_allow_email_When_staff_reply_Then_it_is_refused_and_nothing_is_kept()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await Inbox.SignInAsync(factory, client, "dana.reply.suspended@example.org");
        var member = await Inbox.MemberAsync(factory, "grace.reply.suspended@example.org");
        await factory.SuspendAsync("grace.reply.suspended@example.org");
        var sent = await Inbox.NoteAsync(factory, member, "Why was I suspended?", factory.Time.GetUtcNow().AddHours(-1), FeedbackKind.Problem, mayEmail: false);

        using var response = await Inbox.PostAsync(client, cookie, sent.Id, "replies", new { text = "We will look into it." });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal("member_unreachable", (await Inbox.JsonAsync(response)).GetProperty("code").GetString());
        Assert.Equal(FeedbackStatus.New, (await Inbox.StoredAsync(factory, sent.Id)).Status);
        Assert.Equal(0, (await Inbox.GetAsync(client, cookie, $"/{sent.Id}")).GetProperty("replies").GetArrayLength());
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task Given_a_note_from_a_member_whose_account_is_deleting_When_staff_reply_Then_it_is_refused_member_deleting_and_nothing_is_delivered_or_kept(bool mayEmail)
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await Inbox.SignInAsync(factory, client, $"dana.reply.deleting.{mayEmail}@example.org");
        var email = $"grace.reply.deleting.{mayEmail}@example.org";
        var member = await Inbox.MemberAsync(factory, email);
        var sent = await Inbox.NoteAsync(factory, member, "Please delete my data.", factory.Time.GetUtcNow().AddHours(-1), FeedbackKind.Idea, mayEmail: mayEmail);
        await factory.DeletingAsync(email);

        using var response = await Inbox.PostAsync(client, cookie, sent.Id, "replies", new { text = "We will look into it." });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal("member_deleting", (await Inbox.JsonAsync(response)).GetProperty("code").GetString());
        Assert.Equal(FeedbackStatus.New, (await Inbox.StoredAsync(factory, sent.Id)).Status);
        Assert.Equal(0, (await Inbox.GetAsync(client, cookie, $"/{sent.Id}")).GetProperty("replies").GetArrayLength());
        Assert.DoesNotContain(factory.Emails.Sent(), e => e.To == email);
        using var scope = factory.Services.CreateScope();
        Assert.False(await scope.ServiceProvider.GetRequiredService<AppDbContext>().DirectMessages
            .AnyAsync(m => m.RecipientId == member, TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task Given_a_note_When_it_is_resolved_and_reopened_Then_its_status_moves_and_each_change_is_audited()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await Inbox.SignInAsync(factory, client, "dana.resolve@example.org");
        var member = await Inbox.MemberAsync(factory, "grace.resolve@example.org");
        var sent = await Inbox.NoteAsync(factory, member, "Great retreat.", factory.Time.GetUtcNow().AddHours(-1), FeedbackKind.Thanks);

        using var resolved = await Inbox.PostAsync(client, cookie, sent.Id, "resolve");
        using var twice = await Inbox.PostAsync(client, cookie, sent.Id, "resolve");
        using var reopened = await Inbox.PostAsync(client, cookie, sent.Id, "reopen");
        using var again = await Inbox.PostAsync(client, cookie, sent.Id, "reopen");
        using var unknown = await Inbox.PostAsync(client, cookie, Guid.NewGuid(), "resolve");

        Assert.Equal((HttpStatusCode.OK, "resolved"), (resolved.StatusCode, (await Inbox.JsonAsync(resolved)).GetProperty("status").GetString()));
        Assert.Equal((HttpStatusCode.Conflict, "status_conflict"), (twice.StatusCode, (await Inbox.JsonAsync(twice)).GetProperty("code").GetString()));
        Assert.Equal((HttpStatusCode.OK, "new"), (reopened.StatusCode, (await Inbox.JsonAsync(reopened)).GetProperty("status").GetString()));
        Assert.Equal(HttpStatusCode.Conflict, again.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, unknown.StatusCode);
        await using var scope = factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var actions = await db.AuditEntries.AsNoTracking().Where(e => e.RecordId == sent.Id).OrderBy(e => e.Action).Select(e => e.Action).ToListAsync(TestContext.Current.CancellationToken);
        Assert.Equal(["feedback.reopened", "feedback.resolved"], actions);
    }
}
