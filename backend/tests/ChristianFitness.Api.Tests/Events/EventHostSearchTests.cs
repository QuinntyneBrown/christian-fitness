using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Domain.Directory;

namespace ChristianFitness.Api.Tests.Events;

/// <summary>
/// L2-022 AC11 (ADR 0089): the Host picker searches Listed directory listings by name: folded,
/// at most 10 in name order, from 2 characters; nothing that is not Listed is offered.
/// </summary>
public sealed class EventHostSearchTests(AdminEventsFactory factory) : IClassFixture<AdminEventsFactory>
{
    private static async Task<JsonElement> SearchAsync(HttpClient client, string cookie, string q)
    {
        using var response = await AdminEvents.SendAsync(client, HttpMethod.Get, $"/api/admin/events/hosts?q={Uri.EscapeDataString(q)}", cookie);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
    }

    private static string[] Names(JsonElement answer) =>
        [.. answer.GetProperty("hosts").EnumerateArray().Select(h => h.GetProperty("name").GetString()!)];

    [Fact]
    public async Task Given_Listed_and_unlisted_listings_When_an_Admin_searches_hosts_Then_only_Listed_names_that_match_answer_in_name_order()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminEvents.SignInStaffAsync(factory, client, "dana.host.search@example.org");
        var shore = await factory.AddListingAsync(ListingKind.Organization, "Shoreline Ministries");
        await factory.AddListingAsync(ListingKind.ChurchMinistry, "Bayshore Chapel Fitness");
        await factory.AddListingAsync(ListingKind.Organization, "Shore Draft Club", ListingStatus.Draft);
        await factory.AddListingAsync(ListingKind.Organization, "Shore Removed Club", ListingStatus.Removed);
        await factory.AddListingAsync(ListingKind.Organization, "Shore Declined Club", ListingStatus.Declined);

        var answer = await SearchAsync(client, cookie, "  SHORE ");

        Assert.Equal(["hosts"], answer.EnumerateObject().Select(p => p.Name));
        Assert.Equal(["Bayshore Chapel Fitness", "Shoreline Ministries"], Names(answer));
        var first = answer.GetProperty("hosts")[1];
        Assert.Equal(["id", "kind", "name"], first.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.Equal(shore.ToString(), first.GetProperty("id").GetString());
        Assert.Equal("organization", first.GetProperty("kind").GetString());
        Assert.Equal("church-ministry", answer.GetProperty("hosts")[0].GetProperty("kind").GetString());
    }

    [Fact]
    public async Task Given_more_than_ten_matches_When_an_Admin_searches_Then_the_first_ten_by_name_answer()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminEvents.SignInStaffAsync(factory, client, "dana.host.ten@example.org");
        foreach (var n in Enumerable.Range(1, 12).Reverse())
        {
            await factory.AddListingAsync(ListingKind.Organization, $"Tenfold Club {n:00}");
        }

        var answer = await SearchAsync(client, cookie, "tenfold");

        Assert.Equal([.. Enumerable.Range(1, 10).Select(n => $"Tenfold Club {n:00}")], Names(answer));
    }

    [Theory]
    [InlineData("")]
    [InlineData("q")]
    [InlineData("  q  ")]
    public async Task Given_a_search_under_two_characters_When_an_Admin_searches_Then_no_host_answers(string q)
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminEvents.SignInStaffAsync(factory, client, $"dana.host.short{q.Trim().Length}{q.Length}@example.org");
        await factory.AddListingAsync(ListingKind.Organization, "Quiet Quarry Runners");

        var answer = await SearchAsync(client, cookie, q);

        Assert.Empty(Names(answer));
    }

    [Fact]
    public async Task Given_a_name_with_a_wildcard_When_an_Admin_searches_for_it_Then_the_wildcard_is_literal()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminEvents.SignInStaffAsync(factory, client, "dana.host.literal@example.org");
        await factory.AddListingAsync(ListingKind.Organization, "Run_n Club");
        await factory.AddListingAsync(ListingKind.Organization, "Runan Club");

        var answer = await SearchAsync(client, cookie, "run_n");

        Assert.Equal(["Run_n Club"], Names(answer));
    }

    [Fact]
    public async Task Given_a_search_over_100_characters_When_an_Admin_searches_Then_it_is_refused_with_query_too_long()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminEvents.SignInStaffAsync(factory, client, "dana.host.long@example.org");

        using var response = await AdminEvents.SendAsync(client, HttpMethod.Get, $"/api/admin/events/hosts?q={new string('a', 101)}", cookie);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("query_too_long", (await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken)).GetProperty("code").GetString());
    }
}
