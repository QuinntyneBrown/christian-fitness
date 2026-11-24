using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Tests.Account;
using ChristianFitness.Api.Tests.Admin;
using ChristianFitness.Api.Tests.Events;
using ChristianFitness.Api.Tests.Profiles;
using ChristianFitness.Domain.Members;
using ChristianFitness.Domain.Services;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Services;

/// <summary>
/// L2-025 AC1 and AC4 (slice 21.1; ADR 0000): an Admin opens <c>GET /api/admin/services/applications</c>
/// and sees each Pending application's name, role, credentials and submitted time, oldest first, with
/// the number waiting; a decided application is not listed; with none the list is empty; a Moderator,
/// a member and nobody are refused.
/// </summary>
public sealed class ApplicationQueueTests(RegisterForEventFactory factory) : IClassFixture<RegisterForEventFactory>
{
    private const string Path = "/api/admin/services/applications";

    private static object Valid(string role, string credentials) =>
        new { role, category = "Training", credentials, where = "Mississauga", price = "$70", about = "Private about text." };

    private async Task<Guid> ApplyAsync(string email, string name, string role, string credentials)
    {
        var client = Browser.CreateClient(factory);
        using var _ = client;
        var cookie = await OwnProfileTests.JoinedAsync(client, JoinTests.Details(email) with { FullName = name });
        using var response = await AdminEvents.SendAsync(client, HttpMethod.Post, "/api/professional-applications", cookie, Valid(role, credentials));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken)).GetProperty("id").GetGuid();
    }

    private async Task<(HttpClient Client, string Cookie)> StaffAsync(string email, StaffRoleName role)
    {
        var client = Browser.CreateClient(factory);
        await Staff.CreateAsync(factory, client, email, role);
        using var signedIn = await Staff.SignInWithCodeAsync(client, email, factory.Time.GetUtcNow());
        return (client, Staff.Cookie(signedIn));
    }

    private async Task DecideAsync(Guid id, ApplicationStatus status)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var application = await db.ProfessionalApplications.SingleAsync(a => a.Id == id, TestContext.Current.CancellationToken);
        db.Entry(application).Property(a => a.Status).CurrentValue = status;
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
    }

    private async Task ClearAsync()
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.ProfessionalApplications.RemoveRange(db.ProfessionalApplications);
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
    }

    private static async Task<JsonElement> ReadAsync(HttpClient client, string cookie, HttpStatusCode expected)
    {
        using var response = await AdminEvents.SendAsync(client, HttpMethod.Get, Path, cookie);
        Assert.Equal(expected, response.StatusCode);
        return await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
    }

    [Fact]
    public async Task Given_pending_applications_When_an_Admin_opens_the_queue_Then_each_shows_name_role_credentials_and_time_oldest_first()
    {
        await ClearAsync();
        var first = factory.Time.GetUtcNow();
        await ApplyAsync("hannah.queue1@example.org", "Hannah Bergstrom", "Registered massage therapist", "RMT, CMTO #T4471");
        factory.Time.Advance(TimeSpan.FromHours(5));
        var decided = await ApplyAsync("samuel.queue1@example.org", "Samuel Osei", "Strength coach", "CSCS");
        factory.Time.Advance(TimeSpan.FromHours(5));
        var third = factory.Time.GetUtcNow();
        await ApplyAsync("lena.queue1@example.org", "<b>Lena</b> Park", "Sports dietitian", "Registered Dietitian, CDO");
        await DecideAsync(decided, ApplicationStatus.Declined);
        var (staff, cookie) = await StaffAsync("dana.queue1@example.org", StaffRoleName.Admin);
        using var _ = staff;

        var answer = await ReadAsync(staff, cookie, HttpStatusCode.OK);

        Assert.Equal(["applications", "total"], answer.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.Equal(2, answer.GetProperty("total").GetInt32());
        var rows = answer.GetProperty("applications").EnumerateArray().ToArray();
        Assert.All(rows, row => Assert.Equal(["credentials", "id", "name", "role", "submittedAt"], row.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal)));
        Assert.Equal(["Hannah Bergstrom", "<b>Lena</b> Park"], rows.Select(r => r.GetProperty("name").GetString()));
        Assert.Equal(["Registered massage therapist", "Sports dietitian"], rows.Select(r => r.GetProperty("role").GetString()));
        Assert.Equal(["RMT, CMTO #T4471", "Registered Dietitian, CDO"], rows.Select(r => r.GetProperty("credentials").GetString()));
        Assert.Equal([first, third], rows.Select(r => r.GetProperty("submittedAt").GetDateTimeOffset()));
    }

    [Fact]
    public async Task Given_more_pending_applications_than_the_cap_When_an_Admin_opens_the_queue_Then_the_oldest_are_listed_and_total_counts_all()
    {
        await ClearAsync();
        var applicant = Browser.CreateClient(factory);
        using var __ = applicant;
        await OwnProfileTests.JoinedAsync(applicant, JoinTests.Details("many.queue2@example.org"));
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var start = factory.Time.GetUtcNow();
            var memberId = (await db.Members.SingleAsync(m => m.Email == "many.queue2@example.org", TestContext.Current.CancellationToken)).Id;
            for (var i = 0; i < 52; i++)
            {
                db.ProfessionalApplications.Add(ProfessionalApplication.Submit(
                    memberId, $"Role {i:00}", ServiceCategory.Training, "CPT", "Here", "$1", "Hi", start.AddMinutes(i)));
            }

            await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        }

        var (staff, cookie) = await StaffAsync("dana.queue2@example.org", StaffRoleName.Admin);
        using var _ = staff;

        var answer = await ReadAsync(staff, cookie, HttpStatusCode.OK);

        Assert.Equal(52, answer.GetProperty("total").GetInt32());
        var roles = answer.GetProperty("applications").EnumerateArray().Select(r => r.GetProperty("role").GetString()).ToArray();
        Assert.Equal(50, roles.Length);
        Assert.Equal("Role 00", roles[0]);
        Assert.Equal("Role 49", roles[^1]);
    }

    [Fact]
    public async Task Given_no_pending_applications_When_an_Admin_opens_the_queue_Then_the_list_is_empty()
    {
        await ClearAsync();
        var (staff, cookie) = await StaffAsync("dana.queue3@example.org", StaffRoleName.Admin);
        using var _ = staff;

        var answer = await ReadAsync(staff, cookie, HttpStatusCode.OK);

        Assert.Equal((0, 0), (answer.GetProperty("total").GetInt32(), answer.GetProperty("applications").GetArrayLength()));
    }

    [Fact]
    public async Task Given_a_Moderator_a_member_or_nobody_When_the_queue_is_asked_for_Then_it_is_refused()
    {
        var (moderator, moderatorCookie) = await StaffAsync("joel.queue4@example.org", StaffRoleName.Moderator);
        using var _ = moderator;
        var member = Browser.CreateClient(factory);
        using var __ = member;
        var memberCookie = await OwnProfileTests.JoinedAsync(member, JoinTests.Details("grace.queue4@example.org"));
        using var anonymous = Browser.CreateClient(factory);

        using var asModerator = await AdminEvents.SendAsync(moderator, HttpMethod.Get, Path, moderatorCookie);
        using var asMember = await AdminEvents.SendAsync(member, HttpMethod.Get, Path, memberCookie);
        using var asNobody = await AdminEvents.SendAsync(anonymous, HttpMethod.Get, Path, cookie: null);

        Assert.Equal(HttpStatusCode.Forbidden, asModerator.StatusCode);
        Assert.Equal("forbidden_role", (await asModerator.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken)).GetProperty("code").GetString());
        Assert.Equal((HttpStatusCode.Unauthorized, HttpStatusCode.Unauthorized), (asMember.StatusCode, asNobody.StatusCode));
    }
}
