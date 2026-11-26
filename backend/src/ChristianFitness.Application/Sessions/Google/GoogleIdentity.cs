namespace ChristianFitness.Application.Sessions.Google;

/// <summary>
/// The Google account a checked ID token named: the only claims sign-in uses (L2-049 AC2). A class,
/// not a record, so its email and name never reach a log through a generated <c>ToString</c>
/// (L2-033 AC2, L2-049 AC8).
/// </summary>
public sealed class GoogleIdentity
{
    public required string Subject { get; init; }

    public required string Email { get; init; }

    public required bool EmailVerified { get; init; }

    public string? Name { get; init; }

    /// <summary>Google's address of the account's photo; the server alone may fetch it (L2-049 AC9, AC14).</summary>
    public string? PictureUrl { get; init; }

    /// <summary>The Google Workspace domain of the account, when it has one (<c>hd</c>).</summary>
    public string? HostedDomain { get; init; }
}

/// <summary>
/// The Google identity the callback kept for the screen's finish, in the <c>__Host-cf-google</c>
/// cookie (L2-049 AC12): read it, or forget it at once.
/// </summary>
public interface IGoogleIdentityReader
{
    /// <summary>The identity Google returned for <paramref name="app"/> within the last 10 minutes, or none.</summary>
    Task<GoogleIdentity?> ReadAsync(GoogleApp app);

    /// <summary>Deletes the kept identity.</summary>
    Task ForgetAsync();
}
