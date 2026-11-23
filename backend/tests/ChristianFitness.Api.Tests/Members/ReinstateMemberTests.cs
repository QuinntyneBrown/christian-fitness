using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Tests.Admin;
using ChristianFitness.Domain.Members;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Members;

/// <summary>
/// L2-029 AC3, AC4, AC6 and AC7 (ADR 0026): staff return a Flagged or Suspended member to Active;
/// the note is cleared, a suspended member can sign in again, and what the API will not do is
/// refused with its own code, changing nothing. Each test starts its own API.
/// </summary>
public sealed class ReinstateMemberTests : IAsyncLifetime
{
    private const string Note = "Spam messages to the Sunrise 5K group";
    private const string DanaEmail = "dana@christianfitness.ca";

    private readonly AdminMembersFactory _factory = new();
    private HttpClient _client = null!;
    private Guid _tyler;
    private string _dana = string.Empty;

    public async ValueTask InitializeAsync()
    {
        _client = Browser.CreateClient(_factory);
        _tyler = await AdminMembers.JoinAsync(_factory, _client, "Tyler Simmons", "tsimmons22@gmail.com", homeChurch: null);
        _dana = await AdminMembers.SignInStaffAsync(_factory, _client, DanaEmail, StaffRoleName.Admin);
    }

    public async ValueTask DisposeAsync()
    {
        _client.Dispose();
        await _factory.DisposeAsync();
    }

