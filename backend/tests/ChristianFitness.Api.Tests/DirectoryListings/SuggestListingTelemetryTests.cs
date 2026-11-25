using System.Diagnostics;
using System.Net;
using System.Net.Http.Json;
using ChristianFitness.Api.Tests.Account;
using ChristianFitness.Api.Tests.Profiles;
using ChristianFitness.Api.Tests.Telemetry;

namespace ChristianFitness.Api.Tests.DirectoryListings;

/// <summary>
/// L2-062 AC10 and L2-033 (ADR 0086): suggesting a listing leaves neither the suggested person's
/// email, their name, the reason nor the church connection in any span or log; the span records the
/// route template, the method and the status only. A refused suggestion records none of them either.
/// </summary>
public sealed class SuggestListingTelemetryTests(TelemetryTests.Factory factory) : IClassFixture<TelemetryTests.Factory>
{
    private static readonly string[] Personal = ["lead@eastside", "eastside", "Ladies Who Lift", "Saturday strength", "Danforth Baptist", "suggester.telemetry"];

    [Theory]
    [InlineData("someone-i-know", "instagram.com/eastsideladieslift", HttpStatusCode.Created)]
    [InlineData("someone-i-know", "http://eastside.example", HttpStatusCode.BadRequest)]
    public async Task Given_a_member_suggests_a_listing_When_the_request_is_traced_and_logged_Then_no_personal_detail_is_recorded(
        string relation, string website, HttpStatusCode expected)
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await OwnProfileTests.JoinedAsync(client, JoinTests.Details($"suggester.telemetry.{expected:D}@example.org"));
        var traceId = ActivityTraceId.CreateRandom();
        using var request = new HttpRequestMessage(HttpMethod.Post, new Uri(SuggestListingTests.Path, UriKind.Relative))
        {
            Content = JsonContent.Create(new
            {
                relation,
                kind = "organization",
                name = "Eastside Ladies Who Lift",
                where = "Danforth & Pape, Toronto",
                website,
                churchConnection = "Meets at Danforth Baptist",
                reason = "Saturday strength group for women.",
                email = "lead@eastside.example",
                mayTellWhoSuggested = true,
            }),
        };
        request.Headers.Add("Cookie", cookie);
        request.Headers.Add("traceparent", $"00-{traceId}-{ActivitySpanId.CreateRandom()}-01");

        using var response = await client.SendAsync(request, TestContext.Current.CancellationToken);
        Assert.Equal(expected, response.StatusCode);

        var span = await factory.Spans.WaitForAsync(
            s => s.Kind == ActivityKind.Server && s.TraceId == traceId,
            s => $"{s.DisplayName} {{{string.Join(", ", s.TagObjects.Select(t => t.Key))}}}",
            "the server span of POST /api/directory/suggestions");

        Assert.Equal("POST api/directory/suggestions", span.DisplayName);
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
