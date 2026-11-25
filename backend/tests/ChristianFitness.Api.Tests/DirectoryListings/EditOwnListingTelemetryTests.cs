using System.Diagnostics;
using System.Net;
using System.Net.Http.Json;
using ChristianFitness.Api.Tests.Account;
using ChristianFitness.Api.Tests.Profiles;
using ChristianFitness.Api.Tests.Telemetry;
using ChristianFitness.Domain.Directory;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.DirectoryListings;

/// <summary>
/// L2-079 AC7 and L2-033 (journey 20; ADR 0095): the owner's save leaves neither the contact email,
/// the about, the website, the focus tags nor the new name in any span or log; the span records the
/// route template, the method and the status only. A refused save records none of them either.
/// </summary>
public sealed class EditOwnListingTelemetryTests(TelemetryTests.Factory factory) : IClassFixture<TelemetryTests.Factory>
{
    private static readonly string[] Personal = ["hello@eastside", "eastside.example", "Thirty women", "eastsidestrength", "Prayer", "Women’s Strength", "owner.telemetry"];

    private static readonly string[] Focus = ["Strength", "Prayer"];

    private async Task<Guid> OwnedListingAsync(Guid owner)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var now = DateTimeOffset.UtcNow;
        var listing = DirectoryListing.CreateDraft(Guid.CreateVersion7(now), ListingKind.Organization, "Eastside Ladies Who Lift", "Saturday strength", "East York", ["Strength"], now);
        listing.Publish(now);
        db.DirectoryListings.Add(listing);
        db.Entry(listing).Property(l => l.MemberId).CurrentValue = owner;
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        return listing.Id;
    }

    [Theory]
    [InlineData("hello@eastside.example", HttpStatusCode.OK)]
    [InlineData("hello at eastside.example", HttpStatusCode.BadRequest)]
    public async Task Given_the_owner_saves_their_listing_When_the_request_is_traced_and_logged_Then_no_contact_or_listing_text_is_recorded(
        string contactEmail, HttpStatusCode expected)
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await OwnProfileTests.JoinedAsync(client, JoinTests.Details($"owner.telemetry.{expected:D}@example.org"));
        var listing = await OwnedListingAsync(await OwnProfileTests.MemberIdAsync(client, cookie));
        var traceId = ActivityTraceId.CreateRandom();
        using var request = new HttpRequestMessage(HttpMethod.Put, new Uri($"{BrowseDirectoryTests.Path}/{listing}", UriKind.Relative))
        {
            Content = JsonContent.Create(new
            {
                name = "Eastside Women’s Strength",
                kind = "organization",
                about = "Thirty women now, still coached by a CSEP trainer.",
                website = "eastsidestrength.ca",
                photoKey = (string?)null,
                focus = Focus,
                contactEmail,
            }),
        };
        request.Headers.Add("Cookie", cookie);
        request.Headers.Add("traceparent", $"00-{traceId}-{ActivitySpanId.CreateRandom()}-01");

        using var response = await client.SendAsync(request, TestContext.Current.CancellationToken);
        Assert.Equal(expected, response.StatusCode);

        var span = await factory.Spans.WaitForAsync(
            s => s.Kind == ActivityKind.Server && s.TraceId == traceId,
            s => $"{s.DisplayName} {{{string.Join(", ", s.TagObjects.Select(t => t.Key))}}}",
            "the server span of PUT /api/directory/{id}");

        Assert.Equal("PUT api/directory/{id:guid}", span.DisplayName);
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
