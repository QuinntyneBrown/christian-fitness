using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Domain.Events;

namespace ChristianFitness.Api.Tests.Events;

/// <summary>
/// L2-010 AC1 and AC2 (ADR 0031): a signed-in member opens a published event and reads its fields
/// and how many are going; a draft and an unknown id are 404 <c>event_not_found</c>.
/// </summary>
public sealed class ViewEventDetailTests(BrowseEventsFactory factory) : IClassFixture<BrowseEventsFactory>
{
    private static readonly DateTimeOffset Soon = BrowseEventsFactory.Now.AddDays(3);

    private static string PathOf(Guid id) => $"/api/events/{id}";

    [Fact]
    public async Task Given_nobody_signed_in_When_an_event_is_opened_Then_it_is_unauthorized()
    {
        using var client = Browser.CreateClient(factory);

        using var response = await Browser.SendAsync(client, HttpMethod.Get, PathOf(Guid.NewGuid()), cookie: null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Given_a_published_event_When_a_member_opens_it_Then_it_answers_exactly_its_fields()
    {
        var id = await factory.AddEventAsync("Detail Run", Soon, category: EventCategory.Workout, priceCents: 1000, capacity: 50, imageKey: "0123456789abcdef0123456789abcdef.jpg");
        factory.Going[id] = 38;
        var (client, cookie) = await BrowseEvents.MemberAsync(factory, "grace.detail@example.org");

        using var response = await Browser.SendAsync(client, HttpMethod.Get, PathOf(id), cookie);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal(
            ["area", "capacity", "category", "going", "id", "imageKey", "place", "priceCents", "startsAt", "summary", "title"],
            body.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.Equal(
            (id.ToString(), "Detail Run", "workout", "Martin Goodman Trail", "Waterfront, Toronto", 1000, 50, 38, "Come run with us.", "0123456789abcdef0123456789abcdef.jpg"),
            (
                body.GetProperty("id").GetString(),
                body.GetProperty("title").GetString(),
                body.GetProperty("category").GetString(),
                body.GetProperty("place").GetString(),
                body.GetProperty("area").GetString(),
                body.GetProperty("priceCents").GetInt32(),
                body.GetProperty("capacity").GetInt32(),
                body.GetProperty("going").GetInt32(),
                body.GetProperty("summary").GetString(),
                body.GetProperty("imageKey").GetString()));
        Assert.Equal(Soon, body.GetProperty("startsAt").GetDateTimeOffset());
    }

    [Fact]
    public async Task Given_a_draft_event_When_a_member_opens_it_Then_it_is_not_found()
    {
        var id = await factory.AddEventAsync("Hidden Draft", Soon, published: false);
        var (client, cookie) = await BrowseEvents.MemberAsync(factory, "grace.draft@example.org");

        await AssertNotFoundAsync(client, cookie, id);
    }

    [Fact]
    public async Task Given_an_unknown_id_When_a_member_opens_it_Then_it_is_not_found()
    {
        var (client, cookie) = await BrowseEvents.MemberAsync(factory, "grace.unknown@example.org");

        await AssertNotFoundAsync(client, cookie, Guid.NewGuid());
    }

    private static async Task AssertNotFoundAsync(HttpClient client, string cookie, Guid id)
    {
        using var response = await Browser.SendAsync(client, HttpMethod.Get, PathOf(id), cookie);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("event_not_found", body.GetProperty("code").GetString());
    }
}
