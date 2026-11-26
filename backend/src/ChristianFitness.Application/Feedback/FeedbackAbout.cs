using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.News;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Feedback;

/// <summary>What a note is about, as the server read it: a member route template or a story, and the label shown for it.</summary>
public sealed record FeedbackAboutPage(string? RouteTemplate, Guid? StoryId, string Label);

/// <summary>
/// Reads the <c>about</c> a member's address carries (ADR 0109): <c>page:&lt;route template&gt;</c>
/// for a member page the footer shows on, labelled by its page type, or <c>story:&lt;id&gt;</c> for
/// a story readers can see, labelled "Story › headline". Only this table names pages, so the form
/// and the stored note show the same label, and no client text becomes one.
/// </summary>
public static class FeedbackAbout
{
    private const string PagePrefix = "page:";
    private const string StoryPrefix = "story:";

    /// <summary>Each member route template the member footer shows on, with its page type (ADR 0109).</summary>
    private static readonly Dictionary<string, string> Pages = new(StringComparer.Ordinal)
    {
        ["home"] = "Home",
        ["events"] = "Events",
        ["events/:id"] = "Event",
        ["events/series/:id"] = "Event series",
        ["events/series/:id/chat"] = "Group chat",
        ["events/:id/chat"] = "Group chat",
        ["directory"] = "Directory",
        ["directory/suggest"] = "Suggest a listing",
        ["directory/:id"] = "Listing",
        ["claim/:token"] = "Claim a listing",
        ["services"] = "Services",
        ["services/:id"] = "Professional",
        ["members/:id"] = "Member",
        ["notifications"] = "Notifications",
        ["stories/:slug"] = "Story",
        ["profile"] = "Profile",
        ["feedback"] = "Send feedback",
    };

    /// <summary>The page <paramref name="about"/> names at <paramref name="now"/>, or none when the server does not know it.</summary>
    public static async Task<FeedbackAboutPage?> ReadAsync(IAppDbContext db, string? about, DateTimeOffset now, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(db);
        if (about is null)
        {
            return null;
        }

        if (about.StartsWith(PagePrefix, StringComparison.Ordinal))
        {
            var template = about[PagePrefix.Length..];
            return Pages.TryGetValue(template, out var label) ? new FeedbackAboutPage(template, null, label) : null;
        }

        if (about.StartsWith(StoryPrefix, StringComparison.Ordinal) && Guid.TryParseExact(about[StoryPrefix.Length..], "D", out var id))
        {
            var headline = await PublishedStories.At(db, now).Where(s => s.Id == id).Select(s => s.Headline).SingleOrDefaultAsync(cancellationToken).ConfigureAwait(false);
            return headline is null ? null : new FeedbackAboutPage(null, id, $"Story › {headline}");
        }

        return null;
    }
}
