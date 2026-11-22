using System.Diagnostics;
using System.Net;
using System.Net.Http.Json;
using ChristianFitness.Api.Tests.Sessions;
using ChristianFitness.Api.Tests.Telemetry;

namespace ChristianFitness.Api.Tests.Account;

/// <summary>
/// L2-044 AC8, L2-033 AC2 and L2-040 AC1: a reset request, for a registered email or not, leaves no
/// email, token or link in any span or log; the span records the route template, the method and the
/// status only.
/// </summary>
public sealed class PasswordResetTelemetryTests(TelemetryTests.Factory factory) : IClassFixture<TelemetryTests.Factory>
{
    private const string Email = "grace.telemetry.reset@example.org";

    [Fact]
    public async Task Given_a_registered_email_When_a_link_is_requested_Then_nothing_personal_is_recorded()
    {
        using var client = Browser.CreateClient(factory);
        await SignInTests.JoinAsync(client, Email);
        var before = factory.Emails.Sent().Count;

        await AssertNothingPersonalAsync(client, Email, HttpStatusCode.Accepted);

        var token = PasswordResetRequestTests.TokenOf(Assert.Single(factory.Emails.Sent().Skip(before)).Text);
        Assert.NotEmpty(token);
        AssertNotRecorded(token);
    }

    [Fact]
    public async Task Given_an_unknown_email_When_a_link_is_requested_Then_nothing_personal_is_recorded()
    {
        using var client = Browser.CreateClient(factory);

        await AssertNothingPersonalAsync(client, "nobody.telemetry@example.org", HttpStatusCode.Accepted);
    }

    [Fact]
    public async Task Given_a_malformed_email_When_it_is_refused_Then_nothing_personal_is_recorded()
    {
        using var client = Browser.CreateClient(factory);

        await AssertNothingPersonalAsync(client, "grace.telemetry.malformed@example", HttpStatusCode.BadRequest);
    }

    private async Task AssertNothingPersonalAsync(HttpClient client, string email, HttpStatusCode status)
    {
        var traceId = ActivityTraceId.CreateRandom();
        using var request = new HttpRequestMessage(HttpMethod.Post, new Uri("/api/account/password-reset", UriKind.Relative))
        {
            Content = JsonContent.Create(new { email }),
        };
        request.Headers.Add("traceparent", $"00-{traceId}-{ActivitySpanId.CreateRandom()}-01");

        using var response = await client.SendAsync(request, TestContext.Current.CancellationToken);
        Assert.Equal(status, response.StatusCode);

        // The span ends after the response is written: await it, never sleep.
        var span = await factory.Spans.WaitForAsync(
            s => s.Kind == ActivityKind.Server && s.TraceId == traceId,
            s => $"{s.DisplayName} {{{string.Join(", ", s.TagObjects.Select(t => t.Key))}}}",
            "the server span of POST /api/account/password-reset");

        Assert.Equal("POST api/account/password-reset", span.DisplayName);
        Assert.Equal(["http.request.method", "http.response.status_code", "http.route"], span.TagObjects.Select(t => t.Key).Order(StringComparer.Ordinal));
        foreach (var personal in new[] { "grace.telemetry", "nobody.telemetry", "example.org", "reset-password", "token=" })
        {
            AssertNotRecorded(personal, span);
        }
    }

    private void AssertNotRecorded(string value, Activity? span = null)
    {
        var spans = span is null ? factory.Spans.Snapshot() : [span];
        var recorded = spans
            .SelectMany(s => s.TagObjects.Select(t => $"{t.Value}").Append(s.DisplayName).Append(s.StatusDescription ?? string.Empty).Concat(s.Events.Select(e => e.Name)))
            .Concat(factory.Logs.Snapshot().Select(log => string.Join(" | ", [log.CategoryName, log.FormattedMessage, log.Body, .. (log.Attributes ?? []).Select(a => $"{a.Key}={a.Value}")])))
            .ToArray();
        Assert.DoesNotContain(recorded, recordedValue => recordedValue.Contains(value, StringComparison.OrdinalIgnoreCase));
    }
}
