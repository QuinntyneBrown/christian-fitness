using ChristianFitness.Application.Abstractions;

namespace ChristianFitness.Application.Tests.Feedback;

/// <summary>
/// L2-063 AC6 (ADR 0109): a note keeps the OS family and the browser family with its major
/// version, read from the <c>User-Agent</c>, and nothing finer. One case per row: browsers built on
/// Chrome or Safari are read by their own names first, and anything unread is "Other".
/// </summary>
public sealed class ClientDevicesTests
{
    [Theory]
    [InlineData("iPhone Safari 18", "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1", "iOS", "Safari 18")]
    [InlineData("iPad Safari 17", "Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1", "iPadOS", "Safari 17")]
    [InlineData("iPhone Chrome", "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.6778.73 Mobile/15E148 Safari/604.1", "iOS", "Chrome 131")]
    [InlineData("iPhone Firefox", "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/133.0 Mobile/15E148 Safari/605.1.15", "iOS", "Firefox 133")]
    [InlineData("iPhone Edge", "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 EdgiOS/131.2903.68 Mobile/15E148 Safari/605.1.15", "iOS", "Edge 131")]
    [InlineData("Android Chrome 124", "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.82 Mobile Safari/537.36", "Android", "Chrome 124")]
    [InlineData("Android Samsung Internet", "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36", "Android", "Samsung Internet 25")]
    [InlineData("Android Firefox", "Mozilla/5.0 (Android 14; Mobile; rv:133.0) Gecko/133.0 Firefox/133.0", "Android", "Firefox 133")]
    [InlineData("Windows Edge", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.2903.70", "Windows", "Edge 131")]
    [InlineData("Windows Opera", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 OPR/115.0.0.0", "Windows", "Opera 115")]
    [InlineData("Windows Chrome", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36", "Windows", "Chrome 131")]
    [InlineData("Windows Firefox", "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0", "Windows", "Firefox 133")]
    [InlineData("Mac Safari", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15", "macOS", "Safari 18")]
    [InlineData("Mac Chrome", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36", "macOS", "Chrome 131")]
    [InlineData("ChromeOS", "Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36", "ChromeOS", "Chrome 131")]
    [InlineData("Linux Firefox", "Mozilla/5.0 (X11; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0", "Linux", "Firefox 133")]
    [InlineData("a script", "curl/8.4.0", "Other", "Other")]
    [InlineData("an empty header", "", "Other", "Other")]
    [InlineData("no header", null, "Other", "Other")]
    public void Given_a_user_agent_When_it_is_read_Then_only_the_families_and_major_version_are_given(string why, string? userAgent, string os, string browser)
    {
        Assert.True(ClientDevices.OsOf(userAgent) == os, $"{why}: {ClientDevices.OsOf(userAgent)}");
        Assert.True(ClientDevices.BrowserOf(userAgent) == browser, $"{why}: {ClientDevices.BrowserOf(userAgent)}");
    }
}
