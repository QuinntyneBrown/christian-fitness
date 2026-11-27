using System.IO.Compression;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using ChristianFitness.Application.Abstractions;
using ChristianFitness.Domain.Events;
using ChristianFitness.Domain.Newsletter;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Preferences;

/// <summary>
/// One member's data as a .zip (L2-066 AC1, AC2; ADR 0078, ADR 0117): a README and one JSON file
/// each for profile (with suggestions and legal acceptance), preferences, registrations, follows,
/// messages sent, feedback and subscriptions. It reads only rows the member owns or sent. Another
/// person appears only as the display name beside a message the member sent them; no id, no other
/// person's email, message or profile, and no staff words (a moderation note, a decline reason or
/// a reply) are written. Times are UTC.
/// </summary>
internal static class DataExportArchive
{
    public const string Readme = """
        Your Christian Fitness data
        ===========================

        This archive holds a copy of the data Christian Fitness keeps about you, as it was when it
        was made. Times are in UTC.

        profile.json        Your profile, the legal versions you accepted, and the listings you suggested.
        preferences.json    Your email, notification, privacy and suggestion settings.
        registrations.json  The events and series you registered for.
        follows.json        The directory listings you follow.
        messages.json       The messages you sent, in event and series chats and to other members.
                            Other people appear by display name only; messages they sent are not included.
        feedback.json       The notes you sent the team.
        subscriptions.json  Your subscription to The Abundant Weekly and its extras.

        Questions? Use Send feedback in the app.
        """;

    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true,
        // A file for the member to read, never put in a page: keep apostrophes and accents as typed.
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
    };

    public static async Task<byte[]> BuildAsync(IAppDbContext db, Guid memberId, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var files = new List<(string Name, object Content)>
        {
            ("profile.json", await ProfileAsync(db, memberId, cancellationToken).ConfigureAwait(false)),
            ("preferences.json", await PreferencesAsync(db, memberId, now, cancellationToken).ConfigureAwait(false)),
            ("registrations.json", await RegistrationsAsync(db, memberId, cancellationToken).ConfigureAwait(false)),
            ("follows.json", await FollowsAsync(db, memberId, cancellationToken).ConfigureAwait(false)),
            ("messages.json", await MessagesAsync(db, memberId, cancellationToken).ConfigureAwait(false)),
            ("feedback.json", await FeedbackAsync(db, memberId, cancellationToken).ConfigureAwait(false)),
            ("subscriptions.json", await SubscriptionsAsync(db, memberId, cancellationToken).ConfigureAwait(false)),
        };

        using var buffer = new MemoryStream();
        using (var zip = new ZipArchive(buffer, ZipArchiveMode.Create, leaveOpen: true))
        {
            Write(zip, "README.txt", Readme);
            foreach (var (name, content) in files)
            {
                Write(zip, name, JsonSerializer.Serialize(content, Json));
            }
        }

        return buffer.ToArray();
    }

    private static void Write(ZipArchive zip, string name, string text)
    {
        using var writer = new StreamWriter(zip.CreateEntry(name, CompressionLevel.Optimal).Open(), new UTF8Encoding(false));
        writer.Write(text);
    }

    private static async Task<object> ProfileAsync(IAppDbContext db, Guid memberId, CancellationToken cancellationToken)
    {
        var member = await db.Members.AsNoTracking().SingleAsync(m => m.Id == memberId, cancellationToken).ConfigureAwait(false);
        // The person suggested's email is theirs, not the member's, and a decline reason is staff's words.
        var suggestions = await db.ListingSuggestions.AsNoTracking()
            .Where(s => s.SuggestedById == memberId)
            .OrderBy(s => s.SubmittedAt)
            .Select(s => new { s.Name, s.Kind, s.Relation, s.Where, s.Website, s.ChurchConnection, s.Reason, s.MayTellWhoSuggested, s.SubmittedAt, s.Status })
            .ToListAsync(cancellationToken).ConfigureAwait(false);
        return new
        {
            member.Name,
            member.Email,
            member.City,
            member.Bio,
            member.Goals,
            member.Interests,
            member.HomeChurch,
            member.ShowHomeChurch,
            member.JoinedAt,
            LegalAcceptance = member.AcceptedLegalAt is { } acceptedAt
                ? new { TermsVersion = member.AcceptedTermsVersion, PrivacyVersion = member.AcceptedPrivacyVersion, AcceptedAt = acceptedAt }
                : null,
            Suggestions = suggestions.Select(s => new
            {
                s.Name,
                Kind = s.Kind.ToString(),
                Relation = s.Relation.ToString(),
                s.Where,
                s.Website,
                s.ChurchConnection,
                s.Reason,
                s.MayTellWhoSuggested,
                s.SubmittedAt,
                Status = s.Status.ToString(),
            }),
        };
    }

    private static async Task<object> PreferencesAsync(IAppDbContext db, Guid memberId, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var preferences = await PreferencesReader.ReadAsync(db, memberId, now, cancellationToken).ConfigureAwait(false);
        return new { preferences.Email, preferences.Notifications, preferences.Privacy, preferences.Suggestions };
    }

    private static async Task<object> RegistrationsAsync(IAppDbContext db, Guid memberId, CancellationToken cancellationToken)
    {
        var events = await db.Registrations.AsNoTracking()
            .Where(r => r.MemberId == memberId)
            .Join(db.Events, r => r.EventId, e => e.Id, (r, e) => new { e.Title, e.StartsAt, e.Place, r.Status, r.CreatedAt })
            .OrderBy(r => r.StartsAt)
            .ToListAsync(cancellationToken).ConfigureAwait(false);
        var series = await db.SeriesEnrolments.AsNoTracking()
            .Where(s => s.MemberId == memberId)
            .Join(db.EventSeries, s => s.SeriesId, x => x.Id, (s, x) => new { x.Title, s.Status, s.CreatedAt })
            .OrderBy(s => s.CreatedAt)
            .ToListAsync(cancellationToken).ConfigureAwait(false);
        return new
        {
            Events = events.Select(e => new { Event = e.Title, e.StartsAt, e.Place, Status = e.Status.ToString(), RegisteredAt = e.CreatedAt }),
            Series = series.Select(s => new { Series = s.Title, Status = s.Status.ToString(), JoinedAt = s.CreatedAt }),
        };
    }

    private static async Task<object> FollowsAsync(IAppDbContext db, Guid memberId, CancellationToken cancellationToken) =>
        await db.ListingFollows.AsNoTracking()
            .Where(f => f.MemberId == memberId)
            .Join(db.DirectoryListings, f => f.ListingId, l => l.Id, (f, l) => new { Listing = l.Name, f.FollowedAt })
            .OrderBy(f => f.FollowedAt)
            .ToListAsync(cancellationToken).ConfigureAwait(false);

    private static async Task<object> MessagesAsync(IAppDbContext db, Guid memberId, CancellationToken cancellationToken)
    {
        var group = await db.ChatMessages.AsNoTracking()
            .Where(m => m.AuthorId == memberId)
            .OrderBy(m => m.SentAt).ThenBy(m => m.Id)
            .Select(m => new { m.ScopeKind, m.ScopeId, m.Text, m.SentAt })
            .ToListAsync(cancellationToken).ConfigureAwait(false);
        var eventIds = group.Where(m => m.ScopeKind == ChatScopeKind.Event).Select(m => m.ScopeId).Distinct().ToList();
        var seriesIds = group.Where(m => m.ScopeKind == ChatScopeKind.Series).Select(m => m.ScopeId).Distinct().ToList();
        var eventTitles = await db.Events.AsNoTracking().Where(e => eventIds.Contains(e.Id)).ToDictionaryAsync(e => e.Id, e => e.Title, cancellationToken).ConfigureAwait(false);
        var seriesTitles = await db.EventSeries.AsNoTracking().Where(s => seriesIds.Contains(s.Id)).ToDictionaryAsync(s => s.Id, s => s.Title, cancellationToken).ConfigureAwait(false);

        // Only what the member sent, beside the other person's display name (L2-066 AC2).
        var direct = await db.DirectMessages.AsNoTracking()
            .Where(m => m.SenderId == memberId)
            .Join(db.Members, m => m.RecipientId, r => r.Id, (m, r) => new { To = r.Name, m.Text, m.SentAt, m.Id })
            .OrderBy(m => m.SentAt).ThenBy(m => m.Id)
            .ToListAsync(cancellationToken).ConfigureAwait(false);
        return new
        {
            GroupChats = group.Select(m => new
            {
                Chat = (m.ScopeKind == ChatScopeKind.Event ? eventTitles : seriesTitles).GetValueOrDefault(m.ScopeId),
                m.Text,
                m.SentAt,
            }),
            Direct = direct.Select(m => new { m.To, m.Text, m.SentAt }),
        };
    }

    private static async Task<object> FeedbackAsync(IAppDbContext db, Guid memberId, CancellationToken cancellationToken)
    {
        // A reply is staff's message to the member, not the member's own: only when it came is kept.
        var notes = await db.FeedbackNotes.AsNoTracking()
            .Where(n => n.MemberId == memberId)
            .OrderBy(n => n.SentAt)
            .Select(n => new { n.Kind, n.Text, n.PageTitle, n.SentAt, n.Status, n.RepliedAt, n.ScreenshotKey })
            .ToListAsync(cancellationToken).ConfigureAwait(false);
        return notes.Select(n => new
        {
            Kind = n.Kind.ToString(),
            n.Text,
            Page = n.PageTitle,
            n.SentAt,
            Status = n.Status.ToString(),
            n.RepliedAt,
            HasScreenshot = n.ScreenshotKey is not null,
        });
    }

    private static async Task<object> SubscriptionsAsync(IAppDbContext db, Guid memberId, CancellationToken cancellationToken)
    {
        var address = NewsletterSubscription.Normalize(
            await db.Members.AsNoTracking().Where(m => m.Id == memberId).Select(m => m.NormalizedEmail).SingleAsync(cancellationToken).ConfigureAwait(false));
        var subscriptions = await db.NewsletterSubscriptions.AsNoTracking()
            .Where(s => s.Email == address)
            .ToListAsync(cancellationToken).ConfigureAwait(false);
        return subscriptions.Select(s => new
        {
            Newsletter = "The Abundant Weekly",
            s.Email,
            Status = s.Status.ToString(),
            s.Weekly,
            s.EventAlerts,
            s.TrainingPlan,
            s.Devotion,
            s.RequestedAt,
            s.ConsentedAt,
            s.ConsentSource,
            s.UnsubscribedAt,
        });
    }
}
