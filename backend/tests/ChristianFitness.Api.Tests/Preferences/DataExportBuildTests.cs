using System.IO.Compression;
using System.Text;
using System.Text.Json;
using ChristianFitness.Api.Scheduling;
using ChristianFitness.Domain.Directory;
using ChristianFitness.Domain.Events;
using ChristianFitness.Domain.Feedback;
using ChristianFitness.Domain.Members;
using ChristianFitness.Domain.Newsletter;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;

namespace ChristianFitness.Api.Tests.Preferences;

/// <summary>
/// L2-066 AC1, AC2 and AC10 (journey 35; ADR 0078, ADR 0117): the scheduler's tick builds each
/// requested archive, a .zip of a README and seven JSON files of the member's own data, keeps it for
/// 7 days and emails its link to the member's address once; the archive names other people by
/// display name only and holds none of their messages, emails, ids or profiles; no span or log
/// carries what it holds. Each test runs ticks of a clock built on the host's services at instants
/// it moves the fake clock to; it never sleeps.
/// </summary>
public sealed class DataExportBuildTests(DataExportFactory factory) : IClassFixture<DataExportFactory>
{
    private static readonly string[] Files =
    [
        "README.txt", "profile.json", "preferences.json", "registrations.json", "follows.json",
        "messages.json", "feedback.json", "subscriptions.json",
    ];

    [Fact]
    public async Task Given_a_requested_download_When_the_clock_ticks_Then_the_archive_is_built_kept_for_7_days_and_its_link_emailed_once()
    {
        using var client = Browser.CreateClient(factory);
        var (cookie, grace) = await Prefs.JoinAsync(factory, client, "grace.export.build@example.org");
        await SeedAsync(grace, "tyler.export.build@example.org");
        using var asked = await Exports.RequestAsync(client, cookie);
        var request = await RequestOfAsync(grace);
        var before = factory.Emails.Sent().Count;
        var now = factory.Time.GetUtcNow();

        await TickAsync();

        var ready = await RequestOfAsync(grace);
        Assert.Equal((now, now + TimeSpan.FromDays(7)), (ready.ReadyAt, ready.ExpiresAt));
        var zip = Assert.IsType<byte[]>(factory.Archives.Of(ready.ArchiveKey!));
        var entries = Read(zip);
        Assert.Equal(Files, entries.Keys);

        var email = Assert.Single(factory.Emails.Sent().Skip(before));
        Assert.Equal(("grace.export.build@example.org", "Your Christian Fitness data is ready"), (email.To, email.Subject));
        Assert.Equal(
            $"""
            Hi Grace,

            You asked for a copy of your data. It's a .zip of your profile, preferences, registrations, follows, suggestions, feedback and the messages you sent.

            The link works for 7 days, until April 22, 2026, and only when you're signed in as you. After that you can request a new one in Preferences.

            Download your data: {ApiFactory.MemberAppBaseUrl}/preferences/download/{request.Id}

            Christian Fitness

            If you didn't ask for this, you can ignore this email. Nobody can open the link without signing in as you.
            """,
            email.Text);

        // A second tick builds nothing again and sends no second email.
        factory.Time.Advance(TimeSpan.FromMinutes(1));
        await TickAsync();
        Assert.Single(factory.Emails.Sent().Skip(before));
        Assert.Equal(ready.ArchiveKey, (await RequestOfAsync(grace)).ArchiveKey);
    }

