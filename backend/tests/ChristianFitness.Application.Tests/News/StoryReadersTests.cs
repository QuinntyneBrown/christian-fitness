using ChristianFitness.Domain.News;

namespace ChristianFitness.Application.Tests.News;

/// <summary>
/// L2-061 AC12 (ADR 0105): a read counts for a browser, and not for a crawler or link previewer on
/// the known list or a client naming no user agent, one case per row.
/// </summary>
public sealed class StoryReadersTests
{
    public static TheoryData<string, string?, bool> Cases() => new()
    {
        { "Safari on an iPhone", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1", true },
        { "Chrome on Android", "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36", true },
        { "Firefox on Windows", "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0", true },
        { "Googlebot", "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)", false },
        { "Bingbot", "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)", false },
        { "Yahoo Slurp", "Mozilla/5.0 (compatible; Yahoo! Slurp; http://help.yahoo.com/help/us/ysearch/slurp)", false },
        { "Facebook's previewer", "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)", false },
        { "WhatsApp's previewer", "WhatsApp/2.23.20.0", false },
        { "Slack's previewer", "Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)", false },
        { "Twitter's previewer", "Twitterbot/1.0", false },
        { "Applebot", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1.1 Safari/605.1.15 (Applebot/0.1)", false },
        { "a headless browser", "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/124.0.0.0 Safari/537.36", false },
        { "curl", "curl/8.6.0", false },
        { "no user agent", null, false },
        { "an empty user agent", " ", false },
    };

    [Theory]
    [MemberData(nameof(Cases))]
    public void Counts_a_read_only_for_a_browser(string who, string? userAgent, bool counts)
    {
        Assert.True(StoryReaders.Counts(userAgent) == counts, who);
    }
}
