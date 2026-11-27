using System.Net;
using System.Net.Http.Json;
using ChristianFitness.Api.Scheduling;
using ChristianFitness.Api.Tests.Preferences;
using ChristianFitness.Application.Events;
using ChristianFitness.Domain.Directory;
using ChristianFitness.Domain.Events;
using ChristianFitness.Domain.Feedback;
using ChristianFitness.Domain.Members;
using ChristianFitness.Domain.Newsletter;
using ChristianFitness.Domain.Notifications;
using ChristianFitness.Domain.Services;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;

namespace ChristianFitness.Api.Tests.Account;

/// <summary>
/// L2-066 AC7, AC8 and AC10, L2-033 AC3 (journey 36; ADR 0078, ADR 0118): 30 days after a deletion
/// the scheduler's tick erases the Member row and everything only the member owns, so the email can
/// join as new; their sent messages show "Deleted member" and "Message removed" while what others
/// sent them stays intact; read markers, reports, a listing they own and audit entries keep no id of
/// theirs; their address is told once. Not a second sooner. Its own class: it moves the clock 30 days.
/// </summary>
public sealed class EraseAccountTests(DeleteAccountFactory factory) : IClassFixture<DeleteAccountFactory>
{
    public const string DoneSubject = "Your Christian Fitness account has been deleted";

    [Fact]
    public async Task Given_a_deleted_account_When_30_days_pass_Then_a_tick_erases_it_and_its_messages_show_as_removed()
    {
        using var client = Browser.CreateClient(factory);
        const string email = "grace.erase@example.org";
        var (cookie, grace) = await Prefs.JoinAsync(factory, client, email);
        var (_, tyler) = await Prefs.JoinAsync(factory, client, "tyler.erase@example.org");
        var seeded = await SeedAsync(grace, tyler);
        using (var deleted = await Deletion.RequestAsync(client, cookie))
        {
            Assert.Equal(HttpStatusCode.NoContent, deleted.StatusCode);
        }

        // A second before the 30 days are over, nothing is erased.
        factory.Time.Advance(TimeSpan.FromDays(30) - TimeSpan.FromSeconds(1));
        await TickAsync();
        Assert.NotNull(await MemberOrNullAsync(grace));
        Assert.DoesNotContain(factory.Emails.Sent(), e => e.To == email && e.Subject == DoneSubject);

        factory.Time.Advance(TimeSpan.FromSeconds(1));
        await TickAsync();

        Assert.Null(await MemberOrNullAsync(grace));
        Assert.Equal(Owned.None, await OwnedByAsync(grace, email));
        Assert.Null(factory.Images.Of(seeded.PhotoKey));
        Assert.Null(factory.Screenshots.Of(seeded.ScreenshotKey));

        var done = Assert.Single(factory.Emails.Sent(), e => e.To == email && e.Subject == DoneSubject);
        Assert.Equal(
            """
            Hi Grace,

            Your account is deleted. We've erased your profile, preferences, follows, registrations, suggestions, feedback and the text of your messages.

            You're welcome back any time. You can join again with this email address as a new member. This is the last email we'll send to this address about your account.

            Christian Fitness

            Questions? Write to privacy@christian.fitness.
            """,
            done.Text);

        // What Tyler sees: her messages emptied in place under "Deleted member", his own intact.
        var tylerCookie = await Deletion.SecondSessionAsync(client, "tyler.erase@example.org");
        var group = await Deletion.GetJsonAsync(client, $"/api/events/{seeded.Past}/chat/messages", tylerCookie);
        Assert.Equal(
            [("Deleted member", "Message removed"), ("Tyler Reed", "Tyler's group message")],
            group.GetProperty("messages").EnumerateArray().Select(m => (m.GetProperty("author").GetString(), m.GetProperty("text").GetString())));
        var row = Assert.Single((await Deletion.GetJsonAsync(client, "/api/conversations", tylerCookie)).GetProperty("conversations").EnumerateArray(), r => r.GetProperty("kind").GetString() == "direct");
        Assert.Equal("Deleted member", row.GetProperty("name").GetString());
        var former = row.GetProperty("id").GetGuid();
        Assert.NotEqual(grace, former);
        var direct = await Deletion.GetJsonAsync(client, $"/api/messages/{former}/messages", tylerCookie);
        Assert.Equal(
            [("Deleted member", "Message removed"), ("Tyler Reed", "Yes! 7 AM?")],
            direct.GetProperty("messages").EnumerateArray().Select(m => (m.GetProperty("author").GetString(), m.GetProperty("text").GetString())));

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var ct = TestContext.Current.CancellationToken;
            // Tyler's marker of the conversation and the reports moved to the id that names nobody.
            Assert.True(await db.ChatReadMarkers.AnyAsync(k => k.MemberId == tyler && k.ScopeId == former, ct));
            Assert.Equal(
                new[] { (former, tyler), (tyler, former) }.Order(),
                (await db.MessageReports.AsNoTracking().Where(r => r.ReporterId == former || r.SenderId == former).ToListAsync(ct))
                    .Select(r => (r.ReporterId, r.SenderId)).Order());
            Assert.Null((await db.DirectoryListings.AsNoTracking().SingleAsync(l => l.Id == seeded.Listing, ct)).MemberId);
            // The audit trail keeps the action and its time, but not her id.
            var audit = Assert.Single(await db.AuditEntries.AsNoTracking().Where(a => a.Action == "account.deletion_requested" && a.OccurredAt == DeleteAccountFactory.Now).ToListAsync(ct));
            Assert.Equal((Guid.Empty, "Member", Guid.Empty), (audit.ActorMemberId, audit.RecordType, audit.RecordId));
        }

