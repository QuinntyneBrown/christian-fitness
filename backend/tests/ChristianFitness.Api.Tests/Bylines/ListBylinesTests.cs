using System.Net;
using System.Text.Json;
using ChristianFitness.Domain.Members;

namespace ChristianFitness.Api.Tests.Bylines;

/// <summary>
/// L2-077 AC1 and AC10 (ADR 0094): an Admin lists every byline in name order, without regard to
/// case, each with its name, short bio, photo key and how many stories use it; a Moderator is
/// refused with 403 <c>forbidden_role</c>.
/// </summary>
public sealed class ListBylinesTests(BylinesFactory factory) : IClassFixture<BylinesFactory>
{
    [Fact]
    public async Task Given_bylines_When_an_Admin_lists_them_Then_each_shows_in_name_order_with_its_bio_photo_and_story_count()
    {
        await factory.AddBylineAsync("List Beta Writer", "Writes the beta pieces.", stories: 2);
        await factory.AddBylineAsync("list alpha writer", "Writes the alpha pieces.", stories: 0, photoKey: "0190c0de000070008000000000000001.png");
        await factory.AddBylineAsync("List Gamma Writer", "Writes the gamma pieces.", stories: 1);
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminBylines.SignInAsync(factory, client, "dana.bylines.list@example.org");

        var rows = await AdminBylines.RowsStartingAsync(client, cookie, "list ");

        Assert.Equal(
            [
                ("list alpha writer", "Writes the alpha pieces.", "0190c0de000070008000000000000001.png", 0),
                ("List Beta Writer", "Writes the beta pieces.", null, 2),
                ("List Gamma Writer", "Writes the gamma pieces.", null, 1),
            ],
            rows.Select(r => (r.GetProperty("name").GetString(), r.GetProperty("bio").GetString(), r.GetProperty("photoKey").GetString(), r.GetProperty("stories").GetInt32())));
        Assert.All(rows, r => Assert.Equal(["id", "name", "bio", "photoKey", "stories"], AdminBylines.Keys(r)));
    }

    [Fact]
    public async Task Given_an_Admin_When_they_list_the_bylines_Then_the_answer_holds_only_the_bylines()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminBylines.SignInAsync(factory, client, "dana.bylines.keys@example.org");

        using var response = await AdminBylines.ListAsync(client, cookie);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var answer = await AdminBylines.JsonAsync(response);
        Assert.Equal(["bylines"], AdminBylines.Keys(answer));
        Assert.Equal(JsonValueKind.Array, answer.GetProperty("bylines").ValueKind);
    }

    [Fact]
    public async Task Given_a_Moderator_When_they_list_the_bylines_Then_it_is_refused_with_forbidden_role()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminBylines.SignInAsync(factory, client, "joel.bylines.list@example.org", StaffRoleName.Moderator);

        using var response = await AdminBylines.ListAsync(client, cookie);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal("forbidden_role", (await AdminBylines.JsonAsync(response)).GetProperty("code").GetString());
    }
}
