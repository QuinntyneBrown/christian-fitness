using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.WebUtilities;

namespace ChristianFitness.Api.Tests.Google;

/// <summary>Which app starts a Google sign-in: each has its own start and callback (ADR 0099).</summary>
public enum GoogleApp
{
    Member,
    Staff,
}

/// <summary>
/// Drives a Google sign-in through the API as the browser and Google would: start it, follow the
/// authorization address to Google (the test says what Google answers), and come back to the
/// callback with the cookies the start set. Every step's answer is kept, so a test can assert on
/// any of them. Shared by the member and staff tests.
/// </summary>
public static class GoogleSignIn
{
    public const string ExternalCookieName = "__Host-cf-google";

    /// <summary>The member app's start (L2-049 AC1).</summary>
    public const string MemberStartPath = "/api/session/google/start";

    /// <summary>The admin app's start (L2-049 AC1, L2-018).</summary>
    public const string StaffStartPath = "/api/admin/session/google/start";

    public const string MemberCallbackPath = "/api/session/google/callback";
    public const string StaffCallbackPath = "/api/admin/session/google/callback";

    /// <summary>Starts an attempt and answers the API's response, unread.</summary>
    public static Task<HttpResponseMessage> StartAsync(HttpClient client, GoogleApp app, object? body = null, string? clientAddress = null)
    {
        ArgumentNullException.ThrowIfNull(client);
        var request = new HttpRequestMessage(HttpMethod.Post, new Uri(app == GoogleApp.Member ? MemberStartPath : StaffStartPath, UriKind.Relative))
        {
            Content = JsonContent.Create(body ?? (app == GoogleApp.Member ? new { intent = "sign-in" } : new { })),
        };
        if (clientAddress is not null)
        {
            request.Headers.Add(ApiFactory.ClientAddressHeader, clientAddress);
        }

        return SendDisposingAsync(client, request);
    }

    /// <summary>A started attempt: the authorization address, its query and the cookies the start set.</summary>
    public static async Task<GoogleAttempt> BeginAsync(HttpClient client, GoogleApp app, object? body = null)
    {
        using var started = await StartAsync(client, app, body).ConfigureAwait(false);
        if (started.StatusCode != HttpStatusCode.OK)
        {
            throw new InvalidOperationException($"The start answered {(int)started.StatusCode}: {await started.Content.ReadAsStringAsync().ConfigureAwait(false)}");
        }

        var answer = await started.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken).ConfigureAwait(false);
        var location = new Uri(answer.GetProperty("location").GetString()!);
        var query = QueryHelpers.ParseQuery(location.Query).ToDictionary(pair => pair.Key, pair => pair.Value.ToString(), StringComparer.Ordinal);
        return new GoogleAttempt(app, location, query, Browser.CookiesOf(started));
    }

    /// <summary>Google sends the browser back to the callback with <paramref name="query"/> and the attempt's cookies.</summary>
    public static Task<HttpResponseMessage> CallbackAsync(HttpClient client, GoogleAttempt attempt, string query)
    {
        ArgumentNullException.ThrowIfNull(attempt);
        var path = attempt.App == GoogleApp.Member ? MemberCallbackPath : StaffCallbackPath;
        var request = new HttpRequestMessage(HttpMethod.Get, new Uri($"{path}?{query}", UriKind.Relative));
        if (attempt.Cookies.Count > 0)
        {
            request.Headers.Add("Cookie", string.Join("; ", attempt.Cookies.Select(pair => $"{pair.Key}={pair.Value}")));
        }

        return SendDisposingAsync(client, request);
    }

    /// <summary>
    /// The person chooses <paramref name="account"/> at Google, which sends the browser back with a
    /// code for it: the callback's answer (a redirect to the screen, and the external cookie).
    /// </summary>
    public static async Task<HttpResponseMessage> ReturnAsync(HttpClient client, FakeGoogle google, GoogleAttempt attempt, GoogleAccount account)
    {
        ArgumentNullException.ThrowIfNull(google);
        ArgumentNullException.ThrowIfNull(attempt);
        ArgumentNullException.ThrowIfNull(account);
        account.Nonce ??= attempt.Query["nonce"];
        var code = "code-" + Guid.NewGuid().ToString("N");
        google.Answer(code, account);
        return await CallbackAsync(client, attempt, $"code={code}&state={Uri.EscapeDataString(attempt.Query["state"])}&scope=openid").ConfigureAwait(false);
    }

    /// <summary>
    /// The whole round trip for <paramref name="account"/>: the <c>__Host-cf-google</c> cookie as a
    /// request sends it back (<c>name=value</c>), which the finish endpoints read.
    /// </summary>
    public static async Task<string> ExternalCookieAsync(HttpClient client, FakeGoogle google, GoogleApp app, GoogleAccount account, object? body = null)
    {
        var attempt = await BeginAsync(client, app, body).ConfigureAwait(false);
        using var returned = await ReturnAsync(client, google, attempt, account).ConfigureAwait(false);
        var cookies = Browser.CookiesOf(returned);
        return cookies.TryGetValue(ExternalCookieName, out var value)
            ? $"{ExternalCookieName}={value}"
            : throw new InvalidOperationException($"The callback answered {(int)returned.StatusCode} to {returned.Headers.Location} with no external cookie.");
    }

    private static async Task<HttpResponseMessage> SendDisposingAsync(HttpClient client, HttpRequestMessage request)
    {
        using (request)
        {
            return await client.SendAsync(request, TestContext.Current.CancellationToken).ConfigureAwait(false);
        }
    }
}

/// <summary>A started Google sign-in, as the browser holds it on its way to Google.</summary>
public sealed record GoogleAttempt(
    GoogleApp App,
    Uri Location,
    IReadOnlyDictionary<string, string> Query,
    IReadOnlyDictionary<string, string> Cookies);
