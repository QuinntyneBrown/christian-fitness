using System.Diagnostics;
using System.Net;
using ChristianFitness.Api.Tests.Account;
using ChristianFitness.Api.Tests.Profiles;
using ChristianFitness.Api.Tests.Telemetry;

namespace ChristianFitness.Api.Tests.Events;

/// <summary>
/// L2-040 AC1 (ADR 0027, ADR 0030, ADR 0081): browsing, filtering or searching events leaves no
/// query string, category value, search text or cursor in any span or log; the span records the
/// route template, the method and the status only.
/// </summary>
public sealed class EventsTelemetryTests(TelemetryTests.Factory factory) : IClassFixture<TelemetryTests.Factory>
{
    [Theory]
    [InlineData("category", "workshop", HttpStatusCode.OK)]
    [InlineData("category", "secretcategoryprobe", HttpStatusCode.BadRequest)]
    [InlineData("q", "secretsearchprobe", HttpStatusCode.OK)]
    public async Task Given_a_member_filters_events_When_the_request_is_traced_and_logged_Then_no_query_string_or_value_is_recorded(
        string parameter,
        string value,
        HttpStatusCode expectedStatus)
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await OwnProfileTests.JoinedAsync(client, JoinTests.Details($"grace.events.telemetry.{value}@example.org"));
        var traceId = ActivityTraceId.CreateRandom();
        using var request = new HttpRequestMessage(HttpMethod.Get, new Uri($"/api/events?{parameter}={value}", UriKind.Relative));
        request.Headers.Add("Cookie", cookie);
        request.Headers.Add("traceparent", $"00-{traceId}-{ActivitySpanId.CreateRandom()}-01");

        using var response = await client.SendAsync(request, TestContext.Current.CancellationToken);
        Assert.Equal(expectedStatus, response.StatusCode);

        var span = await factory.Spans.WaitForAsync(
            s => s.Kind == ActivityKind.Server && s.TraceId == traceId,
            s => $"{s.DisplayName} {{{string.Join(", ", s.TagObjects.Select(t => t.Key))}}}",
            "the server span of GET /api/events");

        Assert.Equal("GET api/events", span.DisplayName);
        Assert.Equal(["http.request.method", "http.response.status_code", "http.route"], span.TagObjects.Select(t => t.Key).Order(StringComparer.Ordinal));
        var recorded = span.TagObjects.Select(t => $"{t.Value}").Append(span.DisplayName).Append(span.StatusDescription ?? string.Empty)
            .Concat(span.Events.Select(e => e.Name))
            .Concat(factory.Logs.Snapshot().Select(log => string.Join(" | ", [log.CategoryName, log.FormattedMessage, log.Body, .. (log.Attributes ?? []).Select(a => $"{a.Key}={a.Value}")])))
            .ToArray();
        foreach (var forbidden in new[] { $"{parameter}=", value })
        {
            Assert.DoesNotContain(recorded, text => text.Contains(forbidden, StringComparison.OrdinalIgnoreCase));
        }
    }
}