    [Fact]
    public async Task Given_a_member_with_data_When_their_archive_is_built_Then_it_holds_their_own_data_and_names_others_by_display_name_only()
    {
        using var client = Browser.CreateClient(factory);
        var (cookie, grace) = await Prefs.JoinAsync(factory, client, "grace.export.own@example.org");
        var tyler = await SeedAsync(grace, "tyler.export.own@example.org");
        using var asked = await Exports.RequestAsync(client, cookie);

        await TickAsync();

        var entries = Read(factory.Archives.Of((await RequestOfAsync(grace)).ArchiveKey!)!);
        var profile = JsonDocument.Parse(entries["profile.json"]).RootElement;
        Assert.Equal(
            ["bio", "city", "email", "goals", "homeChurch", "interests", "joinedAt", "legalAcceptance", "name", "showHomeChurch", "suggestions"],
            profile.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.Equal(("Grace Thompson", "grace.export.own@example.org", "Scarborough", "Grace Fellowship, Scarborough"),
            (profile.GetProperty("name").GetString(), profile.GetProperty("email").GetString(), profile.GetProperty("city").GetString(), profile.GetProperty("homeChurch").GetString()));
        var legal = profile.GetProperty("legalAcceptance");
        Assert.Equal(("2026-01-15", "2026-01-15", DataExportFactory.Now),
            (legal.GetProperty("termsVersion").GetString(), legal.GetProperty("privacyVersion").GetString(), legal.GetProperty("acceptedAt").GetDateTimeOffset()));
        var suggestion = Assert.Single(profile.GetProperty("suggestions").EnumerateArray());
        Assert.Equal(
            ["churchConnection", "kind", "mayTellWhoSuggested", "name", "reason", "relation", "status", "submittedAt", "website", "where"],
            suggestion.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.Equal("Eastside Ladies Who Lift", suggestion.GetProperty("name").GetString());

        var preferences = JsonDocument.Parse(entries["preferences.json"]).RootElement;
        Assert.Equal(["email", "notifications", "privacy", "suggestions"], preferences.EnumerateObject().Select(p => p.Name));
        Assert.True(preferences.GetProperty("email").GetProperty("weekly").GetBoolean());

        var registrations = JsonDocument.Parse(entries["registrations.json"]).RootElement;
        var registration = Assert.Single(registrations.GetProperty("events").EnumerateArray());
        Assert.Equal("Sunrise Waterfront 5K", registration.GetProperty("event").GetString());
        Assert.Equal("Couch to 5K Run Club", Assert.Single(registrations.GetProperty("series").EnumerateArray()).GetProperty("series").GetString());

        var follow = Assert.Single(JsonDocument.Parse(entries["follows.json"]).RootElement.EnumerateArray());
        Assert.Equal("Lakeshore Runners", follow.GetProperty("listing").GetString());

        var messages = JsonDocument.Parse(entries["messages.json"]).RootElement;
        var group = Assert.Single(messages.GetProperty("groupChats").EnumerateArray());
        Assert.Equal(("Sunrise Waterfront 5K", "See you at the start line!"), (group.GetProperty("chat").GetString(), group.GetProperty("text").GetString()));
        var direct = Assert.Single(messages.GetProperty("direct").EnumerateArray());
        Assert.Equal(["sentAt", "text", "to"], direct.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.Equal(("Tyler Reed", "Want to run together on Saturday?"), (direct.GetProperty("to").GetString(), direct.GetProperty("text").GetString()));

        var feedback = Assert.Single(JsonDocument.Parse(entries["feedback.json"]).RootElement.EnumerateArray());
        Assert.Equal("The events page is lovely.", feedback.GetProperty("text").GetString());
        Assert.Equal(JsonValueKind.Array, JsonDocument.Parse(entries["subscriptions.json"]).RootElement.ValueKind);
        Assert.Equal("Subscribed", Assert.Single(JsonDocument.Parse(entries["subscriptions.json"]).RootElement.EnumerateArray()).GetProperty("status").GetString());
        Assert.Contains("profile.json", entries["README.txt"], StringComparison.Ordinal);

        // Nothing of anyone else: not Tyler's messages, email, id or profile, nor the person suggested's email,
        // nor the reply staff wrote. Tyler is named by display name beside Grace's message only.
        var everything = string.Concat(entries.Values);
        foreach (var other in new[]
        {
            tyler.ToString(), tyler.ToString("N"), "tyler.export.own@example.org", "Lakeshore regular since 2019",
            "Yes! 7 AM?", "Tyler's group message", "coach@eastside.example.org", "Thanks for the kind words",
        })
        {
            Assert.DoesNotContain(other, everything, StringComparison.OrdinalIgnoreCase);
        }
    }

    [Fact]
    public async Task Given_a_built_archive_When_it_is_traced_and_logged_Then_no_span_or_log_carries_what_it_holds()
    {
        using var client = Browser.CreateClient(factory);
        var (cookie, grace) = await Prefs.JoinAsync(factory, client, "grace.export.quiet@example.org");
        await SeedAsync(grace, "tyler.export.quiet@example.org");
        using var asked = await Exports.RequestAsync(client, cookie);

        await TickAsync();

        var key = (await RequestOfAsync(grace)).ArchiveKey!;
        var recorded = factory.Spans.Snapshot()
            .SelectMany(s => s.TagObjects.Select(t => $"{t.Value}").Append(s.DisplayName))
            .Concat(factory.Logs.Snapshot().Select(log => string.Join(" | ", [log.CategoryName, log.FormattedMessage, log.Body, .. (log.Attributes ?? []).Select(a => $"{a.Key}={a.Value}")])))
            .ToArray();
        foreach (var held in new[] { "grace.export.quiet", "See you at the start line!", "Want to run together", "The events page is lovely", "Eastside Ladies Who Lift", key })
        {
            Assert.DoesNotContain(recorded, value => value.Contains(held, StringComparison.OrdinalIgnoreCase));
        }
    }

    /// <summary>
    /// Gives Grace a profile, legal acceptance, a suggestion, the Weekly, an event and a series
    /// place, a follow, a group and a direct message and a feedback note; and another member, Tyler,
    /// who writes back to her, writes in the group chat and has a profile of his own. Answers Tyler's id.
    /// </summary>
    private async Task<Guid> SeedAsync(Guid graceId, string tylerEmail)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var now = factory.Time.GetUtcNow();
        var grace = await db.Members.SingleAsync(m => m.Id == graceId, TestContext.Current.CancellationToken);
        grace.EditProfile("Grace Thompson", "Scarborough", "Grace Fellowship, Scarborough", "Running for joy.", ["Run a 10K"], ["running"]);
        grace.AcceptLegal(new DateOnly(2026, 1, 15), new DateOnly(2026, 1, 15), DataExportFactory.Now);
        var tyler = Member.Join("Tyler Reed", tylerEmail, string.Empty, now);
        tyler.EditProfile("Tyler Reed", "Etobicoke", null, "Lakeshore regular since 2019", [], []);
        db.Members.Add(tyler);
        var run = Event.CreateDraft("Sunrise Waterfront 5K", EventCategory.Run, now + TimeSpan.FromDays(3), "Martin Goodman Trail", "Waterfront, Toronto", 0, 50, "Come run with us.", now);
        run.Publish(now);
        db.Events.Add(run);
        var series = EventSeries.Create("Couch to 5K Run Club", EventCategory.Run, "Eight weeks.", null, DirectoryListing.TeamListingId, 0, null, 20, "High Park", "West End", now);
        db.EventSeries.Add(series);
        var listing = DirectoryListing.CreateDraft(Guid.CreateVersion7(now), ListingKind.Organization, "Lakeshore Runners", "Weekly runs.", "Waterfront", [], now);
        db.DirectoryListings.Add(listing);
        db.Registrations.Add(Registration.Of(run.Id, graceId, 0, now));
        db.SeriesEnrolments.Add(SeriesEnrolment.Of(series.Id, graceId, 0, now));
        db.ListingFollows.Add(ListingFollow.Of(graceId, listing.Id, now));
        db.ChatMessages.Add(ChatMessage.Of(ChatScope.Of(run), graceId, "See you at the start line!", now));
        db.ChatMessages.Add(ChatMessage.Of(ChatScope.Of(run), tyler.Id, "Tyler's group message", now));
        db.DirectMessages.Add(DirectMessage.Of(graceId, tyler.Id, "Want to run together on Saturday?", now));
        db.DirectMessages.Add(DirectMessage.Of(tyler.Id, graceId, "Yes! 7 AM?", now));
        db.ListingSuggestions.Add(ListingSuggestion.Submit(graceId, SuggestionRelation.SomeoneIKnow, ListingKind.Organization, "Eastside Ladies Who Lift", "East York", null, null, "A great group.", "coach@eastside.example.org", true, now));
        var note = FeedbackNote.Send(graceId, FeedbackKind.Thanks, "The events page is lovely.", null, null, null, true, "Desktop", "Chrome", null, now);
        db.FeedbackNotes.Add(note);
        db.FeedbackReplies.Add(FeedbackReply.To(note.Id, tyler.Id, "Thanks for the kind words", now));
        var weekly = NewsletterSubscription.ForAccount(grace.NormalizedEmail, now);
        weekly.SetEmails(true, false, false, false, now);
        db.NewsletterSubscriptions.Add(weekly);
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        return tyler.Id;
    }

    internal async Task<DataExportRequest> RequestOfAsync(Guid memberId)
    {
        using var scope = factory.Services.CreateScope();
        return await scope.ServiceProvider.GetRequiredService<AppDbContext>().DataExportRequests.AsNoTracking()
            .Where(r => r.MemberId == memberId).OrderByDescending(r => r.RequestedAt).FirstAsync(TestContext.Current.CancellationToken);
    }

    /// <summary>One tick of the API's scheduler, on the host's services and clock.</summary>
    internal async Task TickAsync()
    {
        using var clock = new PublishingClock(factory.Services.GetRequiredService<IServiceScopeFactory>(), factory.Time, NullLogger<PublishingClock>.Instance, "data-export-tests");
        await clock.TickAsync(TestContext.Current.CancellationToken);
    }

    /// <summary>Each file of the .zip, in its order, as text.</summary>
    private static Dictionary<string, string> Read(byte[] zip)
    {
        using var archive = new ZipArchive(new MemoryStream(zip), ZipArchiveMode.Read);
        var files = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (var entry in archive.Entries)
        {
            using var reader = new StreamReader(entry.Open(), Encoding.UTF8);
            files[entry.FullName] = reader.ReadToEnd();
        }

        return files;
    }
}

/// <summary>L2-066 AC2 and ADR 0078: an archive is removed 7 days after it was ready, by the scheduler's tick.</summary>
public sealed class DataExportExpiryTests(DataExportFactory factory) : IClassFixture<DataExportFactory>
{
    private readonly DataExportBuildTests builds = new(factory);

    [Fact]
    public async Task Given_a_built_archive_When_7_days_pass_Then_a_tick_removes_it_and_not_a_second_sooner()
    {
        using var client = Browser.CreateClient(factory);
        var (cookie, grace) = await Prefs.JoinAsync(factory, client, "grace.export.expire@example.org");
        using var asked = await Exports.RequestAsync(client, cookie);
        await builds.TickAsync();
        var key = (await builds.RequestOfAsync(grace)).ArchiveKey!;

        factory.Time.Advance(TimeSpan.FromDays(7) - TimeSpan.FromSeconds(1));
        await builds.TickAsync();
        Assert.NotNull(factory.Archives.Of(key));

        factory.Time.Advance(TimeSpan.FromSeconds(1));
        await builds.TickAsync();

        Assert.Null(factory.Archives.Of(key));
        Assert.Null((await builds.RequestOfAsync(grace)).ArchiveKey);
    }
}
