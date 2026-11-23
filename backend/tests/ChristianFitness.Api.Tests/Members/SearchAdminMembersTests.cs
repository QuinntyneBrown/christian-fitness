using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Domain.Members;

namespace ChristianFitness.Api.Tests.Members;

/// <summary>
/// L2-028 AC2, AC3 and AC6 (ADR 0022): a search keeps the members whose name or email contains it,
/// whatever its case; a status keeps the members with that status; both together keep those that
/// pass both; and what the list cannot answer is refused with 400 <c>validation_failed</c>. The
/// cast is the Members mock's, with Dana Reyes, the staff member asking, who joined last.
/// </summary>
public sealed class SearchAdminMembersTests : IAsyncLifetime
{
    private readonly AdminMembersFactory _factory = new();
    private HttpClient _client = null!;
    private string _cookie = string.Empty;

    public async ValueTask InitializeAsync()
    {
        _client = Browser.CreateClient(_factory);
        await AdminMembers.JoinAsync(_factory, _client, "Michael Chen", "mchen.runs@outlook.com", "Toronto Chinese Baptist");
        await AdminMembers.JoinAsync(_factory, _client, "Grace Thompson", "grace.thompson@gmail.com", "Grace Fellowship, Scarborough");
        var tyler = await AdminMembers.JoinAsync(_factory, _client, "Tyler Simmons", "tsimmons22@gmail.com", homeChurch: null);
        var kevin = await AdminMembers.JoinAsync(_factory, _client, "Kevin Brooks", "kbrooks.fit@gmail.com", homeChurch: null);
        await AdminMembers.SetStatusAsync(_factory, tyler, MemberStatus.Suspended);
        await AdminMembers.SetStatusAsync(_factory, kevin, MemberStatus.Flagged);
        _cookie = await AdminMembers.SignInStaffAsync(_factory, _client, "dana@christianfitness.ca");
        await AdminMembers.RenameAsync(_factory, "dana@christianfitness.ca", "Dana Reyes");
    }

    public async ValueTask DisposeAsync()
    {
        _client.Dispose();
        await _factory.DisposeAsync();
    }

    public static TheoryData<string, string, string[]> Lists() => new()
    {
        // why, query string, the names answered, newest first
        { "no search and no status", "", ["Dana Reyes", "Kevin Brooks", "Tyler Simmons", "Grace Thompson", "Michael Chen"] },
        { "the All tab", "?status=all", ["Dana Reyes", "Kevin Brooks", "Tyler Simmons", "Grace Thompson", "Michael Chen"] },
        { "a name in another case", "?q=GRACE", ["Grace Thompson"] },
        { "part of an email in another case", "?q=Runs%40OUTLOOK", ["Michael Chen"] },
        { "a term with spaces around it", "?q=%20%20chen%20", ["Michael Chen"] },
        { "a term several members share", "?q=gmail", ["Kevin Brooks", "Tyler Simmons", "Grace Thompson"] },
        { "a term nobody has", "?q=Jessica", [] },
        { "a home church is not searched", "?q=Fellowship", [] },
        { "the Active tab", "?status=active", ["Dana Reyes", "Grace Thompson", "Michael Chen"] },
        { "the Flagged tab", "?status=flagged", ["Kevin Brooks"] },
        { "the Suspended tab", "?status=suspended", ["Tyler Simmons"] },
        { "a status and a search together", "?status=active&q=gmail", ["Grace Thompson"] },
        { "a status and a search nobody passes", "?status=flagged&q=grace", [] },
        { "a search of exactly 100 characters", "?q=" + new string('g', 100), [] },
    };

    [Theory]
    [MemberData(nameof(Lists))]
    public async Task Given_the_cast_When_staff_search_or_filter_Then_only_the_members_who_match_come_with_both_counts(string why, string query, string[] names)
    {
        var list = await AdminMembers.ListAsync(_client, _cookie, query);

        Assert.True(names.SequenceEqual(AdminMembers.NamesOf(list)), $"{why}: {string.Join(", ", AdminMembers.NamesOf(list))}");
        Assert.Equal(names.Length, list.GetProperty("matches").GetInt32());
        // The community's size, whatever was searched for.
        Assert.Equal(5, list.GetProperty("total").GetInt32());
        Assert.Equal(1, list.GetProperty("page").GetInt32());
    }

    [Theory]
    [InlineData("a status the list does not have", "?status=banned")]
    [InlineData("a status in title case", "?status=Active")]
    [InlineData("page 0", "?page=0")]
    [InlineData("a page below 0", "?page=-1")]
    [InlineData("a page that is not a number", "?page=two")]
    [InlineData("a search of 101 characters", "?q=ggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg")]
    public async Task Given_a_question_the_list_cannot_answer_When_staff_ask_it_Then_it_is_refused_with_400_validation_failed(string why, string query)
    {
        using var response = await Browser.SendAsync(_client, HttpMethod.Get, "/api/admin/members" + query, _cookie);

        Assert.True(response.StatusCode == HttpStatusCode.BadRequest, $"{why}: {response.StatusCode}");
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("validation_failed", problem.GetProperty("code").GetString());
        // The refusal repeats nothing staff searched for.
        Assert.DoesNotContain("ggggg", problem.GetRawText(), StringComparison.Ordinal);
    }
}
