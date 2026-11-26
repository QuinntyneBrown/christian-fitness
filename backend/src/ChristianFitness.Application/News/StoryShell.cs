using System.Text.Encodings.Web;
using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Email;
using ChristianFitness.Domain.News;
using MediatR;

namespace ChristianFitness.Application.News;

/// <summary>The member app's built <c>index.html</c>, read from the static host (ADR 0105).</summary>
public interface IStoryShell
{
    /// <summary>The shell, or none when it cannot be read now.</summary>
    Task<string?> GetAsync(CancellationToken cancellationToken);
}

/// <summary>What <c>GET /stories/{slug}</c> answers.</summary>
public enum StoryShellOutcome
{
    /// <summary>200: the shell with the story's metadata.</summary>
    Story,

    /// <summary>301 to <see cref="StoryShellAnswer.Location"/>, the current address.</summary>
    Moved,

    /// <summary>404: the shell unchanged.</summary>
    NotFound,

    /// <summary>503: no shell to serve; the static host serves its own.</summary>
    Unavailable,
}

public sealed record StoryShellAnswer(StoryShellOutcome Outcome, string? Html, Uri? Location);

/// <summary>
/// The member app's shell for a story's address, read without JavaScript (L2-061 AC8, AC11; ADR
/// 0105): with a Published story's headline as the title, its summary as the description, Open
/// Graph and Twitter tags and a canonical link, every value HTML-encoded; a former link moves to
/// the current one; any other slug is the shell unchanged, which the app shows as not found.
/// </summary>
public sealed record GetStoryShellQuery(string Slug) : IRequest<StoryShellAnswer>;

internal sealed class GetStoryShellHandler(IAppDbContext db, IStoryShell shell, MemberAppAddress app) : IRequestHandler<GetStoryShellQuery, StoryShellAnswer>
{
    private const string Title = "<title>Christian Fitness</title>";

    public async Task<StoryShellAnswer> Handle(GetStoryShellQuery request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var html = await shell.GetAsync(cancellationToken).ConfigureAwait(false);
        if (html is null)
        {
            return new(StoryShellOutcome.Unavailable, null, null);
        }

        var story = await PublishedStories.FindAsync(db, request.Slug, cancellationToken).ConfigureAwait(false);
        if (story is null)
        {
            return new(StoryShellOutcome.NotFound, html, null);
        }

        var root = $"{app.BaseUrl.GetLeftPart(UriPartial.Authority)}{app.BaseUrl.AbsolutePath.TrimEnd('/')}";
        var canonical = $"{root}/stories/{Uri.EscapeDataString(story.Slug!)}";
        return story.Slug == request.Slug
            ? new(StoryShellOutcome.Story, Fill(html, story, root, canonical), null)
            : new(StoryShellOutcome.Moved, null, new Uri(canonical));
    }

    private static string Fill(string html, Story story, string root, string canonical)
    {
        var encoder = HtmlEncoder.Default;
        var headline = encoder.Encode(story.Headline);
        var summary = encoder.Encode(story.Summary);
        var image = story.ImageKey is { } key ? encoder.Encode($"{root}/api/stories/images/{Uri.EscapeDataString(key)}") : null;
        var link = encoder.Encode(canonical);
        string?[] lines =
        [
            $"<meta name=\"description\" content=\"{summary}\" />",
            "<meta property=\"og:type\" content=\"article\" />",
            $"<meta property=\"og:title\" content=\"{headline}\" />",
            $"<meta property=\"og:description\" content=\"{summary}\" />",
            $"<meta property=\"og:url\" content=\"{link}\" />",
            image is null ? null : $"<meta property=\"og:image\" content=\"{image}\" />",
            $"<meta name=\"twitter:card\" content=\"{(image is null ? "summary" : "summary_large_image")}\" />",
            $"<meta name=\"twitter:title\" content=\"{headline}\" />",
            $"<meta name=\"twitter:description\" content=\"{summary}\" />",
            image is null ? null : $"<meta name=\"twitter:image\" content=\"{image}\" />",
            $"<link rel=\"canonical\" href=\"{link}\" />",
        ];
        var tags = string.Concat(lines.OfType<string>().Select(line => line + "\n"));
        var titled = html.Contains(Title, StringComparison.Ordinal)
            ? html.Replace(Title, $"<title>{headline}</title>", StringComparison.Ordinal)
            : html;
        var head = titled.IndexOf("</head>", StringComparison.OrdinalIgnoreCase);
        return head < 0 ? titled : titled.Insert(head, tags);
    }
}
