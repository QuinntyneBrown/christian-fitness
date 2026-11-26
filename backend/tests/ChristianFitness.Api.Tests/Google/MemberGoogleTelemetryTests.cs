using System.Diagnostics;
using System.Net;
using System.Net.Http.Json;
using ChristianFitness.Api.Tests.Sessions;
using ChristianFitness.Api.Tests.Telemetry;

namespace ChristianFitness.Api.Tests.Google;

/// <summary>
/// L2-049 AC8, L2-033 AC2 and L2-040 AC1 (ADR 0099): a member's Google sign-in, from the callback
/// to signed in, refused <c>no_account</c> or joined, leaves no code, token, state, nonce, email,
/// name, Google subject or cookie in any span or log; the finish's span records the route
/// template, the method and the status only.
/// </summary>
public sealed class MemberGoogleTelemetryTests(TelemetryTests.Factory factory) : IClassFixture<TelemetryTests.Factory>
{
    [Theory]
    [InlineData("a member signed in", "/api/session/google", HttpStatusCode.OK)]
    [InlineData("no member account", "/api/session/google", HttpStatusCode.NotFound)]
    [InlineData("a member joined", "/api/account/join/google", HttpStatusCode.Created)]
    public async Task Given_a_member_Google_sign_in_When_it_is_answered_Then_nothing_personal_or_secret_is_recorded(string why, string path, HttpStatusCode status)
    {
        using var client = Browser.CreateClient(factory);
        var tag = $"{status:D}";
        var email = $"grace.telemetry.{tag}@gmail.com";
        const string Name = "Ottoline Telemetry-Quill";
        if (status == HttpStatusCode.OK)
        {
            await SignInTests.JoinAsync(client, email);
        }

        var google = new GoogleAccount { Email = email, Name = Name };
        var attempt = await GoogleSignIn.BeginAsync(client, GoogleApp.Member, status == HttpStatusCode.Created ? new { intent = "join" } : null);
        string external;
        using (var returned = await GoogleSignIn.ReturnAsync(client, factory.Google, attempt, google))
        {
            external = $"{GoogleSignIn.ExternalCookieName}={Browser.CookiesOf(returned)[GoogleSignIn.ExternalCookieName]}";
        }

        var traceId = ActivityTraceId.CreateRandom();
        using var request = new HttpRequestMessage(HttpMethod.Post, new Uri(path, UriKind.Relative))
        {
            Content = status == HttpStatusCode.Created
                ? JsonContent.Create(new { fullName = Name, ageConfirmed = true })
                : JsonContent.Create(new { }),
        };
        request.Headers.Add("Cookie", external);
        request.Headers.Add("traceparent", $"00-{traceId}-{ActivitySpanId.CreateRandom()}-01");

        using var response = await client.SendAsync(request, TestContext.Current.CancellationToken);
        Assert.Equal(status, response.StatusCode);

        // The span ends after the response is written: await it, never sleep.
        var span = await factory.Spans.WaitForAsync(
            s => s.Kind == ActivityKind.Server && s.TraceId == traceId,
            s => $"{s.DisplayName} {{{string.Join(", ", s.TagObjects.Select(t => t.Key))}}}",
            $"the server span of POST {path}");

        Assert.Equal($"POST {path.TrimStart('/')}", span.DisplayName);
        Assert.Equal(["http.request.method", "http.response.status_code", "http.route"], span.TagObjects.Select(t => t.Key).Order(StringComparer.Ordinal));
        var exchange = factory.Google.Exchanges[^1];
        var secrets = new List<string>
        {
            external.Split('=', 2)[1],
            google.Subject,
            "grace.telemetry",
            "Telemetry-Quill",
            exchange["code"],
            exchange["code_verifier"],
            attempt.Query["state"],
            attempt.Query["nonce"],
            "fake-access-token",
        };
        foreach (var secret in secrets)
        {
            AssertNotRecorded(secret);
        }

        Assert.NotNull(why);
    }

    private void AssertNotRecorded(string value)
    {
        var recorded = factory.Spans.Snapshot()
            .SelectMany(s => s.TagObjects.Select(t => $"{t.Value}").Append(s.DisplayName).Append(s.StatusDescription ?? string.Empty).Concat(s.Events.Select(e => e.Name)))
            .Concat(factory.Logs.Snapshot().Select(log => string.Join(" | ", [log.CategoryName, log.FormattedMessage, log.Body, .. (log.Attributes ?? []).Select(a => $"{a.Key}={a.Value}")])))
            .ToArray();
        Assert.DoesNotContain(recorded, recordedValue => recordedValue.Contains(value, StringComparison.OrdinalIgnoreCase));
    }
}
