using System.Net;
using ChristianFitness.Api.Tests.Events;
using ChristianFitness.Domain.Members;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Bylines;

/// <summary>
/// L2-077 AC6, AC7, AC10 and AC11 (ADR 0093): Remove byline takes a byline no story uses off the
/// list, answers 204 and records <c>byline.removed</c>. A byline a story uses is refused with 409
/// <c>byline_in_use</c> and stays; an unknown one is 404 <c>not_found</c>; a Moderator is refused.
/// </summary>
public sealed class RemoveBylineTests(BylinesFactory factory) : IClassFixture<BylinesFactory>
{
    private static Task<HttpResponseMessage> RemoveAsync(HttpClient client, string cookie, Guid id) =>
        AdminEvents.SendAsync(client, HttpMethod.Delete, $"{AdminBylines.Path}/{id}", cookie);

    [Fact]
    public async Task Given_a_byline_no_story_uses_When_an_Admin_removes_it_Then_it_answers_204_and_leaves_the_list()
    {
        var id = await factory.AddBylineAsync("Unused Writer");
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminBylines.SignInAsync(factory, client, "dana.bylines.remove@example.org");

        using var response = await RemoveAsync(client, cookie, id);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Null(await factory.FindBylineAsync(id));
        Assert.Empty(await AdminBylines.RowsStartingAsync(client, cookie, "Unused Writer"));
    }

    [Fact]
    public async Task Given_a_byline_When_an_Admin_removes_it_Then_an_audit_entry_records_who_and_which_byline()
    {
        var id = await factory.AddBylineAsync("Audited Removed Writer");
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminBylines.SignInAsync(factory, client, "dana.bylines.remove.audit@example.org");

        using var response = await RemoveAsync(client, cookie, id);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var staffId = await db.Members.Where(m => m.NormalizedEmail == "dana.bylines.remove.audit@example.org").Select(m => m.Id).SingleAsync(TestContext.Current.CancellationToken);
        var entry = Assert.Single(await db.AuditEntries.Where(e => e.RecordId == id).ToListAsync(TestContext.Current.CancellationToken));
        Assert.Equal((staffId, "byline.removed", "Byline"), (entry.ActorMemberId, entry.Action, entry.RecordType));
    }

    [Fact]
    public async Task Given_a_byline_a_story_uses_When_an_Admin_removes_it_Then_it_is_refused_with_byline_in_use_and_stays()
    {
        var id = await factory.AddBylineAsync("Used Writer", stories: 1);
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminBylines.SignInAsync(factory, client, "dana.bylines.remove.used@example.org");

        using var response = await RemoveAsync(client, cookie, id);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal("byline_in_use", (await AdminBylines.JsonAsync(response)).GetProperty("code").GetString());
        Assert.NotNull(await factory.FindBylineAsync(id));
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(0, await db.AuditEntries.CountAsync(e => e.RecordId == id, TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task Given_an_unknown_byline_When_it_is_removed_Then_it_is_refused_with_not_found()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminBylines.SignInAsync(factory, client, "dana.bylines.remove.unknown@example.org");

        using var response = await RemoveAsync(client, cookie, Guid.NewGuid());

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("not_found", (await AdminBylines.JsonAsync(response)).GetProperty("code").GetString());
    }

    [Fact]
    public async Task Given_a_Moderator_When_they_remove_a_byline_Then_it_is_refused_with_forbidden_role_and_stays()
    {
        var id = await factory.AddBylineAsync("Moderated Removed Writer");
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminBylines.SignInAsync(factory, client, "joel.bylines.remove@example.org", StaffRoleName.Moderator);

        using var response = await RemoveAsync(client, cookie, id);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.NotNull(await factory.FindBylineAsync(id));
    }
}
