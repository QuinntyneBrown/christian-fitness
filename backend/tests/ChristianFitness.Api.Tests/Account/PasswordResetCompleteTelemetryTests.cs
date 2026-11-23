using System.Diagnostics;
using System.Net;
using System.Net.Http.Json;
using ChristianFitness.Api.Tests.Telemetry;
using static ChristianFitness.Api.Tests.Account.PasswordResetCompleteTests;

namespace ChristianFitness.Api.Tests.Account;

/// <summary>
/// L2-045 AC8, L2-033 AC2 and L2-040 AC1: checking a link and saving a new password, accepted or
/// refused, leave no token, password or email in any span or log; each span records the route
/// template, the method and the status only.
/// </summary>
public sealed class PasswordResetCompleteTelemetryTests(TelemetryTests.Factory factory) : IClassFixture<TelemetryTests.Factory>
{
    private const string Email = "grace.telemetry.complete@example.org";

    [Fact]
    public async Task Given_a_usable_link_When_it_is_checked_and_a_password_saved_Then_nothing_personal_is_recorded()
    {
        using var client = Browser.CreateClient(factory);
        var token = await LinkForAsync(factory, client, Email);

        await SendTracedAsync(client, "check", new { token }, HttpStatusCode.OK);
        await SendTracedAsync(client, "complete", new { token, password = NewPassword }, HttpStatusCode.NoContent);
        await SendTracedAsync(client, "complete", new { token, password = "anotherpassword" }, HttpStatusCode.Gone);
        await SendTracedAsync(client, "complete", new { token, password = "short" }, HttpStatusCode.BadRequest);

        foreach (var personal in new[] { token, NewPassword, "anotherpassword", "grace.telemetry", "example.org" })
        {
            AssertNotRecorded(personal);
        }
    }

    private async Task SendTracedAsync(HttpClient client, string action, object body, HttpStatusCode status)
    {
        var traceId = ActivityTraceId.CreateRandom();
        using var request = new HttpRequestMessage(HttpMethod.Post, new Uri($"/api/account/password-reset/{action}", UriKind.Relative))
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
            $"the server span of POST /api/account/password-reset/{action}");

        Assert.Equal($"POST api/account/password-reset/{action}", span.DisplayName);
        Assert.Equal(["http.request.method", "http.response.status_code", "http.route"], span.TagObjects.Select(t => t.Key).Order(StringComparer.Ordinal));
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
