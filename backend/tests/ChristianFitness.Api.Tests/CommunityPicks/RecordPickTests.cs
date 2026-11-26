using System.Net;
using ChristianFitness.Api.Tests.Events;
using ChristianFitness.Domain.Events;
using ChristianFitness.Domain.Members;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using static ChristianFitness.Api.Tests.CommunityPicks.AdminCommunityPicks;

namespace ChristianFitness.Api.Tests.CommunityPicks;

/// <summary>
/// Recording a Community Pick through the API (L2-072 AC13; ADR 0098): who picked which event,
/// when, and with what note; audited; refused for an unknown event, one not published or already
/// started, and a note over 70 characters.
/// </summary>
public sealed class RecordPickTests
{
    private const string Note = "Flat, stroller-friendly, and you finish as the sun comes up.";

    [Fact]
    public async Task Given_a_published_event_to_come_When_staff_pick_it_Then_the_pick_is_recorded_with_who_when_and_the_trimmed_note()
    {
        using var factory = new CommunityPickFactory();
        using var client = Browser.CreateClient(factory);
        var cookie = await SignInAsync(factory, client, "pick.record@example.com");
        var eventId = await factory.AddEventAsync("Easter Sunrise 5K", TimeSpan.FromDays(3));
        var now = factory.Time.GetUtcNow();

        using var response = await RecordAsync(client, cookie, eventId, $"  {Note}  ");

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await JsonAsync(response);
        Assert.Equal(["eventId", "pickedAt"], Keys(body));
        Assert.Equal(eventId, body.GetProperty("eventId").GetGuid());
        Assert.Equal(now, body.GetProperty("pickedAt").GetDateTimeOffset());
        var pick = Assert.Single(await factory.PicksOfAsync(eventId));
        Assert.Equal(Note, pick.Note);
        Assert.Equal(now, pick.PickedAt);
        Assert.Equal(await StaffIdAsync(factory, "pick.record@example.com"), pick.PickedById);
    }

    [Fact]
    public async Task Given_a_pick_When_the_list_is_read_Then_the_event_shows_it_as_last_picked()
    {
        using var factory = new CommunityPickFactory();
        using var client = Browser.CreateClient(factory);
        var cookie = await SignInAsync(factory, client, "pick.relist@example.com");
        var eventId = await factory.AddEventAsync("Hoops Night", TimeSpan.FromDays(4));
        await factory.AddPickAsync(eventId, factory.Time.GetUtcNow().AddDays(-9));

        using var recorded = await RecordAsync(client, cookie, eventId, "");
        using var listed = await ListAsync(client, cookie);

        Assert.Equal(HttpStatusCode.Created, recorded.StatusCode);
        var events = (await JsonAsync(listed)).GetProperty("events").EnumerateArray();
        var hoops = Assert.Single(events, e => e.GetProperty("id").GetGuid() == eventId);
        Assert.Equal(factory.Time.GetUtcNow(), hoops.GetProperty("lastPickedAt").GetDateTimeOffset());
    }

    [Fact]
    public async Task Given_an_empty_note_When_staff_pick_Then_it_is_recorded_with_none()
    {
        using var factory = new CommunityPickFactory();
        using var client = Browser.CreateClient(factory);
        var cookie = await SignInAsync(factory, client, "pick.empty@example.com");
        var eventId = await factory.AddEventAsync("Stretch and Pray", TimeSpan.FromDays(2));

        using var response = await RecordAsync(client, cookie, eventId, "   ");

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal("", Assert.Single(await factory.PicksOfAsync(eventId)).Note);
    }

