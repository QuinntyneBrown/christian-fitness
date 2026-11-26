using System.Diagnostics;
using System.Net;
using System.Net.Http.Json;
using ChristianFitness.Api.Tests.Google;
using ChristianFitness.Api.Tests.Telemetry;
using ChristianFitness.Domain.Members;

namespace ChristianFitness.Api.Tests.Admin;

/// <summary>
/// L2-049 AC8, L2-033 AC2 and L2-040 AC1 (ADR 0100): finishing staff Google sign-in, signed in or
/// refused, leaves no email, Google subject or cookie in any span or log; the span records the
/// route template, the method and the status only.
/// </summary>
public sealed class StaffGoogleSignInTelemetryTests(TelemetryTests.Factory factory) : IClassFixture<TelemetryTests.Factory>
{
    [Theory]
    [InlineData("staff of the domain", "christian.fitness", HttpStatusCode.OK)]
    [InlineData("an account outside the domain", "other.org", HttpStatusCode.Forbidden)]
    public async Task Given_a_staff_Google_finish_When_it_is_answered_Then_nothing_personal_or_secret_is_recorded(string why, string hostedDomain, HttpStatusCode status)
    {
        Assert.NotNull(why);
        using var client = Browser.CreateClient(factory);
        var email = $"dana.telemetry.{hostedDomain.Replace('.', '-')}@example.org";
        await Staff.CreateAsync(factory, client, email, StaffRoleName.Admin);
        var google = Staff.WorkspaceAccount(email);
        google = new GoogleAccount { Subject = google.Subject, Email = email, HostedDomain = hostedDomain };
        var external = await GoogleSignIn.ExternalCookieAsync(client, factory.Google, GoogleApp.Staff, google);
        var traceId = ActivityTraceId.CreateRandom();
        using var request = new HttpRequestMessage(HttpMethod.Post, new Uri(Staff.GoogleFinishPath, UriKind.Relative))
        {
            Content = JsonContent.Create(new { }),
        };
        request.Headers.Add("Cookie", external);
        request.Headers.Add("traceparent", $"00-{traceId}-{ActivitySpanId.CreateRandom()}-01");

        using var response = await client.SendAsync(request, TestContext.Current.CancellationToken);
        Assert.Equal(status, response.StatusCode);

        // The span ends after the response is written: await it, never sleep.
        var span = await factory.Spans.WaitForAsync(
            s => s.Kind == ActivityKind.Server && s.TraceId == traceId,
            s => $"{s.DisplayName} {{{string.Join(", ", s.TagObjects.Select(t => t.Key))}}}",
            "the server span of POST /api/admin/session/google");

        Assert.Equal("POST api/admin/session/google", span.DisplayName);
        Assert.Equal(["http.request.method", "http.response.status_code", "http.route"], span.TagObjects.Select(t => t.Key).Order(StringComparer.Ordinal));
        var cookieValue = external.Split('=', 2)[1];
        var secrets = new List<string> { cookieValue, google.Subject, "dana.telemetry" };
        if (status == HttpStatusCode.OK)
        {
            secrets.Add(Staff.Cookie(response).Split('=', 2)[1]);
        }

        foreach (var secret in secrets)
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
