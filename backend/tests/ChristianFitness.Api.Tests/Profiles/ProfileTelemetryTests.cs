using System.Diagnostics;
using System.Net;
using ChristianFitness.Api.Tests.Account;
using ChristianFitness.Api.Tests.Telemetry;

namespace ChristianFitness.Api.Tests.Profiles;

/// <summary>
/// L2-033 AC2 and L2-040 AC1: opening a profile leaves no name, home church or other answer in any
/// span or log; the span records the route template, the method and the status only.
/// </summary>
public sealed class ProfileTelemetryTests(TelemetryTests.Factory factory) : IClassFixture<TelemetryTests.Factory>
{
    private static readonly string[] Personal = ["Grace", "Thompson", "Fellowship", "Scarborough"];

    [Fact]
    public async Task Given_a_member_opens_their_profile_When_the_request_is_traced_and_logged_Then_nothing_personal_is_recorded()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await OwnProfileTests.JoinedAsync(client, JoinTests.Details("grace.profile.telemetry@example.org"));
        var traceId = ActivityTraceId.CreateRandom();
        using var request = new HttpRequestMessage(HttpMethod.Get, new Uri("/api/profile/me", UriKind.Relative));
        request.Headers.Add("Cookie", cookie);
        request.Headers.Add("traceparent", $"00-{traceId}-{ActivitySpanId.CreateRandom()}-01");

        using var response = await client.SendAsync(request, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        Assert.Contains("Grace Fellowship, Scarborough", body, StringComparison.Ordinal);

        // The span ends after the response is written: await it, never sleep.
        var span = await factory.Spans.WaitForAsync(
            s => s.Kind == ActivityKind.Server && s.TraceId == traceId,
            s => $"{s.DisplayName} {{{string.Join(", ", s.TagObjects.Select(t => t.Key))}}}",
            "the server span of GET /api/profile/me");

        Assert.Equal("GET api/profile/me", span.DisplayName);
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
