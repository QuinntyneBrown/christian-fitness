using System.Diagnostics;
using System.Net;
using ChristianFitness.Api.Tests.Account;
using ChristianFitness.Api.Tests.Profiles;
using ChristianFitness.Api.Tests.Telemetry;
using ChristianFitness.Domain.Directory;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.DirectoryListings;

/// <summary>
/// L2-078 AC11 and L2-033 (journey 19; ADR 0091): reading, publishing or declining a claim link
/// records the route template, the method and the status only. No span or log carries the link's
/// token, the listing's name or the claimer's email.
/// </summary>
public sealed class ClaimTelemetryTests(TelemetryTests.Factory factory) : IClassFixture<TelemetryTests.Factory>
{
    [Theory]
    [InlineData("GET", "", "GET api/claims/{token}")]
    [InlineData("POST", "/publish", "POST api/claims/{token}/publish")]
    [InlineData("POST", "/decline", "POST api/claims/{token}/decline")]
    public async Task Given_a_member_answers_a_claim_link_When_the_request_is_traced_and_logged_Then_neither_the_token_nor_a_personal_detail_is_recorded(
        string method, string action, string route)
    {
        var token = await IssueAsync();
        var email = $"claimer.telemetry.{action.TrimStart('/')}x@example.org";
        using var client = Browser.CreateClient(factory);
        var cookie = await OwnProfileTests.JoinedAsync(client, JoinTests.Details(email));
        var traceId = ActivityTraceId.CreateRandom();
        using var request = new HttpRequestMessage(new HttpMethod(method), new Uri(ClaimLinks.PathOf(token) + action, UriKind.Relative));
        request.Headers.Add("Cookie", cookie);
        request.Headers.Add("traceparent", $"00-{traceId}-{ActivitySpanId.CreateRandom()}-01");

        using var response = await client.SendAsync(request, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var span = await factory.Spans.WaitForAsync(
            s => s.Kind == ActivityKind.Server && s.TraceId == traceId,
            s => $"{s.DisplayName} {{{string.Join(", ", s.TagObjects.Select(t => t.Key))}}}",
            $"the server span of {route}");

        Assert.Equal(route, span.DisplayName);
        Assert.Equal(["http.request.method", "http.response.status_code", "http.route"], span.TagObjects.Select(t => t.Key).Order(StringComparer.Ordinal));
        var recorded = span.TagObjects.Select(t => $"{t.Value}").Append(span.DisplayName).Append(span.StatusDescription ?? string.Empty)
            .Concat(span.Events.Select(e => e.Name))
            .Concat(factory.Logs.Snapshot().Select(log => string.Join(" | ", [log.CategoryName, log.FormattedMessage, log.Body, .. (log.Attributes ?? []).Select(a => $"{a.Key}={a.Value}")])))
            .ToArray();
        foreach (var personal in new[] { token, "Telemetry Ladies Who Lift", email })
        {
            Assert.DoesNotContain(recorded, value => value.Contains(personal, StringComparison.OrdinalIgnoreCase));
        }
    }

    /// <summary>A draft listing with a claim issued now, as approval makes one: the link's token.</summary>
    private async Task<string> IssueAsync()
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var now = scope.ServiceProvider.GetRequiredService<TimeProvider>().GetUtcNow();
        var listing = DirectoryListing.CreateDraft(Guid.CreateVersion7(now), ListingKind.Organization, "Telemetry Ladies Who Lift", string.Empty, "East York", [], now);
        var (claim, token) = ListingClaim.Issue(listing.Id, now);
        db.DirectoryListings.Add(listing);
        db.ListingClaims.Add(claim);
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        return token;
    }
}
