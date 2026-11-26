using System.Text.RegularExpressions;

namespace ChristianFitness.Application.Abstractions;

/// <summary>
/// The current request's device as feedback records it (L2-063 AC6; ADR 0109): the OS family and
/// the browser family with its major version, read from the <c>User-Agent</c> header. Nothing finer
/// and never the raw header is kept.
/// </summary>
public interface IClientDevice
{
    /// <summary>The OS family, such as "iOS"; "Other" when it cannot be read.</summary>
    string Os { get; }

    /// <summary>The browser family and major version, such as "Safari 18"; "Other" when it cannot be read.</summary>
    string Browser { get; }
}

/// <summary>Reads a <c>User-Agent</c> into the families <see cref="IClientDevice"/> answers (ADR 0109).</summary>
public static partial class ClientDevices
{
    public const string Other = "Other";

    /// <summary>The OS family a <c>User-Agent</c> names, the more specific families first.</summary>
    public static string OsOf(string? userAgent)
    {
        if (string.IsNullOrWhiteSpace(userAgent))
        {
            return Other;
        }

        if (userAgent.Contains("iPad", StringComparison.Ordinal))
        {
            return "iPadOS";
        }

        if (userAgent.Contains("iPhone", StringComparison.Ordinal) || userAgent.Contains("iPod", StringComparison.Ordinal))
        {
            return "iOS";
        }

        if (userAgent.Contains("Android", StringComparison.Ordinal))
        {
            return "Android";
        }

        if (userAgent.Contains("CrOS", StringComparison.Ordinal))
        {
            return "ChromeOS";
        }

        if (userAgent.Contains("Windows", StringComparison.Ordinal))
        {
            return "Windows";
        }

        if (userAgent.Contains("Mac OS X", StringComparison.Ordinal) || userAgent.Contains("Macintosh", StringComparison.Ordinal))
        {
            return "macOS";
        }

        return userAgent.Contains("Linux", StringComparison.Ordinal) ? "Linux" : Other;
    }

    /// <summary>
    /// The browser family and major version a <c>User-Agent</c> names. Browsers built on Chrome or
    /// Safari name themselves first, so Edge, Samsung Internet and Opera are read before Chrome,
    /// and Chrome, Firefox and Edge on iOS before Safari.
    /// </summary>
    public static string BrowserOf(string? userAgent)
    {
        if (string.IsNullOrWhiteSpace(userAgent))
        {
            return Other;
        }

        foreach (var (family, pattern) in Families)
        {
            var match = pattern.Match(userAgent);
            if (match.Success)
            {
                return $"{family} {match.Groups[1].Value}";
            }
        }

        return Other;
    }

    private static readonly (string Family, Regex Pattern)[] Families =
    [
        ("Edge", Edg()),
        ("Samsung Internet", SamsungBrowser()),
        ("Opera", Opera()),
        ("Firefox", Firefox()),
        ("Chrome", Chrome()),
        ("Safari", Safari()),
    ];

    [GeneratedRegex(@"\bEdg(?:e|A|iOS)?/(\d{1,4})\.", RegexOptions.CultureInvariant, matchTimeoutMilliseconds: 100)]
    private static partial Regex Edg();

    [GeneratedRegex(@"\bSamsungBrowser/(\d{1,4})\.", RegexOptions.CultureInvariant, matchTimeoutMilliseconds: 100)]
    private static partial Regex SamsungBrowser();

    [GeneratedRegex(@"\b(?:OPR|OPiOS)/(\d{1,4})\.", RegexOptions.CultureInvariant, matchTimeoutMilliseconds: 100)]
    private static partial Regex Opera();

    [GeneratedRegex(@"\b(?:Firefox|FxiOS)/(\d{1,4})\.", RegexOptions.CultureInvariant, matchTimeoutMilliseconds: 100)]
    private static partial Regex Firefox();

    [GeneratedRegex(@"\b(?:Chrome|CriOS)/(\d{1,4})\.", RegexOptions.CultureInvariant, matchTimeoutMilliseconds: 100)]
    private static partial Regex Chrome();

    [GeneratedRegex(@"\bVersion/(\d{1,4})(?:\.\d+)*(?: Mobile/\S+)? Safari/", RegexOptions.CultureInvariant, matchTimeoutMilliseconds: 100)]
    private static partial Regex Safari();
}