    [Theory]
    [InlineData(70, HttpStatusCode.Created)]
    [InlineData(71, HttpStatusCode.BadRequest)]
    public async Task Given_a_note_of_a_length_When_staff_pick_Then_70_characters_is_the_most(int length, HttpStatusCode expected)
    {
        using var factory = new CommunityPickFactory();
        using var client = Browser.CreateClient(factory);
        var cookie = await SignInAsync(factory, client, $"pick.length{length}@example.com");
        var eventId = await factory.AddEventAsync($"Park Bootcamp {length}", TimeSpan.FromDays(5));

        using var response = await RecordAsync(client, cookie, eventId, new string('x', length));

        Assert.Equal(expected, response.StatusCode);
        if (expected == HttpStatusCode.BadRequest)
        {
            var problem = await JsonAsync(response);
            Assert.Equal("field_too_long", problem.GetProperty("code").GetString());
            Assert.Equal(["note"], Keys(problem.GetProperty("fieldCodes")));
            Assert.Equal("note_too_long", problem.GetProperty("fieldCodes").GetProperty("note").GetString());
            Assert.DoesNotContain(new string('x', length), problem.GetRawText(), StringComparison.Ordinal);
            Assert.Empty(await factory.PicksOfAsync(eventId));
        }
    }

    [Fact]
    public async Task Given_no_such_event_When_staff_pick_it_Then_404_event_not_found()
    {
        using var factory = new CommunityPickFactory();
        using var client = Browser.CreateClient(factory);
        var cookie = await SignInAsync(factory, client, "pick.unknown@example.com");

        using var response = await RecordAsync(client, cookie, Guid.CreateVersion7(), Note);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("event_not_found", (await JsonAsync(response)).GetProperty("code").GetString());
    }

    public static TheoryData<string, EventStatus, int> NotPickable => new()
    {
        { "a draft", EventStatus.Draft, 72 },
        { "a cancelled event", EventStatus.Cancelled, 72 },
        { "an event that has started", EventStatus.Published, -1 },
        { "an event starting now", EventStatus.Published, 0 },
    };

    [Theory]
    [MemberData(nameof(NotPickable))]
    public async Task Given_an_event_not_pickable_When_staff_pick_it_Then_409_event_not_published(string why, EventStatus status, int startsInHours)
    {
        using var factory = new CommunityPickFactory();
        using var client = Browser.CreateClient(factory);
        var cookie = await SignInAsync(factory, client, $"pick.{status}{startsInHours}@example.com");
        var eventId = await factory.AddEventAsync($"Not pickable {why}", TimeSpan.FromHours(startsInHours), status);

        using var response = await RecordAsync(client, cookie, eventId, Note);

        Assert.True(response.StatusCode == HttpStatusCode.Conflict, why);
        Assert.Equal("event_not_published", (await JsonAsync(response)).GetProperty("code").GetString());
        Assert.Empty(await factory.PicksOfAsync(eventId));
    }

    [Fact]
    public async Task Given_a_Moderator_When_they_pick_Then_it_is_recorded_and_audited_as_community_pick_recorded()
    {
        using var factory = new CommunityPickFactory();
        using var client = Browser.CreateClient(factory);
        var cookie = await SignInAsync(factory, client, "pick.moderator@example.com", StaffRoleName.Moderator);
        var eventId = await factory.AddEventAsync("Couch to 5K: Week 3", TimeSpan.FromDays(6));

        using var response = await RecordAsync(client, cookie, eventId, Note);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var pick = Assert.Single(await factory.PicksOfAsync(eventId));
        var moderator = await StaffIdAsync(factory, "pick.moderator@example.com");
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var entry = Assert.Single(await db.AuditEntries.AsNoTracking().Where(e => e.ActorMemberId == moderator && e.RecordType == nameof(CommunityPick)).ToListAsync(TestContext.Current.CancellationToken));
        Assert.Equal(("community_pick.recorded", nameof(CommunityPick), pick.Id), (entry.Action, entry.RecordType, entry.RecordId));
    }

    [Fact]
    public async Task Given_no_staff_session_When_a_pick_is_sent_Then_401_and_nothing_is_recorded()
    {
        using var factory = new CommunityPickFactory();
        using var client = Browser.CreateClient(factory);
        var eventId = await factory.AddEventAsync("Unsigned pick", TimeSpan.FromDays(3));

        using var response = await RecordAsync(client, cookie: null, eventId, Note);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Empty(await factory.PicksOfAsync(eventId));
    }

    private static async Task<Guid> StaffIdAsync(CommunityPickFactory factory, string email)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await db.Members.Where(m => m.Email == email).Select(m => m.Id).SingleAsync(TestContext.Current.CancellationToken);
    }
}
