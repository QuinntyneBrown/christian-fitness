using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Tests.Members;
using ChristianFitness.Domain.Events;
using ChristianFitness.Domain.Members;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Dashboard;

/// <summary>
/// L2-020 AC4 to AC6 (ADR 0000): staff, Admin or Moderator, see the weekly counts of new members,
/// registrations and messages for the last eight weeks, oldest first. A week runs Monday 00:00 UTC
/// to the next Monday; the current week is the last and runs to now. The clock is a
/// <see cref="Microsoft.Extensions.Time.Testing.FakeTimeProvider"/> standing at Wednesday,
/// April 15, 2026, 12:45 UTC, so the weeks start on Feb 23 and end on Apr 13.
/// </summary>
public sealed class CommunityActivityTests
{
    private static readonly string[] WeekStarts =
    [
        "2026-02-23T00:00:00+00:00", "2026-03-02T00:00:00+00:00", "2026-03-09T00:00:00+00:00", "2026-03-16T00:00:00+00:00",
        "2026-03-23T00:00:00+00:00", "2026-03-30T00:00:00+00:00", "2026-04-06T00:00:00+00:00", "2026-04-13T00:00:00+00:00",
    ];

    // The week rule's case table: an instant, and the week it falls in (0 is the oldest of eight),
    // or -1 when no week has it. Only the API cuts weeks (ADR 0059), so the table is this suite's.
    public static TheoryData<string, int> Cases => new()
    {
        { "2026-04-15T12:45:00+00:00", 7 },
        { "2026-04-13T00:00:00+00:00", 7 },
        { "2026-04-12T23:59:59+00:00", 6 },
        { "2026-03-30T00:00:00+00:00", 5 },
        { "2026-02-23T00:00:00+00:00", 0 },
        { "2026-02-22T23:59:59+00:00", -1 },
        { "2026-04-15T13:00:00+00:00", -1 },
        { "2025-11-03T17:00:00+00:00", -1 },
    };

    [Theory]
    [MemberData(nameof(Cases))]
    public async Task Given_activity_at_an_instant_When_staff_ask_Then_it_is_counted_in_the_week_that_holds_it(string at, int week)
    {
        using var factory = new AdminMembersFactory();
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminMembers.SignInStaffAsync(factory, client, "dana.activity@christianfitness.ca", StaffRoleName.Admin);
        var instant = DateTimeOffset.Parse(at, System.Globalization.CultureInfo.InvariantCulture);
        await SeedAsync(factory, instant);

        var activity = await ActivityAsync(client, cookie);

        // Dana joined at 12:46, in the last week, so she is the one new member there.
        var members = new int[8];
        members[7] = 1;
        var registrations = new int[8];
        var messages = new int[8];
        if (week >= 0)
        {
            members[week]++;
            registrations[week]++;
            messages[week] += 2;
        }

        Assert.Equal(members, Column(activity, "newMembers"));
        Assert.Equal(registrations, Column(activity, "registrations"));
        Assert.Equal(messages, Column(activity, "messages"));
    }

    [Fact]
    public async Task Given_an_Admin_When_they_ask_for_activity_Then_eight_weeks_come_oldest_first_with_counts_only()
    {
        using var factory = new AdminMembersFactory();
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminMembers.SignInStaffAsync(factory, client, "dana.shape@christianfitness.ca", StaffRoleName.Admin);

        var activity = await ActivityAsync(client, cookie);

        Assert.Equal(["weeks"], activity.EnumerateObject().Select(p => p.Name));
        var weeks = activity.GetProperty("weeks").EnumerateArray().ToArray();
        Assert.Equal(WeekStarts, weeks.Select(w => w.GetProperty("start").GetString()));
        Assert.All(weeks, w => Assert.Equal(["messages", "newMembers", "registrations", "start"], w.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal)));
    }

    [Fact]
    public async Task Given_a_Moderator_When_they_ask_for_activity_Then_it_is_answered()
    {
        using var factory = new AdminMembersFactory();
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminMembers.SignInStaffAsync(factory, client, "joel.activity@christianfitness.ca", StaffRoleName.Moderator);

        var activity = await ActivityAsync(client, cookie);

        Assert.Equal(8, activity.GetProperty("weeks").GetArrayLength());
    }

    [Fact]
    public async Task Given_time_passes_into_a_new_week_When_staff_ask_again_Then_the_weeks_move_on_by_one()
    {
        using var factory = new AdminMembersFactory();
        using var client = Browser.CreateClient(factory);
        factory.Time.Advance(TimeSpan.FromDays(5));
        var cookie = await AdminMembers.SignInStaffAsync(factory, client, "dana.moves@christianfitness.ca", StaffRoleName.Admin);

        var activity = await ActivityAsync(client, cookie);

        var starts = activity.GetProperty("weeks").EnumerateArray().Select(w => w.GetProperty("start").GetString()).ToArray();
        Assert.Equal("2026-03-02T00:00:00+00:00", starts[0]);
        Assert.Equal("2026-04-20T00:00:00+00:00", starts[7]);
        // Dana joined on Monday the 20th, a minute past 12:45 UTC, so she is the new week's.
        Assert.Equal([0, 0, 0, 0, 0, 0, 0, 1], Column(activity, "newMembers"));
    }

    [Fact]
    public async Task Given_no_session_When_activity_is_asked_Then_it_is_refused_with_401()
    {
        using var factory = new AdminMembersFactory();
        using var client = Browser.CreateClient(factory);

        using var response = await Browser.SendAsync(client, HttpMethod.Get, "/api/admin/dashboard/activity", cookie: null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    private static async Task<JsonElement> ActivityAsync(HttpClient client, string cookie)
    {
        using var response = await Browser.SendAsync(client, HttpMethod.Get, "/api/admin/dashboard/activity", cookie);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
    }

    private static int[] Column(JsonElement activity, string name) =>
        [.. activity.GetProperty("weeks").EnumerateArray().Select(w => w.GetProperty(name).GetInt32())];

    /// <summary>One new member, one registration, one event chat message and one direct message, all at <paramref name="at"/>.</summary>
    private static async Task SeedAsync(AdminMembersFactory factory, DateTimeOffset at)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var member = Member.Join("Seeded Member", "seeded.activity@example.org", "hash", at);
        db.Members.Add(member);
        db.Registrations.Add(Registration.Of(Guid.NewGuid(), member.Id, 0, at));
        db.ChatMessages.Add(ChatMessage.Of(ChatScope.OfEvent(Guid.NewGuid()), member.Id, "private words", at));
        db.DirectMessages.Add(DirectMessage.Of(member.Id, Guid.NewGuid(), "more private words", at));
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
    }
}
