using System.Text.RegularExpressions;

namespace ChristianFitness.Application.Sessions;

/// <summary>
/// The server's copy of the member app's <c>signInReturnPathOf</c> (L2-004 AC6, L2-049 AC6; ADR
/// 0012, ADR 0099): only a path inside the app is kept for after sign-in; anything else, or none,
/// is Home. Both suites hold the same table of cases.
/// </summary>
public static partial class MemberReturnPath
{
    public const string Home = "/home";

    public static string Of(string? value)
    {
        if (value is null || !AppPath().IsMatch(value))
        {
            return Home;
        }

        var path = value.Split('?', '#')[0];
        return path == "/sign-in" ? Home : value;
    }

    /// <summary>A slash, then anything but a second slash or a backslash; no white space or control character.</summary>
    [GeneratedRegex(@"^/(?![/\\])[^\s\p{Cc}]*\z")]
    private static partial Regex AppPath();
}
