namespace ChristianFitness.Domain.News;

/// <summary>
/// Who a story read is counted for (L2-061 AC12; ADR 0105): a browser, not a crawler or link
/// previewer on the known list, nor a client that names no user agent.
/// </summary>
public static class StoryReaders
{
    /// <summary>Words that, anywhere in a user agent and in any case, name a crawler or a link previewer.</summary>
    private static readonly string[] Crawlers =
    [
        "bot", "crawl", "spider", "slurp", "facebookexternalhit", "facebookcatalog", "whatsapp", "embedly",
        "quora link preview", "skypeuripreview", "vkshare", "w3c_validator", "headlesschrome", "lighthouse",
        "curl/", "wget/", "python-requests", "httpclient", "okhttp", "go-http-client", "java/",
    ];

    /// <summary>Whether a read from <paramref name="userAgent"/> counts.</summary>
    public static bool Counts(string? userAgent) =>
        !string.IsNullOrWhiteSpace(userAgent) && !Crawlers.Any(c => userAgent.Contains(c, StringComparison.OrdinalIgnoreCase));
}
