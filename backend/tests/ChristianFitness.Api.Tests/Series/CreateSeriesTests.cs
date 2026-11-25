using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using ChristianFitness.Api.Tests.Events;
using ChristianFitness.Domain.Directory;
using ChristianFitness.Domain.Members;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Series;

/// <summary>
/// L2-071 AC10 to AC12 and AC16 (ADR 0089, ADR 0091): New series makes a series with no dates from
/// the editor's fields, answers 201 with it as the page shows it and records <c>series.created</c>
/// as <c>EventSeries</c>; a Moderator may do it too, with the series' own host and image routes. A
/// field that fails is refused with 400 <c>validation_failed</c> naming it in <c>fieldCodes</c>, and
/// nothing is saved or audited. One row per case.
/// </summary>
public sealed class CreateSeriesTests(AdminSeriesFactory factory) : IClassFixture<AdminSeriesFactory>
{
    private static readonly byte[] Png = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00];

    /// <summary>Sunday Stretch &amp; Prayer, from the series editor mock, as the editor sends it.</summary>
    internal static Dictionary<string, object?> Stretch() => new(StringComparer.Ordinal)
    {
        ["title"] = "Sunday Stretch & Prayer",
        ["category"] = "mobility",
        ["summary"] = "Forty minutes of gentle stretching and mobility, then a short time of prayer. All levels, no equipment.",
        ["imageKey"] = null,
        ["hostListingId"] = DirectoryListing.TeamListingId,
        ["priceCents"] = 0,
        ["dropInPriceCents"] = 0,
        ["capacity"] = 25,
        ["place"] = "St. Lawrence Community Rec Centre",
        ["area"] = "Downtown, Toronto",
    };

    internal static Task<HttpResponseMessage> CreateAsync(HttpClient client, string cookie, object body) =>
        AdminEvents.SendAsync(client, HttpMethod.Post, "/api/admin/series", cookie, body);

    [Fact]
    public async Task Given_an_Admin_When_they_create_a_series_Then_it_answers_201_with_no_dates_and_the_list_shows_it()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminSeries.SignInAsync(factory, client, "dana.series.create@example.org");

        using var response = await CreateAsync(client, cookie, Stretch());

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var series = await AdminSeries.JsonAsync(response);
        Assert.Equal("Sunday Stretch & Prayer", series.GetProperty("title").GetString());
        Assert.Equal("mobility", series.GetProperty("category").GetString());
        Assert.Equal("Christian Fitness", series.GetProperty("host").GetProperty("name").GetString());
        Assert.Equal(JsonValueKind.Null, series.GetProperty("cadence").GetProperty("weekday").ValueKind);
        Assert.Equal(0, series.GetProperty("cadence").GetProperty("dates").GetInt32());
        Assert.Equal(JsonValueKind.Null, series.GetProperty("startsAt").ValueKind);
        Assert.Equal(
            (0, 0, 25, 0, 0, 0),
            (series.GetProperty("priceCents").GetInt32(), series.GetProperty("dropInPriceCents").GetInt32(), series.GetProperty("capacity").GetInt32(),
             series.GetProperty("joined").GetInt32(), series.GetProperty("sessionsLeft").GetInt32(), series.GetProperty("sessionsHeld").GetInt32()));
        Assert.Equal(("St. Lawrence Community Rec Centre", "Downtown, Toronto"), (series.GetProperty("place").GetString(), series.GetProperty("area").GetString()));
        Assert.Empty(series.GetProperty("sessions").EnumerateArray());

        var id = series.GetProperty("id").GetString();
        using var list = await AdminEvents.SendAsync(client, HttpMethod.Get, "/api/admin/series", cookie);
        var rows = (await AdminSeries.JsonAsync(list)).GetProperty("series").EnumerateArray();
        Assert.Contains(rows, row => row.GetProperty("id").GetString() == id);
    }

    [Fact]
    public async Task Given_a_series_with_no_drop_in_When_it_is_created_Then_it_keeps_none()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminSeries.SignInAsync(factory, client, "dana.series.create.nodropin@example.org");
        var body = Stretch();
        body["title"] = "Bootcamp with no drop-in";
        body["priceCents"] = 6400;
        body["dropInPriceCents"] = null;

        using var response = await CreateAsync(client, cookie, body);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var series = await AdminSeries.JsonAsync(response);
        Assert.Equal(6400, series.GetProperty("priceCents").GetInt32());
        Assert.Equal(JsonValueKind.Null, series.GetProperty("dropInPriceCents").ValueKind);
    }

    [Fact]
    public async Task Given_an_Admin_When_they_create_a_series_Then_an_audit_entry_records_who_and_which_series()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminSeries.SignInAsync(factory, client, "dana.series.create.audit@example.org");

        using var response = await CreateAsync(client, cookie, Stretch());

        var id = Guid.Parse((await AdminSeries.JsonAsync(response)).GetProperty("id").GetString()!);
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var staffId = await db.Members.Where(m => m.NormalizedEmail == "dana.series.create.audit@example.org").Select(m => m.Id).SingleAsync(TestContext.Current.CancellationToken);
        var entry = Assert.Single(await db.AuditEntries.Where(e => e.RecordId == id).ToListAsync(TestContext.Current.CancellationToken));
        Assert.Equal((staffId, "series.created", "EventSeries"), (entry.ActorMemberId, entry.Action, entry.RecordType));
    }

    // L2-071 AC8, AC16 (ADR 0064): a Moderator creates a series, with its host picker and image upload.
    [Fact]
    public async Task Given_a_Moderator_When_they_pick_a_host_upload_an_image_and_create_a_series_Then_none_is_refused()
    {
        await factory.AddListingAsync(ListingKind.Organization, "Lakeshore Runners Fellowship");
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminSeries.SignInAsync(factory, client, "joel.series.create@example.org", StaffRoleName.Moderator);

        using var team = await AdminEvents.SendAsync(client, HttpMethod.Get, "/api/admin/series/hosts/default", cookie);
        using var matches = await AdminEvents.SendAsync(client, HttpMethod.Get, "/api/admin/series/hosts?q=lakeshore", cookie);
        using var image = await UploadAsync(client, cookie);
        var body = Stretch();
        body["title"] = "Moderator's stretch";
        body["imageKey"] = (await AdminSeries.JsonAsync(image)).GetProperty("imageKey").GetString();
        using var created = await CreateAsync(client, cookie, body);

        Assert.Equal(
            (HttpStatusCode.OK, HttpStatusCode.OK, HttpStatusCode.Created, HttpStatusCode.Created),
            (team.StatusCode, matches.StatusCode, image.StatusCode, created.StatusCode));
        Assert.Equal(DirectoryListing.TeamListingId.ToString(), (await AdminSeries.JsonAsync(team)).GetProperty("id").GetString());
        Assert.Equal(
            ["Lakeshore Runners Fellowship"],
            (await AdminSeries.JsonAsync(matches)).GetProperty("hosts").EnumerateArray().Select(h => h.GetProperty("name").GetString()));
        Assert.Equal(body["imageKey"], (await AdminSeries.JsonAsync(created)).GetProperty("imageKey").GetString());
    }

    public static TheoryData<string, string, string> Refusals() => new()
    {
        // the field changed and how, the fieldCodes key, the code expected
        { "title blank", "title", "title_required" },
        { "title too long", "title", "title_too_long" },
        { "category unknown", "category", "category_required" },
        { "host missing", "hostListingId", "host_required" },
        { "host unknown", "hostListingId", "host_not_listed" },
        { "host a draft", "hostListingId", "host_not_listed" },
        { "summary blank", "summary", "summary_required" },
        { "summary too long", "summary", "summary_too_long" },
        { "image unknown", "imageKey", "image_invalid" },
        { "price missing", "priceCents", "price_invalid" },
        { "price negative", "priceCents", "price_invalid" },
        { "price over $10,000", "priceCents", "price_invalid" },
        { "drop-in negative", "dropInPriceCents", "price_invalid" },
        { "drop-in over $10,000", "dropInPriceCents", "price_invalid" },
        { "capacity missing", "capacity", "capacity_required" },
        { "capacity 0", "capacity", "capacity_out_of_range" },
        { "capacity over 10,000", "capacity", "capacity_out_of_range" },
        { "place blank", "place", "place_required" },
        { "place too long", "place", "place_too_long" },
        { "area blank", "area", "area_required" },
        { "area too long", "area", "area_too_long" },
    };

    private async Task<Dictionary<string, object?>> BodyWithAsync(string change)
    {
        var body = Stretch();
        body["title"] = $"Refused: {change}";
        switch (change)
        {
            case "title blank": body["title"] = "  "; break;
            case "title too long": body["title"] = new string('t', 121); break;
            case "category unknown": body["category"] = "yoga"; break;
            case "host missing": body["hostListingId"] = null; break;
            case "host unknown": body["hostListingId"] = Guid.NewGuid(); break;
            case "host a draft": body["hostListingId"] = await factory.AddListingAsync(ListingKind.Organization, "Draft Series Host", ListingStatus.Draft); break;
            case "summary blank": body["summary"] = ""; break;
            case "summary too long": body["summary"] = new string('s', 1001); break;
            case "image unknown": body["imageKey"] = "0123456789abcdef0123456789abcdef.png"; break;
            case "price missing": body["priceCents"] = null; break;
            case "price negative": body["priceCents"] = -1; break;
            case "price over $10,000": body["priceCents"] = 1_000_001; break;
            case "drop-in negative": body["dropInPriceCents"] = -1; break;
            case "drop-in over $10,000": body["dropInPriceCents"] = 1_000_001; break;
            case "capacity missing": body["capacity"] = null; break;
            case "capacity 0": body["capacity"] = 0; break;
            case "capacity over 10,000": body["capacity"] = 10_001; break;
            case "place blank": body["place"] = " "; break;
            case "place too long": body["place"] = new string('p', 201); break;
            case "area blank": body["area"] = ""; break;
            case "area too long": body["area"] = new string('a', 101); break;
            default: throw new ArgumentOutOfRangeException(nameof(change), change, "An unknown row.");
        }

        return body;
    }

    [Theory]
    [MemberData(nameof(Refusals))]
    public async Task Given_a_field_that_fails_When_a_series_is_created_Then_it_is_refused_naming_the_field_and_nothing_is_saved(string change, string field, string code)
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminSeries.SignInAsync(factory, client, $"dana.series.refused.{change.Replace(' ', '.').Replace(",", "").Replace("$", "")}@example.org");
        var body = await BodyWithAsync(change);
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var seriesBefore = await db.EventSeries.CountAsync(TestContext.Current.CancellationToken);
        var auditsBefore = await db.AuditEntries.CountAsync(e => e.Action == "series.created", TestContext.Current.CancellationToken);

        using var response = await CreateAsync(client, cookie, body);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await AdminSeries.JsonAsync(response);
        Assert.Equal("validation_failed", problem.GetProperty("code").GetString());
        Assert.Equal([field], AdminSeries.Keys(problem.GetProperty("fieldCodes")));
        Assert.Equal(code, problem.GetProperty("fieldCodes").GetProperty(field).GetString());
        Assert.Equal(seriesBefore, await db.EventSeries.CountAsync(TestContext.Current.CancellationToken));
        Assert.Equal(auditsBefore, await db.AuditEntries.CountAsync(e => e.Action == "series.created", TestContext.Current.CancellationToken));
    }

    private static async Task<HttpResponseMessage> UploadAsync(HttpClient client, string cookie)
    {
        using var file = new ByteArrayContent(Png);
        file.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        using var form = new MultipartFormDataContent { { file, "file", "stretch.png" } };
        using var request = new HttpRequestMessage(HttpMethod.Post, new Uri("/api/admin/series/images", UriKind.Relative)) { Content = form };
        request.Headers.Add("Cookie", cookie);
        return await client.SendAsync(request, TestContext.Current.CancellationToken).ConfigureAwait(false);
    }
}
