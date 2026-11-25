using System.Net;
using System.Net.Http.Headers;
using ChristianFitness.Api.Tests.Events;
using ChristianFitness.Domain.Members;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Bylines;

/// <summary>
/// L2-077 AC3, AC4, AC10 and AC11 (ADR 0094): Add byline saves a name, a short bio of at most 200
/// characters and an optional photo, answers 201 with the byline and records <c>byline.created</c>
/// as <c>Byline</c>. A field that fails is refused with 400 <c>validation_failed</c> naming it in
/// <c>fieldCodes</c>; a name another byline has, in any case, with 409 <c>byline_name_taken</c>;
/// either way nothing is saved or audited. One row per case.
/// </summary>
public sealed class AddBylineTests(BylinesFactory factory) : IClassFixture<BylinesFactory>
{
    internal static readonly byte[] Png = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00];

    internal static Dictionary<string, object?> Body(string name, string bio = "Writes about running clubs across the GTA.", string? photoKey = null) =>
        new(StringComparer.Ordinal) { ["name"] = name, ["bio"] = bio, ["photoKey"] = photoKey };

    internal static Task<HttpResponseMessage> AddAsync(HttpClient client, string cookie, object body) =>
        AdminEvents.SendAsync(client, HttpMethod.Post, AdminBylines.Path, cookie, body);

    internal static async Task<HttpResponseMessage> UploadAsync(HttpClient client, string cookie, byte[] content, string type = "image/png")
    {
        using var file = new ByteArrayContent(content);
        file.Headers.ContentType = new MediaTypeHeaderValue(type);
        using var form = new MultipartFormDataContent { { file, "file", "byline.png" } };
        using var request = new HttpRequestMessage(HttpMethod.Post, new Uri($"{AdminBylines.Path}/photos", UriKind.Relative)) { Content = form };
        request.Headers.Add("Cookie", cookie);
        return await client.SendAsync(request, TestContext.Current.CancellationToken).ConfigureAwait(false);
    }

    [Fact]
    public async Task Given_an_Admin_When_they_add_a_byline_with_a_photo_Then_it_answers_201_and_the_list_shows_it()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminBylines.SignInAsync(factory, client, "dana.bylines.add@example.org");
        using var photo = await UploadAsync(client, cookie, Png);
        Assert.Equal(HttpStatusCode.Created, photo.StatusCode);
        var photoKey = (await AdminBylines.JsonAsync(photo)).GetProperty("photoKey").GetString();

        using var response = await AddAsync(client, cookie, Body("  Esther Mwangi  ", "  Runs with the Scarborough group and writes about it.  ", photoKey));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var byline = await AdminBylines.JsonAsync(response);
        Assert.Equal(["id", "name", "bio", "photoKey", "stories"], AdminBylines.Keys(byline));
        Assert.Equal(
            ("Esther Mwangi", "Runs with the Scarborough group and writes about it.", photoKey, 0),
            (byline.GetProperty("name").GetString(), byline.GetProperty("bio").GetString(), byline.GetProperty("photoKey").GetString(), byline.GetProperty("stories").GetInt32()));
        var rows = await AdminBylines.RowsStartingAsync(client, cookie, "Esther Mwangi");
        Assert.Equal([byline.GetProperty("id").GetString()], rows.Select(r => r.GetProperty("id").GetString()));
    }

    [Fact]
    public async Task Given_an_Admin_When_they_add_a_byline_Then_an_audit_entry_records_who_and_which_byline()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminBylines.SignInAsync(factory, client, "dana.bylines.add.audit@example.org");

        using var response = await AddAsync(client, cookie, Body("Audited Writer"));

        var id = Guid.Parse((await AdminBylines.JsonAsync(response)).GetProperty("id").GetString()!);
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var staffId = await db.Members.Where(m => m.NormalizedEmail == "dana.bylines.add.audit@example.org").Select(m => m.Id).SingleAsync(TestContext.Current.CancellationToken);
        var entry = Assert.Single(await db.AuditEntries.Where(e => e.RecordId == id).ToListAsync(TestContext.Current.CancellationToken));
        Assert.Equal((staffId, "byline.created", "Byline"), (entry.ActorMemberId, entry.Action, entry.RecordType));
    }

    // The limits themselves are kept: 80 characters of name and 200 of bio.
    [Fact]
    public async Task Given_a_name_of_80_and_a_bio_of_200_characters_When_the_byline_is_added_Then_it_is_saved()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminBylines.SignInAsync(factory, client, "dana.bylines.add.limits@example.org");

        using var response = await AddAsync(client, cookie, Body("L" + new string('n', 79), new string('b', 200)));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    public static TheoryData<string, string, string> Refusals() => new()
    {
        // the field changed and how, the fieldCodes key, the code expected
        { "name blank", "name", "name_required" },
        { "name missing", "name", "name_required" },
        { "name too long", "name", "name_too_long" },
        { "bio blank", "bio", "bio_required" },
        { "bio too long", "bio", "bio_too_long" },
        { "photo unknown", "photoKey", "photo_invalid" },
        { "photo not a key", "photoKey", "photo_invalid" },
    };

    private static Dictionary<string, object?> BodyWith(string change)
    {
        var body = Body($"Refused {change}");
        switch (change)
        {
            case "name blank": body["name"] = "   "; break;
            case "name missing": body["name"] = null; break;
            case "name too long": body["name"] = new string('n', 81); break;
            case "bio blank": body["bio"] = " "; break;
            case "bio too long": body["bio"] = new string('b', 201); break;
            case "photo unknown": body["photoKey"] = "0123456789abcdef0123456789abcdef.png"; break;
            case "photo not a key": body["photoKey"] = "../secrets.png"; break;
            default: throw new ArgumentOutOfRangeException(nameof(change), change, "An unknown row.");
        }

        return body;
    }

    [Theory]
    [MemberData(nameof(Refusals))]
    public async Task Given_a_field_that_fails_When_a_byline_is_added_Then_it_is_refused_naming_the_field_and_nothing_is_saved(string change, string field, string code)
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminBylines.SignInAsync(factory, client, $"dana.bylines.refused.{change.Replace(' ', '.')}@example.org");
        var (bylines, audits) = await CountsAsync();

        using var response = await AddAsync(client, cookie, BodyWith(change));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await AdminBylines.JsonAsync(response);
        Assert.Equal("validation_failed", problem.GetProperty("code").GetString());
        Assert.Equal([field], AdminBylines.Keys(problem.GetProperty("fieldCodes")));
        Assert.Equal(code, problem.GetProperty("fieldCodes").GetProperty(field).GetString());
        Assert.Equal((bylines, audits), await CountsAsync());
    }

    // L2-077 AC4: compared without regard to case, and with the spaces around it trimmed.
    [Theory]
    [InlineData("Taken Writer A", "Taken Writer A")]
    [InlineData("Taken Writer B", "TAKEN WRITER B")]
    [InlineData("Taken Writer C", "  taken writer c ")]
    public async Task Given_a_name_another_byline_has_When_a_byline_is_added_Then_it_is_refused_with_byline_name_taken(string existing, string name)
    {
        await factory.AddBylineAsync(existing);
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminBylines.SignInAsync(factory, client, $"dana.bylines.taken.{existing[^1]}@example.org");
        var (bylines, audits) = await CountsAsync();

        using var response = await AddAsync(client, cookie, Body(name));

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal("byline_name_taken", (await AdminBylines.JsonAsync(response)).GetProperty("code").GetString());
        Assert.Equal((bylines, audits), await CountsAsync());
    }

    [Fact]
    public async Task Given_a_file_that_is_not_an_image_When_it_is_uploaded_Then_it_is_refused_with_photo_invalid()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminBylines.SignInAsync(factory, client, "dana.bylines.photo.text@example.org");

        using var response = await UploadAsync(client, cookie, "not an image"u8.ToArray(), "image/png");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await AdminBylines.JsonAsync(response);
        Assert.Equal("validation_failed", problem.GetProperty("code").GetString());
        Assert.Equal("photo_invalid", problem.GetProperty("fieldCodes").GetProperty("photo").GetString());
    }

    [Fact]
    public async Task Given_a_Moderator_When_they_add_a_byline_or_upload_a_photo_Then_both_are_refused_with_forbidden_role()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminBylines.SignInAsync(factory, client, "joel.bylines.add@example.org", StaffRoleName.Moderator);

        using var added = await AddAsync(client, cookie, Body("Moderator's Writer"));
        using var photo = await UploadAsync(client, cookie, Png);

        Assert.Equal((HttpStatusCode.Forbidden, HttpStatusCode.Forbidden), (added.StatusCode, photo.StatusCode));
        Assert.Equal("forbidden_role", (await AdminBylines.JsonAsync(added)).GetProperty("code").GetString());
        Assert.Equal("forbidden_role", (await AdminBylines.JsonAsync(photo)).GetProperty("code").GetString());
    }

    private async Task<(int Bylines, int Audits)> CountsAsync()
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return (
            await db.Bylines.CountAsync(TestContext.Current.CancellationToken),
            await db.AuditEntries.CountAsync(e => e.Action == "byline.created", TestContext.Current.CancellationToken));
    }
}
