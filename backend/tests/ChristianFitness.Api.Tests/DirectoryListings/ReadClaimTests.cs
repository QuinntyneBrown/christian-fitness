using System.Net;
using ChristianFitness.Api.Tests.Events;

namespace ChristianFitness.Api.Tests.DirectoryListings;

/// <summary>
/// L2-078 AC4, AC5 and AC9 (journey 19; ADR 0092): anyone may read a claim link. A visitor learns the
/// listing's name and when the link expires and nothing else; a signed-in member also gets the
/// listing as it will appear. An unknown token is 404 <c>claim_not_found</c>, which says nothing of
/// whether a listing exists.
/// </summary>
public sealed class ReadClaimTests(RegisterForEventFactory factory) : IClassFixture<RegisterForEventFactory>
{
    private readonly ClaimLinks _claims = new(factory);

    [Fact]
    public async Task Given_a_valid_link_When_a_visitor_opens_it_Then_it_answers_the_name_and_expiry_only()
    {
        var (_, token) = await _claims.IssueAsync();
        using var client = Browser.CreateClient(factory);

        using var response = await ClaimLinks.SendAsync(client, HttpMethod.Get, ClaimLinks.PathOf(token), null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var answer = await ClaimLinks.JsonAsync(response);
        Assert.Equal(["expiresAt", "listing", "name"], answer.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.Equal("Eastside Ladies Who Lift", answer.GetProperty("name").GetString());
        Assert.Equal(RegisterForEventFactory.Now + TimeSpan.FromDays(14), answer.GetProperty("expiresAt").GetDateTimeOffset());
        Assert.Equal(System.Text.Json.JsonValueKind.Null, answer.GetProperty("listing").ValueKind);
    }

    [Fact]
    public async Task Given_a_valid_link_When_a_signed_in_member_opens_it_Then_it_answers_the_listing_as_it_will_appear()
    {
        var (_, token) = await _claims.IssueAsync(name: "Coach Marcus Delaney", kind: Domain.Directory.ListingKind.Instructor);
        var (client, cookie, _) = await _claims.MemberAsync("marcus.read@example.org");
        using var _client = client;

        using var response = await ClaimLinks.SendAsync(client, HttpMethod.Get, ClaimLinks.PathOf(token), cookie);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var listing = (await ClaimLinks.JsonAsync(response)).GetProperty("listing");
        Assert.Equal(
            ["about", "area", "focus", "isVerified", "kind", "name", "photoKey", "tagline", "website"],
            listing.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.Equal(
            ("instructor", "Coach Marcus Delaney", "Saturday morning strength group out of Danforth Baptist", "East York", "About 25 women, coached by a CSEP trainer.", "https://eastsideladies.ca", false),
            (listing.GetProperty("kind").GetString(), listing.GetProperty("name").GetString(), listing.GetProperty("tagline").GetString(), listing.GetProperty("area").GetString(),
             listing.GetProperty("about").GetString(), listing.GetProperty("website").GetString(), listing.GetProperty("isVerified").GetBoolean()));
        Assert.Equal(["Strength", "Beginners"], listing.GetProperty("focus").EnumerateArray().Select(f => f.GetString()));
    }

    [Theory]
    [InlineData("not-a-token-anyone-was-sent")]
    [InlineData("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")]
    public async Task Given_an_unknown_token_When_it_is_opened_Then_it_is_refused_claim_not_found(string token)
    {
        using var client = Browser.CreateClient(factory);

        using var response = await ClaimLinks.SendAsync(client, HttpMethod.Get, ClaimLinks.PathOf(token), null);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("claim_not_found", (await ClaimLinks.JsonAsync(response)).GetProperty("code").GetString());
    }
}
