using System.Diagnostics;
using System.Net;
using System.Net.Http.Json;
using ChristianFitness.Api.Tests.Telemetry;

namespace ChristianFitness.Api.Tests.Account;

/// <summary>
/// L2-033 AC2 and L2-040 AC1: joining leaves no name, email, password, home church or body in any
/// span or log; the span records the route template, the method and the status only.
/// </summary>
public sealed class JoinTelemetryTests(TelemetryTests.Factory factory) : IClassFixture<TelemetryTests.Factory>
{
    private static readonly string[] Personal = ["Grace", "Thompson", "grace.telemetry", "example.org", "abundantlife", "Fellowship", "Scarborough"];

    [Fact]
    public Task Given_a_visitor_joins_When_the_request_is_traced_and_logged_Then_nothing_personal_is_recorded() =>
        AssertNothingPersonalAsync(JoinTests.Details("grace.telemetry@example.org"), HttpStatusCode.Created);

    // L2-033 AC2 for the refusals of slice 2.2: a refused body is not repeated in a span or a log.
    [Fact]
    public Task Given_an_invalid_join_When_it_is_refused_Then_nothing_personal_is_recorded() =>
        AssertNothingPersonalAsync(JoinTests.Details("grace.telemetry@example") with { HomeChurch = "Grace Fellowship, Scarborough " + new string('x', 120) }, HttpStatusCode.BadRequest);

    [Fact]
    public async Task Given_a_taken_email_When_the_join_is_refused_Then_nothing_personal_is_recorded()
    {
        using var client = Browser.CreateClient(factory);
        using var first = await client.PostAsJsonAsync(new Uri("/api/account/join", UriKind.Relative), JoinTests.Details("grace.telemetry.taken@example.org"), TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Created, first.StatusCode);

        await AssertNothingPersonalAsync(JoinTests.Details("grace.telemetry.taken@example.org"), HttpStatusCode.Conflict);
    }

    private async Task AssertNothingPersonalAsync(JoinTests.JoinBody body, HttpStatusCode status)
    {
        var traceId = ActivityTraceId.CreateRandom();
        using var client = Browser.CreateClient(factory);
        using var request = new HttpRequestMessage(HttpMethod.Post, new Uri("/api/account/join", UriKind.Relative))
        {
            Content = JsonContent.Create(body),
        };
        request.Headers.Add("traceparent", $"00-{traceId}-{ActivitySpanId.CreateRandom()}-01");

        using var response = await client.SendAsync(request, TestContext.Current.CancellationToken);
        Assert.Equal(status, response.StatusCode);

        // The span ends after the response is written: await it, never sleep.
        var span = await factory.Spans.WaitForAsync(
            s => s.Kind == ActivityKind.Server && s.TraceId == traceId,
            s => $"{s.DisplayName} {{{string.Join(", ", s.TagObjects.Select(t => t.Key))}}}",
            "the server span of POST /api/account/join");

        Assert.Equal("POST api/account/join", span.DisplayName);
        Assert.Equal(["http.request.method", "http.response.status_code", "http.route"], span.TagObjects.Select(t => t.Key).Order(StringComparer.Ordinal));
        Assert.Equal("api/account/join", span.GetTagItem("http.route"));
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
