using System.Diagnostics;
using System.Net;
using ChristianFitness.Api.Tests.Account;
using ChristianFitness.Api.Tests.Admin;
using ChristianFitness.Api.Tests.Profiles;
using ChristianFitness.Api.Tests.Telemetry;
using ChristianFitness.Domain.Events;
using ChristianFitness.Domain.Members;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Chat;

/// <summary>
/// L2-017 and L2-033 (ADR 0000): reporting a message leaves neither the reason, the reported text nor a
/// name or email in any span or log; the span records the route template, the method and the status
/// only. A refused report records none of them either.
/// </summary>
public sealed class ReportMessageTelemetryTests(TelemetryTests.Factory factory) : IClassFixture<TelemetryTests.Factory>
{
    private static readonly string[] Personal = ["pressuring", "newcomers", "Quiet words", "reporter.telemetry", "sender.telemetry", "Brooks", "Thompson"];

    [Theory]
    [InlineData(false, HttpStatusCode.Created)]
    [InlineData(true, HttpStatusCode.Forbidden)]
    public async Task Given_a_member_reports_a_message_When_the_request_is_traced_and_logged_Then_the_reason_and_the_text_are_not_recorded(bool ownMessage, HttpStatusCode expected)
    {
        using var client = Browser.CreateClient(factory);
        var reporter = await OwnProfileTests.JoinedAsync(client, JoinTests.Details($"reporter.telemetry{ownMessage}@example.org") with { FullName = "Grace Thompson" });
        _ = await OwnProfileTests.JoinedAsync(client, JoinTests.Details($"sender.telemetry{ownMessage}@example.org") with { FullName = "Kevin Brooks" });
        Guid messageId;
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var ids = await db.Members.Where(m => m.NormalizedEmail.EndsWith($"{ownMessage}@example.org".ToLowerInvariant(), StringComparison.Ordinal))
                .ToDictionaryAsync(m => m.Name, m => m.Id, TestContext.Current.CancellationToken);
            var message = DirectMessage.Of(ownMessage ? ids["Grace Thompson"] : ids["Kevin Brooks"], ownMessage ? ids["Kevin Brooks"] : ids["Grace Thompson"], "Quiet words", DateTimeOffset.UtcNow);
            db.DirectMessages.Add(message);
            await db.SaveChangesAsync(TestContext.Current.CancellationToken);
            messageId = message.Id;
        }

        var traceId = ActivityTraceId.CreateRandom();
        using var request = new HttpRequestMessage(HttpMethod.Post, new Uri($"/api/messages/{messageId}/reports", UriKind.Relative))
        {
            Content = System.Net.Http.Json.JsonContent.Create(new { reason = "Pressuring newcomers for money" }),
        };
        request.Headers.Add("Cookie", reporter);
        request.Headers.Add("traceparent", $"00-{traceId}-{ActivitySpanId.CreateRandom()}-01");

        using var response = await client.SendAsync(request, TestContext.Current.CancellationToken);
        Assert.Equal(expected, response.StatusCode);

        var span = await factory.Spans.WaitForAsync(
            s => s.Kind == ActivityKind.Server && s.TraceId == traceId,
            s => $"{s.DisplayName} {{{string.Join(", ", s.TagObjects.Select(t => t.Key))}}}",
            "the server span of POST /api/messages/{id}/reports");

        Assert.Equal("POST api/messages/{id:guid}/reports", span.DisplayName);
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
