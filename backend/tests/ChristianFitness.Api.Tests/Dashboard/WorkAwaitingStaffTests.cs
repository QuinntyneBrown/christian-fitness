using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Tests.Members;
using ChristianFitness.Domain.Members;
using ChristianFitness.Domain.Services;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Dashboard;

/// <summary>
/// L2-020 AC7 to AC10 (slice 28.2; ADR 0000): an Admin sees how many applications are pending and
/// how many members are flagged, and the oldest three of each (name, role or note); a Moderator is
/// answered flagged members only, with no application, count or key; with nothing waiting both
/// counts are zero; a decided application does not count; nobody is refused with anything but 401.
/// </summary>
public sealed class WorkAwaitingStaffTests
{
    private const string Path = "/api/admin/dashboard/awaiting";

    [Fact]
    public async Task Given_pending_applications_and_flagged_members_When_an_Admin_asks_Then_counts_and_the_oldest_three_come_oldest_first()
    {
        using var factory = new AdminMembersFactory();
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminMembers.SignInStaffAsync(factory, client, "dana.awaiting@christianfitness.ca", StaffRoleName.Admin);
        var start = factory.Time.GetUtcNow();
        // Seeded newest first, so the order is the rule's and not the insertion's.
        for (var i = 0; i < 5; i++)
        {
            var member = await SeedMemberAsync(factory, $"Applicant {i}", $"applicant{i}@example.org", start.AddMinutes(-i));
            await SeedApplicationAsync(factory, member, $"Role {i}", start.AddHours(-i));
            var flagged = await SeedMemberAsync(factory, $"Flagged {i}", $"flagged{i}@example.org", start.AddDays(-i));
            await FlagAsync(factory, flagged, $"Note {i}");
        }

        var awaiting = await AwaitingAsync(client, cookie);

        var applications = awaiting.GetProperty("applications");
        Assert.Equal(5, applications.GetProperty("total").GetInt32());
        var items = applications.GetProperty("items").EnumerateArray().ToArray();
        Assert.Equal(["Applicant 4", "Applicant 3", "Applicant 2"], items.Select(a => a.GetProperty("name").GetString()));
        Assert.Equal(["Role 4", "Role 3", "Role 2"], items.Select(a => a.GetProperty("role").GetString()));
        Assert.All(items, a => Assert.Equal(["id", "name", "role", "submittedAt"], a.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal)));
        var flaggedMembers = awaiting.GetProperty("flaggedMembers");
        Assert.Equal(5, flaggedMembers.GetProperty("total").GetInt32());
        var flaggedItems = flaggedMembers.GetProperty("items").EnumerateArray().ToArray();
        Assert.Equal(["Flagged 4", "Flagged 3", "Flagged 2"], flaggedItems.Select(a => a.GetProperty("name").GetString()));
        Assert.Equal(["Note 4", "Note 3", "Note 2"], flaggedItems.Select(a => a.GetProperty("note").GetString()));
        Assert.All(flaggedItems, a => Assert.Equal(["id", "name", "note"], a.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal)));
    }

    [Fact]
    public async Task Given_a_Moderator_When_they_ask_Then_only_flagged_members_come_and_no_application_key()
    {
        using var factory = new AdminMembersFactory();
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminMembers.SignInStaffAsync(factory, client, "joel.awaiting@christianfitness.ca", StaffRoleName.Moderator);
        var member = await SeedMemberAsync(factory, "Secret Applicant", "secret.applicant@example.org", factory.Time.GetUtcNow());
        await SeedApplicationAsync(factory, member, "Strength coach", factory.Time.GetUtcNow());
        var flagged = await SeedMemberAsync(factory, "Kevin Brooks", "kevin.awaiting@example.org", factory.Time.GetUtcNow());
        await FlagAsync(factory, flagged, "Promoting supplements");

        var awaiting = await AwaitingAsync(client, cookie);

        Assert.Equal(["flaggedMembers"], awaiting.EnumerateObject().Select(p => p.Name));
        Assert.Equal(1, awaiting.GetProperty("flaggedMembers").GetProperty("total").GetInt32());
        Assert.Equal("Kevin Brooks", awaiting.GetProperty("flaggedMembers").GetProperty("items")[0].GetProperty("name").GetString());
    }

    [Fact]
    public async Task Given_nothing_waiting_When_an_Admin_asks_Then_both_counts_are_zero_with_no_items()
    {
        using var factory = new AdminMembersFactory();
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminMembers.SignInStaffAsync(factory, client, "dana.quiet@christianfitness.ca", StaffRoleName.Admin);
        var member = await SeedMemberAsync(factory, "Decided Applicant", "decided.awaiting@example.org", factory.Time.GetUtcNow());
        await SeedApplicationAsync(factory, member, "Dietitian", factory.Time.GetUtcNow(), ApplicationStatus.Approved);

        var awaiting = await AwaitingAsync(client, cookie);

        Assert.Equal(0, awaiting.GetProperty("applications").GetProperty("total").GetInt32());
        Assert.Equal(0, awaiting.GetProperty("applications").GetProperty("items").GetArrayLength());
        Assert.Equal(0, awaiting.GetProperty("flaggedMembers").GetProperty("total").GetInt32());
        Assert.Equal(0, awaiting.GetProperty("flaggedMembers").GetProperty("items").GetArrayLength());
    }

    [Fact]
    public async Task Given_no_session_When_it_is_asked_Then_it_is_refused_with_401()
    {
        using var factory = new AdminMembersFactory();
        using var client = Browser.CreateClient(factory);

        using var response = await Browser.SendAsync(client, HttpMethod.Get, Path, cookie: null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    private static async Task<JsonElement> AwaitingAsync(HttpClient client, string cookie)
    {
        using var response = await Browser.SendAsync(client, HttpMethod.Get, Path, cookie);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
    }

    private static async Task<Guid> SeedMemberAsync(AdminMembersFactory factory, string name, string email, DateTimeOffset joinedAt)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var member = Member.Join(name, email, "hash", joinedAt);
        db.Members.Add(member);
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        return member.Id;
    }

    private static async Task FlagAsync(AdminMembersFactory factory, Guid id, string note)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var member = await db.Members.FindAsync([id], TestContext.Current.CancellationToken);
        Assert.True(member!.TryFlag(note));
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
    }

    private static async Task SeedApplicationAsync(
        AdminMembersFactory factory, Guid memberId, string role, DateTimeOffset at, ApplicationStatus status = ApplicationStatus.Pending)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var application = ProfessionalApplication.Submit(memberId, role, ServiceCategory.Training, "CSCS", "Mississauga", "$70", "About.", at);
        db.ProfessionalApplications.Add(application);
        if (status != ApplicationStatus.Pending)
        {
            db.Entry(application).Property(a => a.Status).CurrentValue = status;
        }

        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
    }
}
