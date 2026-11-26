using System.Diagnostics;
using System.Net;
using ChristianFitness.Api.Tests.Account;
using ChristianFitness.Api.Tests.Profiles;
using ChristianFitness.Api.Tests.Telemetry;

namespace ChristianFitness.Api.Tests.Feedback;

/// <summary>
/// L2-063 AC10 and L2-033 (ADR 0109): sending feedback, and opening the form, leave neither the
/// note's text, the page's label, the screenshot's name nor the member's address in any span or
/// log; the span records the route template, the method and the status only. A refused note
/// records none of them either.
/// </summary>
public sealed class SendFeedbackTelemetryTests(TelemetryTests.Factory factory) : IClassFixture<TelemetryTests.Factory>
{
    private static readonly string[] Personal = ["blank page on my phone", "Suggest a listing", "calendar-bug", "feedback.telemetry"];

    [Theory]
    [InlineData("problem", HttpStatusCode.NoContent)]
    [InlineData("nonsense", HttpStatusCode.BadRequest)]
    public async Task Given_a_member_sends_feedback_When_the_request_is_traced_and_logged_Then_no_personal_detail_is_recorded(string kind, HttpStatusCode expected)
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await OwnProfileTests.JoinedAsync(client, JoinTests.Details($"feedback.telemetry.{expected:D}@example.org"));

        var form = await TracedAsync(client, cookie, HttpMethod.Get, "/api/feedback/form?about=page:directory/suggest", null);
        Assert.Equal(HttpStatusCode.OK, form.Status);
        AssertClean(form.Span, form.Recorded, "GET api/feedback/form");

        using var body = new MultipartFormDataContent
        {
            { new StringContent(kind), "kind" },
            { new StringContent("The Add to calendar button opens a blank page on my phone."), "text" },
            { new StringContent("page:directory/suggest"), "about" },
            { new StringContent("true"), "mayEmail" },
        };
        var png = new ByteArrayContent([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0]);
        png.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("image/png");
        body.Add(png, "screenshot", "calendar-bug.png");
        var sent = await TracedAsync(client, cookie, HttpMethod.Post, "/api/feedback", body);
        Assert.Equal(expected, sent.Status);
        AssertClean(sent.Span, sent.Recorded, "POST api/feedback");
    }

    private async Task<(HttpStatusCode Status, Activity Span, string[] Recorded)> TracedAsync(HttpClient client, string cookie, HttpMethod method, string path, HttpContent? content)
    {
        var traceId = ActivityTraceId.CreateRandom();
        using var request = new HttpRequestMessage(method, new Uri(path, UriKind.Relative)) { Content = content };
        request.Headers.Add("Cookie", cookie);
        request.Headers.Add("traceparent", $"00-{traceId}-{ActivitySpanId.CreateRandom()}-01");
        using var response = await client.SendAsync(request, TestContext.Current.CancellationToken);
        var span = await factory.Spans.WaitForAsync(
            s => s.Kind == ActivityKind.Server && s.TraceId == traceId,
            s => $"{s.DisplayName} {{{string.Join(", ", s.TagObjects.Select(t => t.Key))}}}",
            $"the server span of {method} {path}");
        var recorded = span.TagObjects.Select(t => $"{t.Value}").Append(span.DisplayName).Append(span.StatusDescription ?? string.Empty)
            .Concat(span.Events.Select(e => e.Name))
            .Concat(factory.Logs.Snapshot().Select(log => string.Join(" | ", [log.CategoryName, log.FormattedMessage, log.Body, .. (log.Attributes ?? []).Select(a => $"{a.Key}={a.Value}")])))
            .ToArray();
        return (response.StatusCode, span, recorded);
    }

    private static void AssertClean(Activity span, string[] recorded, string name)
    {
        Assert.Equal(name, span.DisplayName);
        Assert.Equal(["http.request.method", "http.response.status_code", "http.route"], span.TagObjects.Select(t => t.Key).Order(StringComparer.Ordinal));
        foreach (var personal in Personal)
        {
            Assert.DoesNotContain(recorded, value => value.Contains(personal, StringComparison.OrdinalIgnoreCase));
        }
    }
}
