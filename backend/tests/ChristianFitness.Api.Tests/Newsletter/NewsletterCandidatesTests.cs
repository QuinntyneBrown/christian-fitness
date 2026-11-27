using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Tests.Admin;
using ChristianFitness.Api.Tests.Events;
using ChristianFitness.Api.Tests.Stories;
using ChristianFitness.Domain.Events;
using ChristianFitness.Domain.News;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Newsletter;

/// <summary>The API with a clock at the mocks' today, stories to put in the store and events to feature.</summary>
public class NewsletterCandidatesFactory : StoriesFactory
{
    /// <summary>Puts an event in the store starting <paramref name="startsIn"/> from now, published unless <paramref name="status"/> says otherwise.</summary>
    internal async Task<Guid> AddEventAsync(string title, TimeSpan startsIn, EventStatus status = EventStatus.Published)
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var now = Time.GetUtcNow();
        var added = Event.CreateDraft(title, EventCategory.Run, now + startsIn, "Marilyn Bell Park", "Waterfront, Toronto", 0, 50, "A summary.", now, null);
        if (status != EventStatus.Draft)
        {
            added.Publish(added.CreatedAt);
        }

        db.Events.Add(added);
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        return added.Id;
    }
}

/// <summary>
/// L2-070 AC2 and AC3 (journey 28, slice 2): the desk offers the published stories newest first,
/// each saying whether it is marked "Include in the Weekly", and the next four published upcoming
/// events soonest first; a draft story, an unpublished event and a fifth event are not offered.
/// </summary>
public sealed class NewsletterCandidatesTests(NewsletterCandidatesFactory factory) : IClassFixture<NewsletterCandidatesFactory>
{
    [Fact]
    public async Task Given_stories_and_events_When_an_Admin_opens_the_desk_Then_it_offers_the_published_stories_newest_first_and_the_next_four_events()
    {
        var start = factory.Time.GetUtcNow().AddDays(-5);
        var older = await factory.PutStoryAsync("Desk older", StoryStatus.Published, start, content: c => c with { IncludeInWeekly = true });
        var newer = await factory.PutStoryAsync("Desk newer", StoryStatus.Published, start.AddDays(2));
        await factory.PutStoryAsync("Desk draft", StoryStatus.Draft, start.AddDays(3), content: c => c with { IncludeInWeekly = true });
        var soonest = await factory.AddEventAsync("Desk event 1", TimeSpan.FromDays(1));
        await factory.AddEventAsync("Desk event hidden", TimeSpan.FromHours(12), EventStatus.Draft);
        var second = await factory.AddEventAsync("Desk event 2", TimeSpan.FromDays(2));
        var third = await factory.AddEventAsync("Desk event 3", TimeSpan.FromDays(3));
        var fourth = await factory.AddEventAsync("Desk event 4", TimeSpan.FromDays(4));
        await factory.AddEventAsync("Desk event 5", TimeSpan.FromDays(5));

        var desk = await DeskAsync();

        var stories = desk.GetProperty("stories").EnumerateArray().Where(s => s.GetProperty("headline").GetString()!.StartsWith("Desk ", StringComparison.Ordinal)).ToArray();
        Assert.Equal(["id", "headline", "section", "publishedAt", "includeInWeekly"], stories[0].EnumerateObject().Select(p => p.Name));
        Assert.Equal(
            [(newer.Id.ToString(), "Desk newer", false), (older.Id.ToString(), "Desk older", true)],
            stories.Select(s => (s.GetProperty("id").GetString()!, s.GetProperty("headline").GetString()!, s.GetProperty("includeInWeekly").GetBoolean())));
        var events = desk.GetProperty("events").EnumerateArray().ToArray();
        Assert.Equal(["id", "title", "startsAt"], events[0].EnumerateObject().Select(p => p.Name));
        Assert.Equal(
            [soonest, second, third, fourth],
            events.Select(e => e.GetProperty("id").GetGuid()));
    }

    private async Task<JsonElement> DeskAsync()
    {
        const string email = "dana.candidates@example.org";
        using var client = Browser.CreateClient(factory);
        await Staff.CreateAsync(factory, client, email, ChristianFitness.Domain.Members.StaffRoleName.Admin);
        using var signedIn = await Staff.SignInWithGoogleAsync(factory, client, email);
        using var response = await AdminEvents.SendAsync(client, HttpMethod.Get, "/api/admin/newsletter", Staff.Cookie(signedIn));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
    }
}
