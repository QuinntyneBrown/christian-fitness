using System.Net;
using System.Net.Http.Json;
using ChristianFitness.Domain.Members;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Members;

/// <summary>
/// L2-019 AC3 (ADR 0023) for L2-029: flagging and suspending are staff changes, so each one that
/// goes through leaves one audit entry naming who did it and to which member, and one that is
/// refused leaves none. The entry keeps no note. Each test starts its own API.
/// </summary>
public sealed class ModerateMemberAuditTests : IAsyncLifetime
{
    private const string DanaEmail = "dana.audit@christianfitness.ca";

    private readonly AdminMembersFactory _factory = new();
    private HttpClient _client = null!;
    private Guid _priya;
    private string _dana = string.Empty;

    public async ValueTask InitializeAsync()
    {
        _client = Browser.CreateClient(_factory);
        _priya = await AdminMembers.JoinAsync(_factory, _client, "Priya Nair", "priya.audit@gmail.com", homeChurch: null);
        _dana = await AdminMembers.SignInStaffAsync(_factory, _client, DanaEmail, StaffRoleName.Admin);
    }

    public async ValueTask DisposeAsync()
    {
        _client.Dispose();
        await _factory.DisposeAsync();
    }

    [Theory]
    [InlineData("flag", "member.flagged")]
    [InlineData("suspend", "member.suspended")]
    public async Task Given_signed_in_staff_When_they_moderate_a_member_Then_an_audit_entry_records_who_did_what_to_whom(string action, string audited)
    {
        using var response = await PostAsync(_priya, action, new { note = "Seen pressuring newcomers", confirmed = true });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var dana = await db.Members.Where(m => m.NormalizedEmail == DanaEmail).Select(m => m.Id).SingleAsync(TestContext.Current.CancellationToken);
        var entry = Assert.Single(await db.AuditEntries.Where(e => e.RecordId == _priya).ToListAsync(TestContext.Current.CancellationToken));
        Assert.Equal((dana, audited, "Member"), (entry.ActorMemberId, entry.Action, entry.RecordType));
        Assert.Equal(_factory.Time.GetUtcNow(), entry.OccurredAt);
    }

    public static TheoryData<string, string, string> Refused() => new()
    {
        // why, action, body
        { "a flag with no note", "flag", "{}" },
        { "a suspension not confirmed", "suspend", """{"note":"Spam","confirmed":false}""" },
        { "a suspension of a suspended member", "suspend", """{"note":"Again","confirmed":true}""" },
    };

    [Theory]
    [MemberData(nameof(Refused))]
    public async Task Given_a_moderation_that_is_refused_When_it_is_sent_Then_no_audit_entry_is_recorded(string why, string action, string body)
    {
        if (why.Contains("suspended member", StringComparison.Ordinal))
        {
            await AdminMembers.SetStatusAsync(_factory, _priya, MemberStatus.Suspended);
        }

        using var request = new HttpRequestMessage(HttpMethod.Post, new Uri($"/api/admin/members/{_priya}/{action}", UriKind.Relative))
        {
            Content = new StringContent(body, System.Text.Encoding.UTF8, "application/json"),
        };
        request.Headers.Add("Cookie", _dana);
        using var response = await _client.SendAsync(request, TestContext.Current.CancellationToken);

        Assert.True((int)response.StatusCode >= 400, $"{why}: {response.StatusCode}");
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Empty(await db.AuditEntries.Where(e => e.RecordId == _priya).ToListAsync(TestContext.Current.CancellationToken));
    }

    private async Task<HttpResponseMessage> PostAsync(Guid id, string action, object body)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, new Uri($"/api/admin/members/{id}/{action}", UriKind.Relative)) { Content = JsonContent.Create(body) };
        request.Headers.Add("Cookie", _dana);
        return await _client.SendAsync(request, TestContext.Current.CancellationToken);
    }
}
