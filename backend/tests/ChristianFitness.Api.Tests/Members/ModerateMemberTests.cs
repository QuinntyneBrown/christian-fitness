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
/// L2-029 AC1, AC2 and AC4 to AC8 (ADR 0023): staff flag an Active member and suspend an Active or
/// Flagged one, each with a note the row then shows; suspending ends every session of the member
/// and closes sign-in; and each thing the API will not do is refused with its own code, changing
/// nothing. Each test starts its own API.
/// </summary>
public sealed class ModerateMemberTests : IAsyncLifetime
{
    private const string Note = "Two members asked about messages from this account";
    private const string DanaEmail = "dana@christianfitness.ca";

    private readonly AdminMembersFactory _factory = new();
    private HttpClient _client = null!;
    private Guid _priya;
    private string _dana = string.Empty;

    public async ValueTask InitializeAsync()
    {
        _client = Browser.CreateClient(_factory);
        _priya = await AdminMembers.JoinAsync(_factory, _client, "Priya Nair", "priya.nair@gmail.com", "Hope Church Mississauga");
        _dana = await AdminMembers.SignInStaffAsync(_factory, _client, DanaEmail, StaffRoleName.Admin);
    }

    public async ValueTask DisposeAsync()
    {
        _client.Dispose();
        await _factory.DisposeAsync();
    }