        // The email is free: it joins as a new member.
        using var joined = await client.PostAsJsonAsync(new Uri("/api/account/join", UriKind.Relative), JoinTests.Details(email), TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Created, joined.StatusCode);

        DeleteAccountTests.AssertNothingRecorded(factory, email, "grace.erase", grace.ToString(), "See you at the start line!");
    }

    /// <summary>How many rows of each kind still name the member or their address; all zero once erased.</summary>
    internal sealed record Owned(
        int Registrations, int Attendances, int Preferences, int Follows, int FollowChanges, int Views, int Notifications,
        int Suggestions, int Feedback, int Replies, int Applications, int Subscriptions, int Tokens, int ChatMessages,
        int DirectMessages, int Markers, int Reports, int Audits, int Attempts, int Exports, int Listings)
    {
        public static Owned None { get; } = new(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    }

    private async Task<Owned> OwnedByAsync(Guid id, string email)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var ct = TestContext.Current.CancellationToken;
        var notes = db.FeedbackNotes.Where(n => n.MemberId == id).Select(n => n.Id);
        var subscriptions = db.NewsletterSubscriptions.Where(s => s.Email == email).Select(s => s.Id);
        return new Owned(
            await db.Registrations.CountAsync(r => r.MemberId == id, ct),
            await db.Attendances.CountAsync(a => a.MemberId == id, ct),
            await db.MemberPreferences.CountAsync(p => p.MemberId == id, ct),
            await db.ListingFollows.CountAsync(f => f.MemberId == id, ct),
            await db.ListingFollowChanges.CountAsync(c => c.MemberId == id, ct),
            await db.EventViews.CountAsync(v => v.MemberId == id, ct),
            await db.Notifications.CountAsync(n => n.MemberId == id, ct),
            await db.ListingSuggestions.CountAsync(s => s.SuggestedById == id, ct),
            await db.FeedbackNotes.CountAsync(n => n.MemberId == id, ct),
            await db.FeedbackReplies.CountAsync(r => notes.Contains(r.NoteId), ct) + await db.FeedbackReplies.CountAsync(r => r.Text == "Thanks for the kind words", ct),
            await db.ProfessionalApplications.CountAsync(a => a.MemberId == id, ct),
            await db.NewsletterSubscriptions.CountAsync(s => s.Email == email, ct),
            await db.NewsletterUnsubscribeTokens.CountAsync(t => subscriptions.Contains(t.SubscriptionId), ct),
            await db.ChatMessages.CountAsync(m => m.AuthorId == id || m.Text == "See you at the start line!", ct),
            await db.DirectMessages.CountAsync(m => m.SenderId == id || m.RecipientId == id || m.Text == "Want to run together on Saturday?", ct),
            await db.ChatReadMarkers.CountAsync(k => k.MemberId == id || k.ScopeId == id, ct),
            await db.MessageReports.CountAsync(r => r.ReporterId == id || r.SenderId == id, ct),
            await db.AuditEntries.CountAsync(a => a.ActorMemberId == id || a.RecordId == id, ct),
            await db.AccountDeletionAttempts.CountAsync(a => a.MemberId == id, ct),
            await db.DataExportRequests.CountAsync(r => r.MemberId == id, ct),
            await db.DirectoryListings.CountAsync(l => l.MemberId == id, ct));
    }

    private async Task<Member?> MemberOrNullAsync(Guid id)
    {
        using var scope = factory.Services.CreateScope();
        return await scope.ServiceProvider.GetRequiredService<AppDbContext>().Members.AsNoTracking()
            .SingleOrDefaultAsync(m => m.Id == id, TestContext.Current.CancellationToken);
    }

    private async Task TickAsync()
    {
        using var clock = new PublishingClock(factory.Services.GetRequiredService<IServiceScopeFactory>(), factory.Time, NullLogger<PublishingClock>.Instance, "erase-account-tests");
        await clock.TickAsync(TestContext.Current.CancellationToken);
    }

    private sealed record Seeded(Guid Past, Guid Listing, string PhotoKey, string ScreenshotKey);

    /// <summary>
    /// Gives Grace everything a member can own: a photo, preferences, a follow, a viewed event, a
    /// notification, a place and attendance at a past run, a suggestion with a staff check, feedback
    /// with a reply and a screenshot, a professional application, the Weekly with an Unsubscribe
    /// token, a listing she claimed, group and direct messages, read markers and reports both ways.
    /// Tyler writes back and keeps his own name.
    /// </summary>
    private async Task<Seeded> SeedAsync(Guid graceId, Guid tyler)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var now = factory.Time.GetUtcNow();
        var grace = await db.Members.SingleAsync(m => m.Id == graceId, TestContext.Current.CancellationToken);
        var photo = ImageKeys.NewKey("jpg");
        await factory.Images.SaveAsync(photo, new byte[] { 1 }, TestContext.Current.CancellationToken);
        db.Entry(grace).Property(m => m.PhotoKey).CurrentValue = photo;
        var him = await db.Members.SingleAsync(m => m.Id == tyler, TestContext.Current.CancellationToken);
        him.EditProfile("Tyler Reed", null, null, null, [], []);
        var past = Event.CreateDraft("Hill Repeats", EventCategory.Run, now - TimeSpan.FromDays(2), "Riverdale Park", "East End, Toronto", 0, 50, "Up and down.", now - TimeSpan.FromDays(10));
        past.Publish(now - TimeSpan.FromDays(10));
        db.Events.Add(past);
        var listing = DirectoryListing.CreateDraft(Guid.CreateVersion7(now), ListingKind.Organization, "Lakeshore Runners", "Weekly runs.", "Waterfront", [], now);
        listing.Claim(graceId, now);
        db.DirectoryListings.Add(listing);
        db.Registrations.Add(Registration.Of(past.Id, graceId, 0, now - TimeSpan.FromDays(5)));
        db.Registrations.Add(Registration.Of(past.Id, tyler, 0, now - TimeSpan.FromDays(5)));
        db.Attendances.Add(Attendance.Of(past.Id, graceId, true, tyler, now));
        db.MemberPreferences.Add(MemberPreferences.DefaultsFor(graceId));
        db.ListingFollows.Add(ListingFollow.Of(graceId, listing.Id, now));
        db.ListingFollowChanges.Add(ListingFollowChange.Of(graceId, now));
        db.EventViews.Add(EventView.Of(graceId, past.Id, now));
        db.Notifications.Add(Notification.Of(graceId, NotificationKind.EventReminder, "Hill Repeats", "Tomorrow.", "/events", now));
        var suggestion = ListingSuggestion.Submit(graceId, SuggestionRelation.SomeoneIKnow, ListingKind.Organization, "Eastside Ladies Who Lift", "East York", null, null, "A great group.", "coach@eastside.example.org", true, now);
        db.ListingSuggestions.Add(suggestion);
        db.SuggestionChecks.Add(SuggestionCheck.Set(suggestion.Id, ListingCheck.Credentials, true, tyler, now));
        var shot = ImageKeys.NewKey("png");
        await factory.Screenshots.SaveAsync(shot, new byte[] { 2 }, TestContext.Current.CancellationToken);
        var note = FeedbackNote.Send(graceId, FeedbackKind.Problem, "The map is blank.", null, null, null, true, "Desktop", "Chrome", shot, now);
        db.FeedbackNotes.Add(note);
        db.FeedbackReplies.Add(FeedbackReply.To(note.Id, tyler, "Thanks for the kind words", now));
        db.ProfessionalApplications.Add(ProfessionalApplication.Submit(graceId, "Coach", ServiceCategory.Training, "CSCS", "Scarborough", "$60", "About.", now));
        var weekly = NewsletterSubscription.ForAccount(grace.NormalizedEmail, now);
        weekly.SetEmails(true, false, false, false, now);
        db.NewsletterSubscriptions.Add(weekly);
        db.NewsletterUnsubscribeTokens.Add(NewsletterUnsubscribeToken.Issue(weekly.Id, now).Stored);
        var hers = ChatMessage.Of(ChatScope.Of(past), graceId, "See you at the start line!", now - TimeSpan.FromDays(4));
        var his = ChatMessage.Of(ChatScope.Of(past), tyler, "Tyler's group message", now - TimeSpan.FromDays(4) + TimeSpan.FromMinutes(1));
        db.ChatMessages.AddRange(hers, his);
        db.DirectMessages.Add(DirectMessage.Of(graceId, tyler, "Want to run together on Saturday?", now - TimeSpan.FromDays(4) + TimeSpan.FromMinutes(2)));
        db.DirectMessages.Add(DirectMessage.Of(tyler, graceId, "Yes! 7 AM?", now - TimeSpan.FromDays(4) + TimeSpan.FromMinutes(3)));
        db.ChatReadMarkers.Add(ChatReadMarker.Of(graceId, past.Id, now));
        db.ChatReadMarkers.Add(ChatReadMarker.Of(graceId, tyler, now));
        db.ChatReadMarkers.Add(ChatReadMarker.Of(tyler, graceId, now));
        db.MessageReports.Add(MessageReport.Of(his.Id, graceId, tyler, null, now));
        db.MessageReports.Add(MessageReport.Of(hers.Id, tyler, graceId, null, now));
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        return new Seeded(past.Id, listing.Id, photo, shot);
    }
}
