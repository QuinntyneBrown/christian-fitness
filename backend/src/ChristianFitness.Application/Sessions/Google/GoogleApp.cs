namespace ChristianFitness.Application.Sessions.Google;

/// <summary>The app a Google sign-in belongs to: each has its own scheme, callback and finish (L2-049 AC1; ADR 0099).</summary>
public enum GoogleApp
{
    Member,
    Staff,
}

/// <summary>
/// What a member's Google sign-in was started for, which names the screen it returns to: Sign in
/// or Join (L2-004 AC7, L2-003 AC7; ADR 0099). A staff sign-in is always <see cref="SignIn"/>.
/// </summary>
public static class GoogleIntents
{
    public const string SignIn = "sign-in";
    public const string Join = "join";
}

/// <summary>
/// One Google sign-in as it leaves for Google: the app, what it was started for, the member route
/// to land on afterwards (already checked, <see cref="MemberReturnPath"/>) and whether Google is to
/// show its account chooser (L2-049 AC1, AC6, AC13). It holds no personal data.
/// </summary>
public sealed record GoogleAttempt(GoogleApp App, string Intent, string? ReturnPath, bool SelectAccount);

/// <summary>Google's authorization address for one attempt; the screen leaves for it in a full-page redirect (L2-049 AC9).</summary>
public sealed record GoogleRedirectDto(string Location);

/// <summary>
/// Starts an attempt with Google through the app's OpenID Connect scheme (L2-049 AC1; ADR 0099):
/// the authorization address carries the attempt's <c>state</c>, nonce and PKCE challenge, and the
/// browser keeps the attempt only in cookies it cannot read.
/// </summary>
public interface IGoogleChallenge
{
    /// <summary>Whether the Google client is set for <paramref name="app"/> (and, for staff, the team's domain).</summary>
    bool IsConfigured(GoogleApp app);

    /// <summary>
    /// Google's authorization address for <paramref name="attempt"/>; refuses <c>google_unavailable</c>
    /// when Google cannot be reached.
    /// </summary>
    Task<string> BeginAsync(GoogleAttempt attempt, CancellationToken cancellationToken);
}