    [Fact]
    public async Task Given_a_suspended_member_When_staff_reinstate_them_Then_they_are_active_the_note_is_cleared_and_they_can_sign_in_again()
    {
        using var before = await Browser.SignInAsync(_client, "tsimmons22@gmail.com", Staff.Password);
        var old = Browser.SessionCookie(before);
        using var suspended = await PostAsync(_dana, _tyler, "suspend", new { note = Note, confirmed = true });
        Assert.Equal(HttpStatusCode.OK, suspended.StatusCode);
        using var refused = await Browser.SignInAsync(_client, "tsimmons22@gmail.com", Staff.Password);
        Assert.Equal(HttpStatusCode.Forbidden, refused.StatusCode);

        using var response = await ReinstateAsync(_dana, _tyler);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var row = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal(
            ["email", "eventsAttended", "homeChurch", "id", "joinedAt", "name", "note", "status"],
            row.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.Equal(_tyler, row.GetProperty("id").GetGuid());
        Assert.Equal("active", row.GetProperty("status").GetString());
        Assert.Equal(JsonValueKind.Null, row.GetProperty("note").ValueKind);
        var listed = await RowAsync(_tyler);
        Assert.Equal("active", listed.GetProperty("status").GetString());
        Assert.Equal(JsonValueKind.Null, listed.GetProperty("note").ValueKind);

        using var signIn = await Browser.SignInAsync(_client, "tsimmons22@gmail.com", Staff.Password);
        Assert.Equal(HttpStatusCode.OK, signIn.StatusCode);
        // The session the suspension ended stays ended: only a new sign-in opens one.
        using var stale = await Browser.SendAsync(_client, HttpMethod.Get, "/api/session", old);
        Assert.Equal(HttpStatusCode.Unauthorized, stale.StatusCode);
    }

    [Fact]
    public async Task Given_a_flagged_member_When_staff_reinstate_them_Then_they_are_active_and_the_note_is_cleared()
    {
        using var flagged = await PostAsync(_dana, _tyler, "flag", new { note = Note });
        Assert.Equal(HttpStatusCode.OK, flagged.StatusCode);

        using var response = await ReinstateAsync(_dana, _tyler);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var listed = await RowAsync(_tyler);
        Assert.Equal("active", listed.GetProperty("status").GetString());
        Assert.Equal(JsonValueKind.Null, listed.GetProperty("note").ValueKind);
    }

    [Fact]
    public async Task Given_a_reinstated_member_When_staff_flag_them_again_Then_it_is_allowed()
    {
        using var first = await PostAsync(_dana, _tyler, "flag", new { note = Note });
        using var back = await ReinstateAsync(_dana, _tyler);

        using var again = await PostAsync(_dana, _tyler, "flag", new { note = "Again" });

        Assert.Equal(HttpStatusCode.OK, again.StatusCode);
        Assert.Equal("Again", (await RowAsync(_tyler)).GetProperty("note").GetString());
    }

    [Fact]
    public async Task Given_an_active_member_When_staff_reinstate_them_Then_it_is_refused_with_409_status_conflict()
    {
        using var response = await ReinstateAsync(_dana, _tyler);

        await AssertRefusedAsync(response, HttpStatusCode.Conflict, "status_conflict");
    }

    [Fact]
    public async Task Given_an_id_no_member_has_When_staff_reinstate_it_Then_it_is_refused_with_404_member_not_found()
    {
        using var response = await ReinstateAsync(_dana, Guid.CreateVersion7());

        await AssertRefusedAsync(response, HttpStatusCode.NotFound, "member_not_found");
    }

    [Fact]
    public async Task Given_flagged_staff_When_they_reinstate_their_own_account_Then_it_is_refused_with_cannot_moderate_self()
    {
        var self = await IdOfAsync(DanaEmail);
        await AdminMembers.SetStatusAsync(_factory, self, MemberStatus.Flagged);

        using var response = await ReinstateAsync(_dana, self);

        await AssertRefusedAsync(response, HttpStatusCode.Forbidden, "cannot_moderate_self");
        Assert.Equal("flagged", (await RowAsync(self)).GetProperty("status").GetString());
    }

    public static TheoryData<string, StaffRoleName, StaffRoleName?, HttpStatusCode> Roles() => new()
    {
        // why, who reinstates, the target's staff role, the answer
        { "a Moderator reinstates a member", StaffRoleName.Moderator, null, HttpStatusCode.OK },
        { "a Moderator reinstates an Admin", StaffRoleName.Moderator, StaffRoleName.Admin, HttpStatusCode.Forbidden },
        { "a Moderator reinstates a Moderator", StaffRoleName.Moderator, StaffRoleName.Moderator, HttpStatusCode.Forbidden },
        { "an Admin reinstates a Moderator", StaffRoleName.Admin, StaffRoleName.Moderator, HttpStatusCode.OK },
    };

    [Theory]
    [MemberData(nameof(Roles))]
    public async Task Given_staff_and_a_suspended_target_When_they_reinstate_Then_only_an_Admin_reinstates_staff(string why, StaffRoleName actor, StaffRoleName? target, HttpStatusCode expected)
    {
        var cookie = await AdminMembers.SignInStaffAsync(_factory, _client, "actor@christianfitness.ca", actor);
        var id = target is { } role
            ? Guid.Parse(await Staff.CreateAsync(_factory, _client, "target@christianfitness.ca", role))
            : _tyler;
        await AdminMembers.SetStatusAsync(_factory, id, MemberStatus.Suspended);

        using var response = await ReinstateAsync(cookie, id);

        Assert.True(response.StatusCode == expected, $"{why}: {response.StatusCode}");
        if (expected == HttpStatusCode.Forbidden)
        {
            await AssertRefusedAsync(response, HttpStatusCode.Forbidden, "forbidden_role");
            Assert.Equal("suspended", (await RowAsync(id)).GetProperty("status").GetString());
        }
    }

    [Fact]
    public async Task Given_a_reinstated_staff_account_When_it_signs_in_to_the_admin_app_Then_the_password_step_is_accepted_again()
    {
        var id = Guid.Parse(await Staff.CreateAsync(_factory, _client, "joel@christianfitness.ca", StaffRoleName.Moderator));
        using var suspended = await PostAsync(_dana, id, "suspend", new { note = Note, confirmed = true });
        using var refused = await Staff.SignInAsync(_client, "joel@christianfitness.ca", Staff.Password);
        Assert.Equal(HttpStatusCode.Forbidden, refused.StatusCode);

        using var response = await ReinstateAsync(_dana, id);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var signIn = await Staff.SignInAsync(_client, "joel@christianfitness.ca", Staff.Password);
        Assert.Equal(HttpStatusCode.Accepted, signIn.StatusCode);
    }

    [Fact]
    public async Task Given_a_member_session_When_it_reinstates_Then_it_is_refused_with_401_and_nothing_changes()
    {
        await AdminMembers.SetStatusAsync(_factory, _tyler, MemberStatus.Flagged);
        using var signedIn = await Browser.SignInAsync(_client, "tsimmons22@gmail.com", Staff.Password);

        using var response = await ReinstateAsync(Browser.SessionCookie(signedIn), _tyler);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal("flagged", (await RowAsync(_tyler)).GetProperty("status").GetString());
    }

    private Task<HttpResponseMessage> ReinstateAsync(string cookie, Guid id) =>
        SendAsync(cookie, $"/api/admin/members/{id}/reinstate", content: null);

    private Task<HttpResponseMessage> PostAsync(string cookie, Guid id, string action, object body) =>
        SendAsync(cookie, $"/api/admin/members/{id}/{action}", JsonContent.Create(body));

    private async Task<HttpResponseMessage> SendAsync(string cookie, string path, HttpContent? content)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, new Uri(path, UriKind.Relative)) { Content = content };
        request.Headers.Add("Cookie", cookie);
        return await _client.SendAsync(request, TestContext.Current.CancellationToken);
    }

    private async Task<JsonElement> RowAsync(Guid id)
    {
        var list = await AdminMembers.ListAsync(_client, _dana);
        return list.GetProperty("members").EnumerateArray().Single(m => m.GetProperty("id").GetGuid() == id);
    }

    private async Task<Guid> IdOfAsync(string email)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var normalized = Member.NormalizeEmail(email);
        return await db.Members.Where(m => m.NormalizedEmail == normalized).Select(m => m.Id).SingleAsync(TestContext.Current.CancellationToken);
    }

    private static async Task AssertRefusedAsync(HttpResponseMessage response, HttpStatusCode status, string code)
    {
        Assert.Equal(status, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal(["code", "status", "title", "traceId", "type"], problem.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.Equal(code, problem.GetProperty("code").GetString());
    }
}
