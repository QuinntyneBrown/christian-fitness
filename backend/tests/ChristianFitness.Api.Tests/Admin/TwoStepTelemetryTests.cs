using System.Diagnostics;
using System.Net;
using System.Net.Http.Json;
using ChristianFitness.Api.Tests.Telemetry;
using ChristianFitness.Domain.Members;

namespace ChristianFitness.Api.Tests.Admin;

/// <summary>
/// L2-046 AC8, L2-033 AC2 and L2-040 AC1: a second step, right or wrong, leaves no code, secret or
/// step cookie in any span or log; the span records the route template, the method and the status
/// only.
/// </summary>
public sealed class TwoStepTelemetryTests(TelemetryTests.Factory factory) : IClassFixture<TelemetryTests.Factory>
{
    [Theory]
    [InlineData("the right code", true, HttpStatusCode.OK)]
    [InlineData("a wrong code", false, HttpStatusCode.Unauthorized)]
    public async Task Given_a_pending_sign_in_When_a_code_is_checked_Then_nothing_secret_is_recorded(string why, bool right, HttpStatusCode status)
    {
        Assert.NotNull(why);
        using var client = Browser.CreateClient(factory);
        var email = $"dana.telemetry.{(right ? "right" : "wrong")}@example.org";
        await Staff.CreateAsync(factory, client, email, StaffRoleName.Admin);
        using var passwordStep = await Staff.SignInAsync(client, email, Staff.Password);
        var cookie = Staff.StepCookie(passwordStep);
        var rightCode = Staff.CodeAt(DateTimeOffset.UtcNow);
        // A wrong code still has 6 digits, so it is as findable in a log as a right one.
        var code = right ? rightCode : rightCode == "999999" ? "999998" : "999999";
        var traceId = ActivityTraceId.CreateRandom();
        using var request = new HttpRequestMessage(HttpMethod.Post, new Uri("/api/admin/session/two-step", UriKind.Relative))
        {
            Content = JsonContent.Create(new { code }),
        };
        request.Headers.Add("Cookie", cookie);
        request.Headers.Add("traceparent", $"00-{traceId}-{ActivitySpanId.CreateRandom()}-01");

        using var response = await client.SendAsync(request, TestContext.Current.CancellationToken);
        Assert.Equal(status, response.StatusCode);

        // The span ends after the response is written: await it, never sleep.
        var span = await factory.Spans.WaitForAsync(
            s => s.Kind == ActivityKind.Server && s.TraceId == traceId,
            s => $"{s.DisplayName} {{{string.Join(", ", s.TagObjects.Select(t => t.Key))}}}",
            "the server span of POST /api/admin/session/two-step");

        Assert.Equal("POST api/admin/session/two-step", span.DisplayName);
        Assert.Equal(["http.request.method", "http.response.status_code", "http.route"], span.TagObjects.Select(t => t.Key).Order(StringComparer.Ordinal));
        var token = cookie.Split('=', 2)[1];
        foreach (var secret in new[] { code, token, Totp.Base32Of(Staff.Secret), "christian-fitness-20", "cf-admin-step", "dana.telemetry" })
        {
            AssertNotRecorded(secret);
        }
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
