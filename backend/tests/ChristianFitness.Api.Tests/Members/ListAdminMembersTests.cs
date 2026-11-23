using System.Net;
using System.Text.Json;
using ChristianFitness.Api.Tests.Admin;
using ChristianFitness.Domain.Members;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Members;

/// <summary>
/// L2-028 AC1 (ADR 0022): staff see the members newest joined first, each with name, email, home
/// church, join date, events attended and status, 25 to a page, with the number of members in the
/// community. Each test starts its own API, so the counts it asserts are exactly the members it made.
/// </summary>
public sealed class ListAdminMembersTests
{
    [Fact]
    public async Task Given_members_who_joined_at_different_times_When_staff_list_members_Then_they_come_newest_first_with_what_the_table_shows()
    {
        using var factory = new AdminMembersFactory();
        using var client = Browser.CreateClient(factory);
        await AdminMembers.JoinAsync(factory, client, "Michael Chen", "mchen.runs@outlook.com", "Toronto Chinese Baptist");
        var grace = await AdminMembers.JoinAsync(factory, client, "Grace Thompson", "grace.thompson@gmail.com", "Grace Fellowship, Scarborough");
        var kevin = await AdminMembers.JoinAsync(factory, client, "Kevin Brooks", "KBrooks.Fit@gmail.com", homeChurch: null);
        await AdminMembers.SetStatusAsync(factory, kevin, MemberStatus.Flagged);
        var cookie = await AdminMembers.SignInStaffAsync(factory, client, "dana@christianfitness.ca");

        var list = await AdminMembers.ListAsync(client, cookie);

        Assert.Equal(["matches", "members", "page", "pageSize", "total"], list.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        // Staff are members too (ADR 0022): Dana joined last, so she comes first.
        Assert.Equal(4, list.GetProperty("total").GetInt32());
        Assert.Equal(4, list.GetProperty("matches").GetInt32());
        Assert.Equal(1, list.GetProperty("page").GetInt32());
        Assert.Equal(25, list.GetProperty("pageSize").GetInt32());
        Assert.Equal(["Grace Thompson", "Kevin Brooks", "Grace Thompson", "Michael Chen"], AdminMembers.NamesOf(list));

        var second = list.GetProperty("members")[1];
        Assert.Equal(
            ["email", "eventsAttended", "homeChurch", "id", "joinedAt", "name", "status"],
            second.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.Equal(kevin, second.GetProperty("id").GetGuid());
        Assert.Equal("KBrooks.Fit@gmail.com", second.GetProperty("email").GetString());
        Assert.Equal(JsonValueKind.Null, second.GetProperty("homeChurch").ValueKind);
        // Michael joined a minute after 12:45, Grace two, Kevin three.
        Assert.Equal("2026-04-15T12:48:00+00:00", second.GetProperty("joinedAt").GetString());
        Assert.Equal(0, second.GetProperty("eventsAttended").GetInt32());
        Assert.Equal("flagged", second.GetProperty("status").GetString());

        var third = list.GetProperty("members")[2];
        Assert.Equal(grace, third.GetProperty("id").GetGuid());
        Assert.Equal("Grace Fellowship, Scarborough", third.GetProperty("homeChurch").GetString());
        Assert.Equal("2026-04-15T12:47:00+00:00", third.GetProperty("joinedAt").GetString());
        Assert.Equal("active", third.GetProperty("status").GetString());
    }

    [Fact]
    public async Task Given_a_suspended_member_When_staff_list_members_Then_their_status_says_suspended()
    {
        using var factory = new AdminMembersFactory();
        using var client = Browser.CreateClient(factory);
        var tyler = await AdminMembers.JoinAsync(factory, client, "Tyler Simmons", "tsimmons22@gmail.com", homeChurch: null);
        await AdminMembers.SetStatusAsync(factory, tyler, MemberStatus.Suspended);
        var cookie = await AdminMembers.SignInStaffAsync(factory, client, "dana.suspended@christianfitness.ca");

        var list = await AdminMembers.ListAsync(client, cookie);

        Assert.Equal("suspended", list.GetProperty("members")[1].GetProperty("status").GetString());
    }

    // ADR 0022: "events attended" counts registrations, which the reader gives; none until slice 6.1.
    [Fact]
    public async Task Given_members_with_registrations_When_staff_list_members_Then_each_shows_the_count_the_reader_gives_for_the_page_asked_once()
    {
        using var factory = new AdminMembersFactory();
        using var client = Browser.CreateClient(factory);
        var michael = await AdminMembers.JoinAsync(factory, client, "Michael Chen", "mchen.count@outlook.com", "Toronto Chinese Baptist");
        var grace = await AdminMembers.JoinAsync(factory, client, "Grace Thompson", "grace.count@gmail.com", "Grace Fellowship, Scarborough");
        factory.Registrations.Set(michael, 14);
        factory.Registrations.Set(grace, 9);
        var cookie = await AdminMembers.SignInStaffAsync(factory, client, "dana.count@christianfitness.ca");

        var list = await AdminMembers.ListAsync(client, cookie);

        Assert.Equal(
            [0, 9, 14],
            list.GetProperty("members").EnumerateArray().Select(m => m.GetProperty("eventsAttended").GetInt32()));
        var asked = Assert.Single(factory.Registrations.Asked);
        Assert.Equal(3, asked.Count);
        Assert.Contains(michael, asked);
        Assert.Contains(grace, asked);
    }

    public static TheoryData<int, int, string, string, int> Pages() => new()
    {
        // page asked, page answered, first name, last name, how many
        { 1, 1, "Dana Reyes", "Member 006", 25 },
        { 2, 2, "Member 005", "Member 000", 6 },
        // A page past the last answers the last page (ADR 0022).
        { 9, 2, "Member 005", "Member 000", 6 },
    };

    [Theory]
    [MemberData(nameof(Pages))]
    public async Task Given_31_members_When_staff_ask_for_a_page_Then_25_come_to_a_page_and_the_count_says_31(int asked, int answered, string first, string last, int count)
    {
        using var factory = new AdminMembersFactory();
        using var client = Browser.CreateClient(factory);
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            for (var n = 0; n < 30; n++)
            {
                // Member 000 joined first, Member 029 last; all before the staff member.
                db.Members.Add(Member.Join($"Member {n:D3}", $"member{n:D3}@example.org", "hash", AdminMembers.Today.AddDays(-30).AddMinutes(n)));
            }

            await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        }

        var cookie = await AdminMembers.SignInStaffAsync(factory, client, "dana.pages@christianfitness.ca");
        await RenameStaffAsync(factory, "Dana Reyes");

        var list = await AdminMembers.ListAsync(client, cookie, $"?page={asked}");

        Assert.Equal(31, list.GetProperty("total").GetInt32());
        Assert.Equal(31, list.GetProperty("matches").GetInt32());
        Assert.Equal(answered, list.GetProperty("page").GetInt32());
        var names = AdminMembers.NamesOf(list);
        Assert.Equal(count, names.Length);
        Assert.Equal(first, names[0]);
        Assert.Equal(last, names[^1]);
    }

    [Fact]
    public async Task Given_a_member_session_When_it_lists_members_Then_it_is_refused_with_401()
    {
        using var factory = new AdminMembersFactory();
        using var client = Browser.CreateClient(factory);
        await Staff.CreateAsync(factory, client, "grace.list.members@example.org", role: null);
        using var signedIn = await Browser.SignInAsync(client, "grace.list.members@example.org", Staff.Password);

        using var response = await Browser.SendAsync(client, HttpMethod.Get, "/api/admin/members", Browser.SessionCookie(signedIn));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    /// <summary>The test staff account joins as "Grace Thompson"; the paging rows name it apart from the 30 members.</summary>
    private static async Task RenameStaffAsync(AdminMembersFactory factory, string name)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var staff = db.Members.Single(m => m.NormalizedEmail == "dana.pages@christianfitness.ca");
        db.Entry(staff).Property(m => m.Name).CurrentValue = name;
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
    }
}
