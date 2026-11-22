using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;

namespace ChristianFitness.Api.Tests;

/// <summary>
/// What a test needs to talk to the API as the member app does. The cookies are <c>Secure</c>: the
/// client speaks HTTPS, and the tests read <c>Set-Cookie</c> and send <c>Cookie</c> themselves, to
/// see exactly what the API set.
/// </summary>
internal static class Browser
{
    public const string SessionCookieName = "__Host-cf-session";
    public const string AntiforgeryCookieName = "__Host-cf-antiforgery";
    public const string TokenCookieName = "__Host-cf-xsrf";
    public const string TokenHeader = "X-XSRF-TOKEN";

    private static readonly Uri BaseAddress = new("https://localhost");

    /// <summary>
    /// A client that sends the antiforgery token with every state-changing request, as the member
    /// app does (ADR 0009): it fetches one for whoever the request's cookie says it is.
    /// </summary>
    public static HttpClient CreateClient(WebApplicationFactory<Program> factory) =>
        factory.CreateDefaultClient(BaseAddress, new AntiforgeryHandler());

    /// <summary>A client that sends only what a test gives it: no antiforgery token of its own.</summary>
    public static HttpClient CreateClientWithoutToken(WebApplicationFactory<Program> factory) =>
        factory.CreateDefaultClient(BaseAddress);

    /// <summary>Signs in with <paramref name="email"/> and <paramref name="password"/>.</summary>
    public static Task<HttpResponseMessage> SignInAsync(HttpClient client, string email, string password) =>
        client.PostAsJsonAsync(new Uri("/api/session", UriKind.Relative), new { email, password }, TestContext.Current.CancellationToken);

    /// <summary>Sends <paramref name="method"/> to <paramref name="path"/> carrying <paramref name="cookie"/>.</summary>
    public static async Task<HttpResponseMessage> SendAsync(HttpClient client, HttpMethod method, string path, string? cookie)
    {
        using var request = new HttpRequestMessage(method, new Uri(path, UriKind.Relative));
        if (cookie is not null)
        {
            request.Headers.Add("Cookie", cookie);
        }

        return await client.SendAsync(request, TestContext.Current.CancellationToken).ConfigureAwait(false);
    }

    /// <summary>The <c>Set-Cookie</c> value for the cookie <paramref name="name"/>, with its attributes.</summary>
    public static string? SetCookie(HttpResponseMessage response, string name) =>
        response.Headers.TryGetValues("Set-Cookie", out var values)
            ? values.SingleOrDefault(value => value.StartsWith(name + "=", StringComparison.Ordinal))
            : null;

    /// <summary>The <c>Set-Cookie</c> value of the session cookie, with its attributes.</summary>
    public static string? SessionSetCookie(HttpResponseMessage response) => SetCookie(response, SessionCookieName);

    /// <summary>The session cookie as a request sends it back (<c>name=value</c>).</summary>
    public static string SessionCookie(HttpResponseMessage response) =>
        (SessionSetCookie(response) ?? throw new InvalidOperationException("The response set no session cookie.")).Split(';')[0];

    /// <summary>Every cookie the response set, by name, with its value.</summary>
    public static Dictionary<string, string> CookiesOf(HttpResponseMessage response) =>
        (response.Headers.TryGetValues("Set-Cookie", out var values) ? values : [])
            .Select(value => value.Split(';')[0].Split('=', 2))
            .ToDictionary(pair => pair[0], pair => pair[1], StringComparer.Ordinal);

    /// <summary>A <c>Cookie</c> header holding the named cookies of <paramref name="cookies"/>.</summary>
    public static string CookieHeader(IReadOnlyDictionary<string, string> cookies, params string[] names) =>
        string.Join("; ", names.Select(name => $"{name}={cookies[name]}"));

    /// <summary>The attributes of a <c>Set-Cookie</c> value, lower case.</summary>
    public static IReadOnlyList<string> Attributes(string setCookie) =>
#pragma warning disable CA1308 // Cookie attributes are compared in lower case.
        [.. setCookie.Split(';', StringSplitOptions.TrimEntries).Skip(1).Select(attribute => attribute.ToLowerInvariant())];
#pragma warning restore CA1308

    /// <summary>
    /// Does what the member app's <c>antiforgeryInterceptor</c> and the browser do together: before
    /// an unsafe request with no token, it asks <c>GET /api/antiforgery</c> with the request's
    /// cookies, then sends the antiforgery cookie and the token header with the request.
    /// </summary>
    private sealed class AntiforgeryHandler : DelegatingHandler
    {
        public AntiforgeryHandler()
        {
        }

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            if (request.Method == HttpMethod.Get || request.Headers.Contains(TokenHeader))
            {
                return await base.SendAsync(request, cancellationToken).ConfigureAwait(false);
            }

            using var fetch = new HttpRequestMessage(HttpMethod.Get, new Uri(BaseAddress, "/api/antiforgery"));
            var cookie = request.Headers.TryGetValues("Cookie", out var given) ? string.Join("; ", given) : null;
            if (cookie is not null)
            {
                fetch.Headers.Add("Cookie", cookie);
            }

            using var fetched = await base.SendAsync(fetch, cancellationToken).ConfigureAwait(false);
            var cookies = CookiesOf(fetched);
            if (cookies.TryGetValue(TokenCookieName, out var token) && cookies.TryGetValue(AntiforgeryCookieName, out var antiforgery))
            {
                request.Headers.Remove("Cookie");
                request.Headers.Add("Cookie", cookie is null ? $"{AntiforgeryCookieName}={antiforgery}" : $"{cookie}; {AntiforgeryCookieName}={antiforgery}");
                request.Headers.Add(TokenHeader, token);
            }

            return await base.SendAsync(request, cancellationToken).ConfigureAwait(false);
        }
    }
}
