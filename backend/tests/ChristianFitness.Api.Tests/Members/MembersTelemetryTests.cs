using System.Diagnostics;
using System.Net;
using ChristianFitness.Api.Tests.Admin;
using ChristianFitness.Api.Tests.Telemetry;
using ChristianFitness.Domain.Members;

namespace ChristianFitness.Api.Tests.Members;

/// <summary>
/// L2-033 AC2 and L2-040 AC1 (ADR 0022): searching members leaves no search term, name, email or
/// home church in any span or log; the span records the route template, the method and the status
/// only.
/// </summary>
public sealed class MembersTelemetryTests(TelemetryTests.Factory factory) : IClassFixture<TelemetryTests.Factory>
{
    private static readonly string[] Personal = ["thompson", "Grace", "Fellowship", "Scarborough", "members.telemetry", "example.org"];

    [Fact]
    public async Task Given_staff_search_members_When_the_request_is_traced_and_logged_Then_nothing_personal_is_recorded()
    {
        using var client = Browser.CreateClient(factory);
        await Staff.CreateAsync(factory, client, "dana.members.telemetry@example.org", StaffRoleName.Moderator);
        using var signedIn = await Staff.SignInWithCodeAsync(client, "dana.members.telemetry@example.org");
        var traceId = ActivityTraceId.CreateRandom();
        using var request = new HttpRequestMessage(HttpMethod.Get, new Uri("/api/admin/members?q=thompson&status=active", UriKind.Relative));
        request.Headers.Add("Cookie", Staff.Cookie(signedIn));
        request.Headers.Add("traceparent", $"00-{traceId}-{ActivitySpanId.CreateRandom()}-01");

        using var response = await client.SendAsync(request, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        // The answer does carry them: the test is about what is recorded, not what is shown.
        Assert.Contains("Grace Fellowship, Scarborough", body, StringComparison.Ordinal);
        Assert.Contains("dana.members.telemetry@example.org", body, StringComparison.Ordinal);

        // The span ends after the response is written: await it, never sleep.
        var span = await factory.Spans.WaitForAsync(
            s => s.Kind == ActivityKind.Server && s.TraceId == traceId,
            s => $"{s.DisplayName} {{{string.Join(", ", s.TagObjects.Select(t => t.Key))}}}",
            "the server span of GET /api/admin/members");

        Assert.Equal("GET api/admin/members", span.DisplayName);
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

    // L2-029 (ADR 0023): the note is staff's words about a person; it is stored and shown, never recorded.
    [Fact]
    public async Task Given_staff_suspend_a_member_with_a_note_When_the_request_is_traced_and_logged_Then_the_note_is_not_recorded()
    {
        using var client = Browser.CreateClient(factory);
        var target = await Staff.CreateAsync(factory, client, "kevin.note.telemetry@example.org", role: null);
        await Staff.CreateAsync(factory, client, "dana.note.telemetry@example.org", StaffRoleName.Admin);
        using var signedIn = await Staff.SignInWithCodeAsync(client, "dana.note.telemetry@example.org");
        var traceId = ActivityTraceId.CreateRandom();
        using var request = new HttpRequestMessage(HttpMethod.Post, new Uri($"/api/admin/members/{target}/suspend", UriKind.Relative))
        {
            Content = System.Net.Http.Json.JsonContent.Create(new { note = "Seen pressuring newcomers for money", confirmed = true }),
        };
        request.Headers.Add("Cookie", Staff.Cookie(signedIn));
        request.Headers.Add("traceparent", $"00-{traceId}-{ActivitySpanId.CreateRandom()}-01");

        using var response = await client.SendAsync(request, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("pressuring", await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken), StringComparison.Ordinal);

        var span = await factory.Spans.WaitForAsync(
            s => s.Kind == ActivityKind.Server && s.TraceId == traceId,
            s => $"{s.DisplayName} {{{string.Join(", ", s.TagObjects.Select(t => t.Key))}}}",
            "the server span of POST /api/admin/members/{id}/suspend");

        Assert.Equal("POST api/admin/members/{id:guid}/suspend", span.DisplayName);
        Assert.Equal(["http.request.method", "http.response.status_code", "http.route"], span.TagObjects.Select(t => t.Key).Order(StringComparer.Ordinal));
        var recorded = span.TagObjects.Select(t => $"{t.Value}").Append(span.DisplayName).Append(span.StatusDescription ?? string.Empty)
            .Concat(span.Events.Select(e => e.Name))
            .Concat(factory.Logs.Snapshot().Select(log => string.Join(" | ", [log.CategoryName, log.FormattedMessage, log.Body, .. (log.Attributes ?? []).Select(a => $"{a.Key}={a.Value}")])))
            .ToArray();
        foreach (var personal in new[] { "pressuring", "newcomers", "kevin.note", target })
        {
            Assert.DoesNotContain(recorded, value => value.Contains(personal, StringComparison.OrdinalIgnoreCase));
        }
    }
}
