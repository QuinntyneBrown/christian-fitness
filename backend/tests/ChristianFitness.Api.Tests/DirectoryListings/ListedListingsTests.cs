using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using ChristianFitness.Api.Tests.Events;
using ChristianFitness.Domain.Directory;
using ChristianFitness.Domain.Members;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Api.Tests.DirectoryListings;

/// <summary>
/// L2-073 AC10 and AC13 (journey 18; ADR 0090): Listed shows every published listing in name order,
/// 50 at a time, with its kind, area, Verified mark and followers (ADR 0088's follows); staff Edit changes its name,
/// kind, area, tagline, about, website and photo, never the Verified mark, audited
/// <c>listing.updated</c>. A photo is uploaded first (audited <c>listing_photo.uploaded</c>) and
/// served to anyone at <c>/api/directory/photos/{key}</c>.
/// </summary>
public sealed class ListedListingsTests(RegisterForEventFactory factory) : IClassFixture<RegisterForEventFactory>
{
    private static readonly byte[] Png = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00];

    private readonly ReviewSuggestions _review = new(factory);

    private Task<Guid> ListingAsync(string name, ListingStatus status = ListingStatus.Published, bool verified = true, ListingKind kind = ListingKind.Organization) =>
        _review.InDbAsync(async db =>
        {
            var now = factory.Time.GetUtcNow();
            var listing = DirectoryListing.CreateDraft(Guid.CreateVersion7(now), kind, name, "A tagline", "Etobicoke", ["Running"], now, "About it.", "https://example.org", verified);
            if (status == ListingStatus.Published)
            {
                listing.Publish(now);
            }

            db.DirectoryListings.Add(listing);
            await db.SaveChangesAsync(TestContext.Current.CancellationToken);
            return listing.Id;
        });

    private static Dictionary<string, object?> Edit(string name = "Lakeshore Runners", string kind = "company") => new(StringComparer.Ordinal)
    {
        ["name"] = name,
        ["kind"] = kind,
        ["area"] = "Mimico",
        ["tagline"] = "Beginner-friendly running club",
        ["about"] = "A west-end run club.",
        ["website"] = "lakeshorerunners.ca",
        ["photoKey"] = null,
    };

    [Fact]
    public async Task Given_published_and_unpublished_listings_When_staff_open_Listed_Then_the_published_ones_show_in_name_order_with_their_fields()
    {
        var zebra = await ListingAsync("Listed Zebra Club", verified: false);
        var alpha = await ListingAsync("Listed Alpha Club", kind: ListingKind.Instructor);
        await ListingAsync("Listed Draft Club", ListingStatus.Draft);
        var first = await _review.SuggestAsync("ada.follows1@example.org", "Ada Follows");
        var second = await _review.SuggestAsync("ben.follows1@example.org", "Ben Follows");
        await _review.InDbAsync(async db =>
        {
            db.ListingFollows.Add(ListingFollow.Of(first.MemberId, alpha, factory.Time.GetUtcNow()));
            db.ListingFollows.Add(ListingFollow.Of(second.MemberId, alpha, factory.Time.GetUtcNow()));
            return await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        });
        var (staff, cookie, _) = await _review.StaffAsync("dana.listed1@example.org", StaffRoleName.Moderator);
        using var _staff = staff;
        var published = await _review.InDbAsync(db => db.DirectoryListings.CountAsync(l => l.Status == ListingStatus.Published, TestContext.Current.CancellationToken));

        using var response = await ReviewSuggestions.SendAsync(staff, HttpMethod.Get, "/listings", cookie);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var answer = await ReviewSuggestions.JsonAsync(response);
        Assert.Equal(["listings", "next", "total"], answer.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.Equal(published, answer.GetProperty("total").GetInt32());
        var rows = answer.GetProperty("listings").EnumerateArray().ToList();
        var names = rows.Select(r => r.GetProperty("name").GetString()).ToList();
        Assert.DoesNotContain("Listed Draft Club", names);
        Assert.True(names.IndexOf("Listed Alpha Club") < names.IndexOf("Listed Zebra Club"));
        var shown = rows.Single(r => r.GetProperty("id").GetGuid() == alpha);
        Assert.Equal(
            ["about", "area", "followers", "id", "kind", "name", "photoKey", "tagline", "verified", "website"],
            shown.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.Equal(("instructor", "Etobicoke", "A tagline", "About it.", "https://example.org", true, 2),
            (shown.GetProperty("kind").GetString(), shown.GetProperty("area").GetString(), shown.GetProperty("tagline").GetString(),
             shown.GetProperty("about").GetString(), shown.GetProperty("website").GetString(), shown.GetProperty("verified").GetBoolean(),
             shown.GetProperty("followers").GetInt32()));
        Assert.Equal(0, rows.Single(r => r.GetProperty("id").GetGuid() == zebra).GetProperty("followers").GetInt32());
        Assert.False(rows.Single(r => r.GetProperty("id").GetGuid() == zebra).GetProperty("verified").GetBoolean());
        // The class shares one store, so another test may have listed more than a page already.
        Assert.Equal(published > 50 ? JsonValueKind.String : JsonValueKind.Null, answer.GetProperty("next").ValueKind);
    }

    [Fact]
    public async Task Given_more_than_50_published_listings_When_staff_load_more_Then_each_page_holds_50_and_follows_on()
    {
        for (var i = 0; i < 52; i++)
        {
            await ListingAsync($"Paged Club {i:D2}");
        }

        var (staff, cookie, _) = await _review.StaffAsync("dana.listed2@example.org");
        using var _staff = staff;
        var all = await _review.InDbAsync(db => db.DirectoryListings.Where(l => l.Status == ListingStatus.Published)
            .OrderBy(l => l.NameKey).ThenBy(l => l.Id).Select(l => l.Id).ToListAsync(TestContext.Current.CancellationToken));

        var seen = new List<Guid>();
        string? after = null;
        var pages = 0;
        do
        {
            using var response = await ReviewSuggestions.SendAsync(staff, HttpMethod.Get, after is null ? "/listings" : $"/listings?after={after}", cookie);
            var answer = await ReviewSuggestions.JsonAsync(response);
            var page = answer.GetProperty("listings").EnumerateArray().Select(r => r.GetProperty("id").GetGuid()).ToList();
            Assert.True(page.Count <= 50);
            seen.AddRange(page);
            after = answer.GetProperty("next").ValueKind == JsonValueKind.Null ? null : answer.GetProperty("next").GetString();
            if (after is not null)
            {
                Assert.Equal(50, page.Count);
                Assert.Equal(page[^1].ToString(), after);
            }

            pages++;
        }
        while (after is not null);

        Assert.Equal(all, seen);
        Assert.True(pages >= 2);
    }

    [Fact]
    public async Task Given_a_published_listing_When_staff_edit_it_Then_it_is_saved_audited_and_its_Verified_mark_is_kept()
    {
        var id = await ListingAsync("Lakeshore Runners Fellowship");
        var (staff, cookie, staffId) = await _review.StaffAsync("dana.listed3@example.org");
        using var _staff = staff;
        using var uploaded = await UploadAsync(staff, cookie, Png, "logo.png");
        Assert.Equal(HttpStatusCode.Created, uploaded.StatusCode);
        var photoKey = (await ReviewSuggestions.JsonAsync(uploaded)).GetProperty("photoKey").GetString();
        var body = Edit("  Lakeshore Runners  ");
        body["photoKey"] = photoKey;
        body["verified"] = false;

        using var response = await ReviewSuggestions.SendAsync(staff, HttpMethod.Put, $"/listings/{id}", cookie, body);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var saved = await ReviewSuggestions.JsonAsync(response);
        Assert.Equal(("Lakeshore Runners", "company", "https://lakeshorerunners.ca", photoKey, true),
            (saved.GetProperty("name").GetString(), saved.GetProperty("kind").GetString(), saved.GetProperty("website").GetString(),
             saved.GetProperty("photoKey").GetString(), saved.GetProperty("verified").GetBoolean()));
        var listing = await _review.InDbAsync(db => db.DirectoryListings.SingleAsync(l => l.Id == id, TestContext.Current.CancellationToken));
        Assert.Equal(
            ("Lakeshore Runners", ListingKind.Company, "Mimico", "Beginner-friendly running club", "A west-end run club.", "https://lakeshorerunners.ca", photoKey, true, ListingStatus.Published),
            (listing.Name, listing.Kind, listing.Area, listing.Tagline, listing.Description, listing.WebsiteUrl, listing.PhotoKey, listing.IsVerified, listing.Status));
        Assert.Equal(["Running"], listing.Focus);
        var entry = await _review.InDbAsync(db => db.AuditEntries.SingleAsync(e => e.RecordId == id && e.Action == "listing.updated", TestContext.Current.CancellationToken));
        Assert.Equal(staffId, entry.ActorMemberId);
        var photoRecord = Guid.ParseExact(photoKey![..32], "N");
        var photoEntry = await _review.InDbAsync(db => db.AuditEntries.SingleAsync(e => e.RecordId == photoRecord, TestContext.Current.CancellationToken));
        Assert.Equal("listing_photo.uploaded", photoEntry.Action);

        using var visitor = Browser.CreateClient(factory);
        using var served = await visitor.GetAsync(new Uri($"/api/directory/photos/{photoKey}", UriKind.Relative), TestContext.Current.CancellationToken);
        using var unknown = await visitor.GetAsync(new Uri("/api/directory/photos/fedcba9876543210fedcba9876543210.png", UriKind.Relative), TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, served.StatusCode);
        Assert.Equal("image/png", served.Content.Headers.ContentType?.MediaType);
        Assert.Equal(Png, await served.Content.ReadAsByteArrayAsync(TestContext.Current.CancellationToken));
        Assert.Equal(HttpStatusCode.NotFound, unknown.StatusCode);
    }

    public static TheoryData<string, object?, string> Refusals => new()
    {
        { "name", "  ", "name_required" },
        { "name", new string('a', 121), "name_too_long" },
        { "kind", "wizard", "kind_invalid" },
        { "area", "", "area_required" },
        { "area", new string('a', 121), "area_too_long" },
        { "tagline", new string('a', 101), "tagline_too_long" },
        { "about", new string('a', 1001), "about_too_long" },
        { "website", "not a website", "website_invalid" },
        { "website", "http://example.org", "website_invalid" },
        { "website", "example.org/" + new string('a', 200), "website_too_long" },
        { "photoKey", "fedcba9876543210fedcba9876543210.png", "photo_invalid" },
        { "photoKey", "../appsettings.json", "photo_invalid" },
    };

    [Theory]
    [MemberData(nameof(Refusals))]
    public async Task Given_a_field_that_breaks_a_rule_When_staff_save_Then_it_is_refused_with_its_code_and_nothing_changes(string field, object? value, string code)
    {
        var id = await ListingAsync($"Refused Club {field} {code}");
        var (staff, cookie, _) = await _review.StaffAsync($"dana.listed.{code}.{field}.{value?.ToString()?.Length ?? 0}@example.org");
        using var _staff = staff;
        var body = Edit();
        body[field] = value;

        using var response = await ReviewSuggestions.SendAsync(staff, HttpMethod.Put, $"/listings/{id}", cookie, body);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await ReviewSuggestions.JsonAsync(response);
        Assert.Equal(code, problem.GetProperty("fieldCodes").GetProperty(field).GetString());
        var listing = await _review.InDbAsync(db => db.DirectoryListings.SingleAsync(l => l.Id == id, TestContext.Current.CancellationToken));
        Assert.Equal($"Refused Club {field} {code}", listing.Name);
    }

    [Fact]
    public async Task Given_an_unknown_listing_or_a_file_that_is_not_an_image_When_staff_send_it_Then_it_is_refused()
    {
        var (staff, cookie, _) = await _review.StaffAsync("dana.listed4@example.org");
        using var _staff = staff;

        using var unknown = await ReviewSuggestions.SendAsync(staff, HttpMethod.Put, $"/listings/{Guid.NewGuid()}", cookie, Edit());
        using var text = await UploadAsync(staff, cookie, "hello"u8.ToArray(), "logo.png");

        Assert.Equal(HttpStatusCode.NotFound, unknown.StatusCode);
        Assert.Equal("not_found", (await ReviewSuggestions.JsonAsync(unknown)).GetProperty("code").GetString());
        Assert.Equal(HttpStatusCode.BadRequest, text.StatusCode);
        Assert.Equal("photo_invalid", (await ReviewSuggestions.JsonAsync(text)).GetProperty("fieldCodes").GetProperty("photo").GetString());
    }

    [Fact]
    public async Task Given_a_member_When_they_call_Listed_or_its_editor_Then_they_are_refused()
    {
        var id = await ListingAsync("Member Refused Club");
        var member = await _review.SuggestAsync("jordan.listed5@example.org", "Jordan Reid");
        using var client = Browser.CreateClient(factory);

        using var list = await ReviewSuggestions.SendAsync(client, HttpMethod.Get, "/listings", member.Cookie);
        using var edit = await ReviewSuggestions.SendAsync(client, HttpMethod.Put, $"/listings/{id}", member.Cookie, Edit());

        Assert.Equal(HttpStatusCode.Unauthorized, list.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, edit.StatusCode);
    }

    private static async Task<HttpResponseMessage> UploadAsync(HttpClient client, string cookie, byte[] bytes, string fileName)
    {
        using var file = new ByteArrayContent(bytes);
        file.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        using var form = new MultipartFormDataContent { { file, "file", fileName } };
        using var request = new HttpRequestMessage(HttpMethod.Post, new Uri(ReviewSuggestions.Base + "/photos", UriKind.Relative)) { Content = form };
        request.Headers.Add("Cookie", cookie);
        return await client.SendAsync(request, TestContext.Current.CancellationToken).ConfigureAwait(false);
    }
}
