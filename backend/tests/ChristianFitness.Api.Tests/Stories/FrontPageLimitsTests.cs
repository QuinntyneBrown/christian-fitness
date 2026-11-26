using System.Diagnostics;
using System.Net;
using System.Text;
using ChristianFitness.Api.Tests.Telemetry;

namespace ChristianFitness.Api.Tests.Stories;

/// <summary>
/// L2-034 AC4 (journey 25; ADR 0072, ADR 0105): the front page is a public read, so an address
/// without a session reads it 120 times a minute and the next read is refused with 429
/// <c>too_many_requests</c> and <c>Retry-After</c>.
/// </summary>
public sealed class FrontPageRateLimitTests(StoriesFactory factory) : IClassFixture<StoriesFactory>
{
    [Fact]
    public async Task Given_120_reads_of_the_front_page_from_one_address_When_it_reads_again_Then_it_is_refused_with_too_many_requests_and_Retry_After()
    {
        using var client = Browser.CreateClient(factory);
        client.DefaultRequestHeaders.Add(ApiFactory.ClientAddressHeader, "203.0.113.171");
        for (var n = 0; n < 120; n++)
        {
            using var answered = await Browser.SendAsync(client, HttpMethod.Get, FrontPage.Path, cookie: null);
            Assert.Equal(HttpStatusCode.OK, answered.StatusCode);
        }

        using var refused = await Browser.SendAsync(client, HttpMethod.Get, $"{FrontPage.Path}?section=events", cookie: null);

        Assert.Equal(HttpStatusCode.TooManyRequests, refused.StatusCode);
        Assert.Equal("too_many_requests", (await AdminStories.JsonAsync(refused)).GetProperty("code").GetString());
        Assert.InRange(int.Parse(Assert.Single(refused.Headers.GetValues("Retry-After")), System.Globalization.CultureInfo.InvariantCulture), 1, 60);
    }
}

/// <summary>
/// L2-001 AC10 and L2-033 (journey 25; ADR 0105): a read of the front page is recorded as its route
/// template, method and status only. No span or log carries the section or the cursor it was asked
/// with, whether it is answered or refused.
/// </summary>
public sealed class FrontPageTelemetryTests(TelemetryTests.Factory factory) : IClassFixture<TelemetryTests.Factory>
{
    private static readonly string Cursor = Convert.ToBase64String(Encoding.UTF8.GetBytes("639118755000000000|0190c0de00007000800000000000002a|12|")).TrimEnd('=');

    [Theory]
    [InlineData("faith-body", HttpStatusCode.OK)]
    [InlineData("zumba-secret", HttpStatusCode.BadRequest)]
    public async Task Given_a_section_and_a_cursor_When_the_read_is_traced_and_logged_Then_only_the_route_template_method_and_status_are_recorded(string section, HttpStatusCode status)
    {
        using var client = Browser.CreateClient(factory);
        var traceId = ActivityTraceId.CreateRandom();
        using var request = new HttpRequestMessage(HttpMethod.Get, new Uri($"{FrontPage.Path}?section={section}&cursor={Cursor}", UriKind.Relative));
        request.Headers.Add("traceparent", $"00-{traceId}-{ActivitySpanId.CreateRandom()}-01");

        using var response = await client.SendAsync(request, TestContext.Current.CancellationToken);
        Assert.Equal(status, response.StatusCode);

        var span = await factory.Spans.WaitForAsync(
            s => s.Kind == ActivityKind.Server && s.TraceId == traceId,
            s => $"{s.DisplayName} {{{string.Join(", ", s.TagObjects.Select(t => t.Key))}}}",
            "the server span of GET api/public/stories");

        Assert.Equal("GET api/public/stories", span.DisplayName);
        Assert.Equal(["http.request.method", "http.response.status_code", "http.route"], span.TagObjects.Select(t => t.Key).Order(StringComparer.Ordinal));
        var recorded = span.TagObjects.Select(t => $"{t.Value}").Append(span.DisplayName).Append(span.StatusDescription ?? string.Empty)
            .Concat(span.Events.Select(e => e.Name))
            .Concat(factory.Logs.Snapshot().Select(log => string.Join(" | ", [log.CategoryName, log.FormattedMessage, log.Body, .. (log.Attributes ?? []).Select(a => $"{a.Key}={a.Value}")])))
            .ToArray();
        foreach (var asked in new[] { section, Cursor, "section=", "cursor=" })
        {
            Assert.DoesNotContain(recorded, value => value.Contains(asked, StringComparison.OrdinalIgnoreCase));
        }
    }
}
