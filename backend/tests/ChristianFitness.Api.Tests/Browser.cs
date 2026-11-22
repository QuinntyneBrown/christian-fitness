using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;

namespace ChristianFitness.Api.Tests;

/// <summary>
/// What a test needs to talk to the API as the member app does. The session cookie is
/// <c>Secure</c>: the client speaks HTTPS, and the tests read <c>Set-Cookie</c> and send
/// <c>Cookie</c> themselves, to see exactly what the API set.
/// </summary>
internal static class Browser
{
    public const string SessionCookieName = "__Host-cf-session";

    public static HttpClient CreateClient(WebApplicationFactory<Program> factory) =>
        factory.CreateClient(new WebApplicationFactoryClientOptions { BaseAddress = new Uri("https://localhost"), HandleCookies = false });

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

    /// <summary>The <c>Set-Cookie</c> value of the session cookie, with its attributes.</summary>
    public static string? SessionSetCookie(HttpResponseMessage response) =>
        response.Headers.TryGetValues("Set-Cookie", out var values)
            ? values.SingleOrDefault(value => value.StartsWith(SessionCookieName + "=", StringComparison.Ordinal))
            : null;

    /// <summary>The session cookie as a request sends it back (<c>name=value</c>).</summary>
    public static string SessionCookie(HttpResponseMessage response) =>
        (SessionSetCookie(response) ?? throw new InvalidOperationException("The response set no session cookie.")).Split(';')[0];

    /// <summary>The attributes of a <c>Set-Cookie</c> value, lower case.</summary>
    public static IReadOnlyList<string> Attributes(string setCookie) =>
#pragma warning disable CA1308 // Cookie attributes are compared in lower case.
        [.. setCookie.Split(';', StringSplitOptions.TrimEntries).Skip(1).Select(attribute => attribute.ToLowerInvariant())];
#pragma warning restore CA1308
}