    [Fact]
    public async Task Given_an_active_member_When_staff_flag_them_with_a_note_Then_they_are_flagged_the_row_shows_the_note_and_they_stay_signed_in()
    {
        using var signedIn = await Browser.SignInAsync(_client, "priya.nair@gmail.com", Staff.Password);
        var priyaCookie = Browser.SessionCookie(signedIn);

        using var response = await FlagAsync(_dana, _priya, new { note = $"  {Note} " });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var row = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal(
            ["email", "eventsAttended", "homeChurch", "id", "joinedAt", "name", "note", "status"],
            row.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.Equal(_priya, row.GetProperty("id").GetGuid());
        Assert.Equal("flagged", row.GetProperty("status").GetString());
        Assert.Equal(Note, row.GetProperty("note").GetString());

        var listed = await RowAsync(_priya);
        Assert.Equal("flagged", listed.GetProperty("status").GetString());
        Assert.Equal(Note, listed.GetProperty("note").GetString());
        // Flagging restricts nothing: the member's session still opens.
        using var session = await Browser.SendAsync(_client, HttpMethod.Get, "/api/session", priyaCookie);
        Assert.Equal(HttpStatusCode.OK, session.StatusCode);
    }

    [Fact]
    public async Task Given_a_signed_in_member_When_staff_suspend_them_Then_they_are_suspended_their_sessions_end_and_sign_in_is_refused()
    {
        using var signedIn = await Browser.SignInAsync(_client, "priya.nair@gmail.com", Staff.Password);
        var first = Browser.SessionCookie(signedIn);
        using var again = await Browser.SignInAsync(_client, "priya.nair@gmail.com", Staff.Password);
        var second = Browser.SessionCookie(again);

        using var response = await SuspendAsync(_dana, _priya, new { note = Note, confirmed = true });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var row = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("suspended", row.GetProperty("status").GetString());
        Assert.Equal(Note, row.GetProperty("note").GetString());
        Assert.Equal("suspended", (await RowAsync(_priya)).GetProperty("status").GetString());
        foreach (var cookie in new[] { first, second })
        {
            using var session = await Browser.SendAsync(_client, HttpMethod.Get, "/api/session", cookie);
            Assert.Equal(HttpStatusCode.Unauthorized, session.StatusCode);
        }

        using var signIn = await Browser.SignInAsync(_client, "priya.nair@gmail.com", Staff.Password);
        await AssertRefusedAsync(signIn, HttpStatusCode.Forbidden, "account_suspended");
        // The staff member who suspended them is still signed in.
        using var staff = await Browser.SendAsync(_client, HttpMethod.Get, "/api/admin/session", _dana);
        Assert.Equal(HttpStatusCode.OK, staff.StatusCode);
    }

    [Fact]
    public async Task Given_a_flagged_member_When_staff_suspend_them_Then_they_are_suspended_and_the_new_note_replaces_the_old()
    {
        using var flagged = await FlagAsync(_dana, _priya, new { note = Note });
        Assert.Equal(HttpStatusCode.OK, flagged.StatusCode);

        using var response = await SuspendAsync(_dana, _priya, new { note = "Spam messages to the Sunrise 5K group", confirmed = true });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var listed = await RowAsync(_priya);
        Assert.Equal("suspended", listed.GetProperty("status").GetString());
        Assert.Equal("Spam messages to the Sunrise 5K group", listed.GetProperty("note").GetString());
    }

    [Fact]
    public async Task Given_a_member_nobody_moderated_When_staff_list_members_Then_their_note_is_none()
    {
        Assert.Equal(JsonValueKind.Null, (await RowAsync(_priya)).GetProperty("note").ValueKind);
    }

    public static TheoryData<string, string, string, string, string> Bodies() => new()
    {
        // why, action, body, the field, its code
        { "flag with no note", "flag", "{}", "note", "note_required" },
        { "flag with a blank note", "flag", """{"note":"   "}""", "note", "note_required" },
        { "flag with a note of 501 characters", "flag", $$"""{"note":"{{new string('n', 501)}}"}""", "note", "note_too_long" },
        { "suspend with no note", "suspend", """{"confirmed":true}""", "note", "note_required" },
        { "suspend with a note of 501 characters", "suspend", $$"""{"note":"{{new string('n', 501)}}","confirmed":true}""", "note", "note_too_long" },
        { "suspend not confirmed", "suspend", """{"note":"Spam","confirmed":false}""", "confirmed", "confirmation_required" },
        { "suspend with no confirmation at all", "suspend", """{"note":"Spam"}""", "confirmed", "confirmation_required" },
    };

    [Theory]
    [MemberData(nameof(Bodies))]
    public async Task Given_a_body_that_breaks_a_rule_When_staff_send_it_Then_it_is_refused_with_the_fields_code_and_nothing_changes(string why, string action, string body, string field, string code)
    {
        using var response = await SendAsync(_dana, _priya, action, body);

        Assert.True(response.StatusCode == HttpStatusCode.BadRequest, $"{why}: {response.StatusCode}");
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("validation_failed", problem.GetProperty("code").GetString());
        Assert.Equal([field], problem.GetProperty("fieldCodes").EnumerateObject().Select(p => p.Name));
        Assert.Equal(code, problem.GetProperty("fieldCodes").GetProperty(field).GetString());
        // The refusal repeats nothing staff wrote.
        Assert.DoesNotContain("nnnnn", problem.GetRawText(), StringComparison.Ordinal);
        var listed = await RowAsync(_priya);
        Assert.Equal("active", listed.GetProperty("status").GetString());
        Assert.Equal(JsonValueKind.Null, listed.GetProperty("note").ValueKind);
    }

    [Fact]
    public async Task Given_a_note_of_exactly_500_characters_When_staff_flag_Then_it_is_kept_whole()
    {
        using var response = await FlagAsync(_dana, _priya, new { note = new string('n', 500) });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(500, (await RowAsync(_priya)).GetProperty("note").GetString()!.Length);
    }

    [Theory]
    [InlineData(MemberStatus.Flagged, "flag")]
    [InlineData(MemberStatus.Suspended, "flag")]
    [InlineData(MemberStatus.Suspended, "suspend")]
    public async Task Given_a_status_that_does_not_allow_the_change_When_staff_ask_for_it_Then_it_is_refused_with_409_status_conflict(MemberStatus status, string action)
    {
        await AdminMembers.SetStatusAsync(_factory, _priya, status);

        using var response = await SendAsync(_dana, _priya, action, """{"note":"Again","confirmed":true}""");

        await AssertRefusedAsync(response, HttpStatusCode.Conflict, "status_conflict");
        var listed = await RowAsync(_priya);
        Assert.Equal(MemberStatusName(status), listed.GetProperty("status").GetString());
        Assert.Equal(JsonValueKind.Null, listed.GetProperty("note").ValueKind);
    }

    [Theory]
    [InlineData("flag")]
    [InlineData("suspend")]
    public async Task Given_an_id_no_member_has_When_staff_moderate_it_Then_it_is_refused_with_404_member_not_found(string action)
    {
        using var response = await SendAsync(_dana, Guid.CreateVersion7(), action, """{"note":"Nobody","confirmed":true}""");

        await AssertRefusedAsync(response, HttpStatusCode.NotFound, "member_not_found");
    }

    [Theory]
    [InlineData("flag")]
    [InlineData("suspend")]
    public async Task Given_staff_When_they_moderate_their_own_account_Then_it_is_refused_with_cannot_moderate_self_and_they_stay_signed_in(string action)
    {
        var self = await IdOfAsync(DanaEmail);

        using var response = await SendAsync(_dana, self, action, """{"note":"Me","confirmed":true}""");

        await AssertRefusedAsync(response, HttpStatusCode.Forbidden, "cannot_moderate_self");
        Assert.Equal("active", (await RowAsync(self)).GetProperty("status").GetString());
        using var staff = await Browser.SendAsync(_client, HttpMethod.Get, "/api/admin/session", _dana);
        Assert.Equal(HttpStatusCode.OK, staff.StatusCode);
    }

    public static TheoryData<string, StaffRoleName, StaffRoleName?, string, HttpStatusCode> Roles() => new()
    {
        // why, who moderates, the target's staff role, action, the answer
        { "a Moderator flags a member", StaffRoleName.Moderator, null, "flag", HttpStatusCode.OK },
        { "a Moderator suspends a member", StaffRoleName.Moderator, null, "suspend", HttpStatusCode.OK },
        { "a Moderator flags an Admin", StaffRoleName.Moderator, StaffRoleName.Admin, "flag", HttpStatusCode.Forbidden },
        { "a Moderator suspends an Admin", StaffRoleName.Moderator, StaffRoleName.Admin, "suspend", HttpStatusCode.Forbidden },
        { "a Moderator suspends another Moderator", StaffRoleName.Moderator, StaffRoleName.Moderator, "suspend", HttpStatusCode.Forbidden },
        { "an Admin flags a Moderator", StaffRoleName.Admin, StaffRoleName.Moderator, "flag", HttpStatusCode.OK },
        { "an Admin suspends another Admin", StaffRoleName.Admin, StaffRoleName.Admin, "suspend", HttpStatusCode.OK },
    };

    [Theory]
    [MemberData(nameof(Roles))]
    public async Task Given_staff_and_a_target_When_they_moderate_Then_only_an_Admin_moderates_staff(string why, StaffRoleName actor, StaffRoleName? target, string action, HttpStatusCode expected)
    {
        var cookie = await AdminMembers.SignInStaffAsync(_factory, _client, "actor@christianfitness.ca", actor);
        var id = target is { } role
            ? Guid.Parse(await Staff.CreateAsync(_factory, _client, "target@christianfitness.ca", role))
            : _priya;

        using var response = await SendAsync(cookie, id, action, """{"note":"A reason","confirmed":true}""");

        Assert.True(response.StatusCode == expected, $"{why}: {response.StatusCode}");
        if (expected == HttpStatusCode.Forbidden)
        {
            await AssertRefusedAsync(response, HttpStatusCode.Forbidden, "forbidden_role");
            Assert.Equal("active", (await RowAsync(id)).GetProperty("status").GetString());
        }
    }

    // L2-029 AC8: suspension closes the admin app too.
    [Fact]
    public async Task Given_signed_in_staff_When_an_Admin_suspends_them_Then_their_staff_session_ends_and_staff_sign_in_is_refused()
    {
        var joel = await AdminMembers.SignInStaffAsync(_factory, _client, "joel@christianfitness.ca", StaffRoleName.Moderator);
        var id = await IdOfAsync("joel@christianfitness.ca");

        using var response = await SuspendAsync(_dana, id, new { note = Note, confirmed = true });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var session = await Browser.SendAsync(_client, HttpMethod.Get, "/api/admin/session", joel);
        Assert.Equal(HttpStatusCode.Unauthorized, session.StatusCode);
        using var signIn = await Staff.SignInAsync(_client, "joel@christianfitness.ca", Staff.Password);
        await AssertRefusedAsync(signIn, HttpStatusCode.Forbidden, "account_suspended");
        Assert.Null(Staff.StepSetCookie(signIn));
    }

    [Fact]
    public async Task Given_staff_between_the_password_and_the_code_When_an_Admin_suspends_them_Then_the_code_opens_nothing()
    {
        await Staff.CreateAsync(_factory, _client, "joel.pending@christianfitness.ca", StaffRoleName.Moderator);
        using var passwordStep = await Staff.SignInAsync(_client, "joel.pending@christianfitness.ca", Staff.Password);
        var step = Staff.StepCookie(passwordStep);
        var id = await IdOfAsync("joel.pending@christianfitness.ca");

        using var response = await SuspendAsync(_dana, id, new { note = Note, confirmed = true });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var verify = await Staff.VerifyAsync(_client, step, Staff.CodeAt(_factory.Time.GetUtcNow()));
        Assert.Equal(HttpStatusCode.Unauthorized, verify.StatusCode);
        Assert.Null(Staff.SetCookie(verify));
    }

    [Theory]
    [InlineData("flag")]
    [InlineData("suspend")]
    public async Task Given_a_member_session_When_it_moderates_Then_it_is_refused_with_401_and_nothing_changes(string action)
    {
        using var signedIn = await Browser.SignInAsync(_client, "priya.nair@gmail.com", Staff.Password);

        using var response = await SendAsync(Browser.SessionCookie(signedIn), _priya, action, """{"note":"Me","confirmed":true}""");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal("active", (await RowAsync(_priya)).GetProperty("status").GetString());
    }

    private Task<HttpResponseMessage> FlagAsync(string cookie, Guid id, object body) =>
        AdminMembersSend(cookie, $"/api/admin/members/{id}/flag", JsonContent.Create(body));

    private Task<HttpResponseMessage> SuspendAsync(string cookie, Guid id, object body) =>
        AdminMembersSend(cookie, $"/api/admin/members/{id}/suspend", JsonContent.Create(body));

    private Task<HttpResponseMessage> SendAsync(string cookie, Guid id, string action, string json) =>
        AdminMembersSend(cookie, $"/api/admin/members/{id}/{action}", new StringContent(json, System.Text.Encoding.UTF8, "application/json"));

    private async Task<HttpResponseMessage> AdminMembersSend(string cookie, string path, HttpContent content)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, new Uri(path, UriKind.Relative)) { Content = content };
        request.Headers.Add("Cookie", cookie);
        return await _client.SendAsync(request, TestContext.Current.CancellationToken);
    }

    /// <summary>The member's row as the list answers it to Dana.</summary>
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

    private static string MemberStatusName(MemberStatus status) => status switch
    {
        MemberStatus.Flagged => "flagged",
        MemberStatus.Suspended => "suspended",
        _ => "active",
    };

    /// <summary>A refusal that carries only the code: nothing of the member, the note or the role.</summary>
    private static async Task AssertRefusedAsync(HttpResponseMessage response, HttpStatusCode status, string code)
    {
        Assert.Equal(status, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal(["code", "status", "title", "traceId", "type"], problem.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.Equal(code, problem.GetProperty("code").GetString());
    }
}
