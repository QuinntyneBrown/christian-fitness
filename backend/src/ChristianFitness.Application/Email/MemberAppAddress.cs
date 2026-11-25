namespace ChristianFitness.Application.Email;

/// <summary>
/// Where the member app is served (<c>MemberApp:BaseUrl</c>), which every link in an email starts
/// with. It comes from configuration, never from a request's <c>Host</c> header (ADR 0010).
/// </summary>
public sealed class MemberAppAddress
{
    public MemberAppAddress(Uri baseUrl)
    {
        ArgumentNullException.ThrowIfNull(baseUrl);
        if (!baseUrl.IsAbsoluteUri)
        {
            throw new ArgumentException("The member app's address must be absolute.", nameof(baseUrl));
        }

        BaseUrl = baseUrl;
    }

    public Uri BaseUrl { get; }

    /// <summary>
    /// The Reset password screen with <paramref name="token"/> in the fragment, which no browser
    /// sends to a server or in a <c>Referer</c>.
    /// </summary>
    /// <summary>The claim screen for <paramref name="token"/> (L2-078 AC1; ADR 0087): <c>/claim/{token}</c>.</summary>
    public string ClaimLink(string token) =>
        $"{BaseUrl.GetLeftPart(UriPartial.Authority)}{BaseUrl.AbsolutePath.TrimEnd('/')}/claim/{token}";

    public string ResetPasswordLink(string token) =>
        $"{BaseUrl.GetLeftPart(UriPartial.Authority)}{BaseUrl.AbsolutePath.TrimEnd('/')}/reset-password#token={token}";
}
