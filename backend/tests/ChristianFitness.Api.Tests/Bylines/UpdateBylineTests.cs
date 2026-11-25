using System.Net;
using ChristianFitness.Api.Tests.Events;
using ChristianFitness.Domain.Members;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Bylines;

/// <summary>
/// L2-077 AC4, AC5, AC10 and AC11 (ADR 0094): Save byline changes the name, bio and photo, keeps the
/// stories that use it (they hold its id, so they show the new name), answers 200 with it and
/// records <c>byline.updated</c>. The byline's own name in another case is not taken; another
/// byline's is refused with 409 <c>byline_name_taken</c>; an unknown byline is 404
/// <c>not_found</c>.
/// </summary>
public sealed class UpdateBylineTests(BylinesFactory factory) : IClassFixture<BylinesFactory>
{
    private static Task<HttpResponseMessage> UpdateAsync(HttpClient client, string cookie, Guid id, object body) =>
        AdminEvents.SendAsync(client, HttpMethod.Put, $"{AdminBylines.Path}/{id}", cookie, body);

    [Fact]
    public async Task Given_a_byline_stories_use_When_an_Admin_saves_it_Then_it_answers_200_with_the_changes_and_keeps_its_stories()
    {
        var id = await factory.AddBylineAsync("Marcus Bell Update", "Personal trainer.", stories: 2);
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminBylines.SignInAsync(factory, client, "dana.bylines.update@example.org");

        using var response = await UpdateAsync(client, cookie, id, AddBylineTests.Body("Marcus J. Bell Update", "Personal trainer and coach."));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var byline = await AdminBylines.JsonAsync(response);
        Assert.Equal(["id", "name", "bio", "photoKey", "stories"], AdminBylines.Keys(byline));
        Assert.Equal(
            (id.ToString(), "Marcus J. Bell Update", "Personal trainer and coach.", 2),
            (byline.GetProperty("id").GetString(), byline.GetProperty("name").GetString(), byline.GetProperty("bio").GetString(), byline.GetProperty("stories").GetInt32()));
        var stored = await factory.FindBylineAsync(id);
        Assert.Equal(("Marcus J. Bell Update", "marcus j. bell update"), (stored!.Name, stored.NameKey));
    }

    [Fact]
    public async Task Given_a_byline_When_an_Admin_saves_it_Then_an_audit_entry_records_who_and_which_byline()
    {
        var id = await factory.AddBylineAsync("Audited Update Writer");
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminBylines.SignInAsync(factory, client, "dana.bylines.update.audit@example.org");

        using var response = await UpdateAsync(client, cookie, id, AddBylineTests.Body("Audited Update Writer", "A new bio."));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var staffId = await db.Members.Where(m => m.NormalizedEmail == "dana.bylines.update.audit@example.org").Select(m => m.Id).SingleAsync(TestContext.Current.CancellationToken);
        var entry = Assert.Single(await db.AuditEntries.Where(e => e.RecordId == id).ToListAsync(TestContext.Current.CancellationToken));
        Assert.Equal((staffId, "byline.updated", "Byline"), (entry.ActorMemberId, entry.Action, entry.RecordType));
    }

    [Fact]
    public async Task Given_a_byline_When_it_is_saved_with_its_own_name_in_another_case_Then_it_is_not_taken()
    {
        var id = await factory.AddBylineAsync("Own Name Writer");
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminBylines.SignInAsync(factory, client, "dana.bylines.update.own@example.org");

        using var response = await UpdateAsync(client, cookie, id, AddBylineTests.Body("OWN NAME WRITER"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("OWN NAME WRITER", (await AdminBylines.JsonAsync(response)).GetProperty("name").GetString());
    }

    [Fact]
    public async Task Given_another_bylines_name_When_a_byline_is_saved_with_it_Then_it_is_refused_with_byline_name_taken_and_nothing_changes()
    {
        await factory.AddBylineAsync("Priya Raman Taken");
        var id = await factory.AddBylineAsync("Priya Other", "Nutrition writer.");
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminBylines.SignInAsync(factory, client, "dana.bylines.update.taken@example.org");

        using var response = await UpdateAsync(client, cookie, id, AddBylineTests.Body("priya raman taken", "Changed."));

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal("byline_name_taken", (await AdminBylines.JsonAsync(response)).GetProperty("code").GetString());
        var stored = await factory.FindBylineAsync(id);
        Assert.Equal(("Priya Other", "Nutrition writer."), (stored!.Name, stored.Bio));
    }

    [Fact]
    public async Task Given_a_field_that_fails_When_a_byline_is_saved_Then_it_is_refused_naming_the_field()
    {
        var id = await factory.AddBylineAsync("Refused Update Writer");
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminBylines.SignInAsync(factory, client, "dana.bylines.update.refused@example.org");

        using var response = await UpdateAsync(client, cookie, id, AddBylineTests.Body("", ""));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await AdminBylines.JsonAsync(response);
        Assert.Equal("validation_failed", problem.GetProperty("code").GetString());
        Assert.Equal(["name", "bio"], AdminBylines.Keys(problem.GetProperty("fieldCodes")));
        Assert.Equal(
            ("name_required", "bio_required"),
            (problem.GetProperty("fieldCodes").GetProperty("name").GetString(), problem.GetProperty("fieldCodes").GetProperty("bio").GetString()));
    }

    [Fact]
    public async Task Given_an_unknown_byline_When_it_is_saved_Then_it_is_refused_with_not_found()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminBylines.SignInAsync(factory, client, "dana.bylines.update.unknown@example.org");

        using var response = await UpdateAsync(client, cookie, Guid.NewGuid(), AddBylineTests.Body("Nobody Here"));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("not_found", (await AdminBylines.JsonAsync(response)).GetProperty("code").GetString());
    }

    [Fact]
    public async Task Given_a_Moderator_When_they_save_a_byline_Then_it_is_refused_with_forbidden_role()
    {
        var id = await factory.AddBylineAsync("Moderated Update Writer");
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminBylines.SignInAsync(factory, client, "joel.bylines.update@example.org", StaffRoleName.Moderator);

        using var response = await UpdateAsync(client, cookie, id, AddBylineTests.Body("Changed By Moderator"));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal("Moderated Update Writer", (await factory.FindBylineAsync(id))!.Name);
    }
}
