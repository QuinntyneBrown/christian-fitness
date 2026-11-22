using System.Diagnostics;
using System.Net;
using System.Net.Http.Json;
using ChristianFitness.Api.Tests.Telemetry;

namespace ChristianFitness.Api.Tests.Sessions;

/// <summary>
/// L2-033 AC2 and L2-040 AC1: signing in, refused or not, leaves no email, password or cookie in
/// any span or log; the span records the route template, the method and the status only.
/// </summary>
public sealed class SignInTelemetryTests(TelemetryTests.Factory factory) : IClassFixture<TelemetryTests.Factory>
{
    private const string Email = "grace.telemetry.signin@example.org";
    private const string Password = "abundantlife";
    private static readonly string[] Personal = ["grace.telemetry", "example.org", "abundantlife", "wrong-secret", "cf-session"];

    [Fact]
    public async Task Given_a_member_signs_in_When_the_request_is_traced_and_logged_Then_nothing_personal_is_recorded()
    {
        using var client = Browser.CreateClient(factory);
        await SignInTests.JoinAsync(client, Email);

        await AssertNothingPersonalAsync(client, Password, HttpStatusCode.OK);
    }

    [Fact]
    public async Task Given_a_wrong_password_When_the_sign_in_is_refused_Then_nothing_personal_is_recorded()
    {
        using var client = Browser.CreateClient(factory);

        await AssertNothingPersonalAsync(client, "wrong-secret", HttpStatusCode.Unauthorized);
    }

    private async Task AssertNothingPersonalAsync(HttpClient client, string password, HttpStatusCode status)
    {
        var traceId = ActivityTraceId.CreateRandom();
        using var request = new HttpRequestMessage(HttpMethod.Post, new Uri("/api/session", UriKind.Relative))
        {
            Content = JsonContent.Create(new { email = Email, password }),
        };
        request.Headers.Add("traceparent", $"00-{traceId}-{ActivitySpanId.CreateRandom()}-01");

        using var response = await client.SendAsync(request, TestContext.Current.CancellationToken);
        Assert.Equal(status, response.StatusCode);

        // The span ends after the response is written: await it, never sleep.
        var span = await factory.Spans.WaitForAsync(
            s => s.Kind == ActivityKind.Server && s.TraceId == traceId,
            s => $"{s.DisplayName} {{{string.Join(", ", s.TagObjects.Select(t => t.Key))}}}",
            "the server span of POST /api/session");

        Assert.Equal("POST api/session", span.DisplayName);
        Assert.Equal(["http.request.method", "http.response.status_code", "http.route"], span.TagObjects.Select(t => t.Key).Order(StringComparer.Ordinal));
        var recorded = span.TagObjects.Select(t => $"{t.Value}").Append(span.DisplayName).Append(span.StatusDescription ?? string.Empty)
            .Concat(span.Events.Select(e => e.Name))
            .Concat(factory.Logs.Snapshot().Select(log => string.Join(" | ", [log.CategoryName, log.FormattedMessage, log.Body, .. (log.Attributes ?? []).Select(a => $"{a.Key}={a.Value}")])))
            .ToArray();
        foreach (var personal in Personal)
        {
            Assert.DoesNotContain(recorded, value => value.Contains(personal, StringComparison.OrdinalIgnoreCase));
        }
    }
}
