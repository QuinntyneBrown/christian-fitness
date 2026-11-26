using System.Net;
using System.Text.Json;
using ChristianFitness.Domain.Directory;
using ChristianFitness.Domain.News;

namespace ChristianFitness.Api.Tests.Stories;

/// <summary>
/// L2-069 AC1, AC8, AC11 and AC12, and L2-068 AC4 (ADR 0097): New story makes an empty Draft; the
/// editor reads a story and saves a Draft or a story In review as it is typed, each save answered
/// with the next version; a save over a version the editor has not seen is refused with
/// <c>story_changed</c> and changes nothing; a Published story is not autosaved; each field's rule
/// refuses with its code, one row per case; the editor's choices list bylines, events and listings.
/// </summary>
public sealed class WriteStoryTests(StoriesFactory factory) : IClassFixture<StoriesFactory>
{
    internal static readonly string[] StoryKeys =
    [
        "id", "status", "version", "headline", "summary", "text", "section", "bylineId", "placement", "includeInWeekly",
        "pointsTo", "nextStepText", "nextStepLink", "slug", "image", "savedAt", "publishedAt",
    ];

    /// <summary>The editor's fields; every one may be overridden.</summary>
    internal static Dictionary<string, object?> Fields(Guid? bylineId = null, int? version = null) =>
        new(StringComparer.Ordinal)
        {
            ["headline"] = "  Fasting and training  ",
            ["summary"] = "Lena Park on keeping a fast and keeping moving.",
            ["text"] = "For many members, Lent means giving something up.\n\n> Fasting and training can live together.",
            ["section"] = "nutrition",
            ["bylineId"] = bylineId,
            ["placement"] = "top",
            ["includeInWeekly"] = true,
            ["pointsTo"] = null,
            ["nextStepText"] = null,
            ["nextStepLink"] = null,
            ["slug"] = null,
            ["image"] = null,
            ["version"] = version,
        };

    internal static Task<HttpResponseMessage> CreateAsync(HttpClient client, string cookie, object body) =>
        AdminStories.SendAsync(client, HttpMethod.Post, AdminStories.Path, cookie, body);

    internal static Task<HttpResponseMessage> SaveAsync(HttpClient client, string cookie, Guid id, object body) =>
        AdminStories.SendAsync(client, HttpMethod.Put, $"{AdminStories.Path}/{id}", cookie, body);

    /// <summary>Creates a story through the API and answers its id and version.</summary>
    internal static async Task<(Guid Id, int Version)> CreatedAsync(HttpClient client, string cookie, object body)
    {
        using var response = await CreateAsync(client, cookie, body);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var story = await AdminStories.JsonAsync(response);
        return (Guid.Parse(story.GetProperty("id").GetString()!), story.GetProperty("version").GetInt32());
    }

    [Fact]
    public async Task Given_an_Admin_When_they_write_a_new_story_Then_it_is_a_Draft_holding_what_they_wrote()
    {
        var byline = await factory.AddBylineAsync("Write New Writer");
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminStories.SignInAsync(factory, client, "dana.stories.new@example.org");

        using var response = await CreateAsync(client, cookie, Fields(byline));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var story = await AdminStories.JsonAsync(response);
        Assert.Equal(StoryKeys, AdminStories.Keys(story));
        Assert.Equal(
            ("draft", 1, "Fasting and training", "nutrition", byline.ToString(), "top", true, factory.Time.GetUtcNow()),
            (story.GetProperty("status").GetString(), story.GetProperty("version").GetInt32(), story.GetProperty("headline").GetString(),
             story.GetProperty("section").GetString(), story.GetProperty("bylineId").GetString(), story.GetProperty("placement").GetString(),
             story.GetProperty("includeInWeekly").GetBoolean(), story.GetProperty("savedAt").GetDateTimeOffset()));
        Assert.Equal(JsonValueKind.Null, story.GetProperty("publishedAt").ValueKind);
        using var read = await AdminStories.GetAsync(client, cookie, $"{AdminStories.Path}/{story.GetProperty("id").GetString()}");
        Assert.Equal(HttpStatusCode.OK, read.StatusCode);
        Assert.Equal(story.GetRawText(), (await AdminStories.JsonAsync(read)).GetRawText());
    }

    [Fact]
    public async Task Given_New_story_When_nothing_is_written_yet_Then_an_empty_Draft_is_kept()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminStories.SignInAsync(factory, client, "dana.stories.empty@example.org");

        using var response = await CreateAsync(client, cookie, new { });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var story = await AdminStories.JsonAsync(response);
        Assert.Equal(
            ("draft", string.Empty, string.Empty, "latest", JsonValueKind.Null, JsonValueKind.Null),
            (story.GetProperty("status").GetString(), story.GetProperty("headline").GetString(), story.GetProperty("text").GetString(),
             story.GetProperty("placement").GetString(), story.GetProperty("section").ValueKind, story.GetProperty("bylineId").ValueKind));
    }

    [Fact]
    public async Task Given_a_Draft_When_the_Admin_saves_over_its_version_Then_the_changes_are_kept_with_the_next_version()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminStories.SignInAsync(factory, client, "dana.stories.save@example.org");
        var (id, version) = await CreatedAsync(client, cookie, Fields());
        factory.Time.Advance(TimeSpan.FromMinutes(3));
        var body = Fields(version: version);
        body["headline"] = "Fasting and training: what a dietitian wants you to know";

        using var response = await SaveAsync(client, cookie, id, body);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var story = await AdminStories.JsonAsync(response);
        Assert.Equal(
            (version + 1, "Fasting and training: what a dietitian wants you to know", factory.Time.GetUtcNow()),
            (story.GetProperty("version").GetInt32(), story.GetProperty("headline").GetString(), story.GetProperty("savedAt").GetDateTimeOffset()));
        Assert.Equal("Fasting and training: what a dietitian wants you to know", (await factory.FindStoryAsync(id))!.Headline);
        Assert.Empty(await factory.AuditOfAsync(id));
    }

    // L2-069 AC12: two Admins edit one story; the second saves over a version they have not seen.
    [Fact]
    public async Task Given_another_Admin_saved_first_When_the_Admin_saves_over_the_older_version_Then_it_is_refused_with_story_changed()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminStories.SignInAsync(factory, client, "dana.stories.changed@example.org");
        using var other = Browser.CreateClient(factory);
        var otherCookie = await AdminStories.SignInAsync(factory, other, "ruth.stories.changed@example.org");
        var (id, version) = await CreatedAsync(client, cookie, Fields());
        var theirs = Fields(version: version);
        theirs["headline"] = "Their headline";
        using var first = await SaveAsync(other, otherCookie, id, theirs);
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        var mine = Fields(version: version);
        mine["headline"] = "My headline";

        using var response = await SaveAsync(client, cookie, id, mine);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal("story_changed", (await AdminStories.JsonAsync(response)).GetProperty("code").GetString());
        var stored = (await factory.FindStoryAsync(id))!;
        Assert.Equal(("Their headline", version + 1), (stored.Headline, stored.Version));
    }

    // L2-069 AC11: a Published story changes only on Update.
    [Fact]
    public async Task Given_a_Published_story_When_a_save_arrives_Then_it_is_refused_with_status_conflict()
    {
        var published = await factory.PutStoryAsync("Saved while published", StoryStatus.Published);
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminStories.SignInAsync(factory, client, "dana.stories.save.published@example.org");

        using var response = await SaveAsync(client, cookie, published.Id, Fields(version: published.Version));

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal("status_conflict", (await AdminStories.JsonAsync(response)).GetProperty("code").GetString());
        Assert.Equal("Saved while published", (await factory.FindStoryAsync(published.Id))!.Headline);
    }

    [Theory]
    [InlineData("GET")]
    [InlineData("PUT")]
    public async Task Given_a_story_that_does_not_exist_When_it_is_asked_for_Then_it_is_404_not_found(string method)
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminStories.SignInAsync(factory, client, $"dana.stories.unknown.{method.ToLowerInvariant()}@example.org");

        using var response = await AdminStories.SendAsync(client, new HttpMethod(method), $"{AdminStories.Path}/{Guid.NewGuid()}", cookie, method == "PUT" ? Fields(version: 1) : null);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("not_found", (await AdminStories.JsonAsync(response)).GetProperty("code").GetString());
    }

    public static TheoryData<string, object?, string?> FieldRules => new()
    {
        { "headline", new string('h', Story.HeadlineMaxLength), null },
        { "headline", new string('h', Story.HeadlineMaxLength + 1), "headline_too_long" },
        { "summary", new string('s', Story.SummaryMaxLength + 1), "summary_too_long" },
        { "section", "sports", "section_invalid" },
        { "placement", "sidebar", "placement_invalid" },
        { "bylineId", Guid.NewGuid().ToString(), "byline_invalid" },
        { "nextStepText", new string('n', Story.NextStepTextMaxLength), null },
        { "nextStepText", new string('n', Story.NextStepTextMaxLength + 1), "next_step_too_long" },
        { "nextStepLink", "/events/0193a000-0000-7000-8000-00000000e001", null },
        { "nextStepLink", "https://www.example.org/register", null },
        { "nextStepLink", "http://www.example.org/register", "next_step_link_invalid" },
        { "nextStepLink", "javascript:alert(1)", "next_step_link_invalid" },
        { "nextStepLink", "//evil.example.org/path", "next_step_link_invalid" },
        { "nextStepLink", "events", "next_step_link_invalid" },
        { "slug", "fasting-and-training-2", null },
        { "slug", "Fasting", "slug_invalid" },
        { "slug", "-fasting", "slug_invalid" },
        { "slug", "fasting--training", "slug_invalid" },
        { "slug", "fasting training", "slug_invalid" },
        { "slug", new string('a', Story.SlugMaxLength + 1), "slug_invalid" },
        { "image", new Dictionary<string, object> { ["key"] = "0123456789abcdef0123456789abcdef.jpg", ["crop"] = new { x = 0, y = 0, width = 1600, height = 900 } }, "image_invalid" },
        { "pointsTo", new Dictionary<string, object> { ["kind"] = "event", ["id"] = Guid.NewGuid() }, "points_to_invalid" },
        { "pointsTo", new Dictionary<string, object> { ["kind"] = "venue", ["id"] = Guid.NewGuid() }, "points_to_invalid" },
    };

    [Theory]
    [MemberData(nameof(FieldRules))]
    public async Task Given_a_field_When_the_story_is_saved_Then_its_rule_keeps_it_or_refuses_it_with_its_code(string field, object? value, string? code)
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminStories.SignInAsync(factory, client, $"dana.stories.rule.{Guid.NewGuid():N}@example.org");
        var (id, version) = await CreatedAsync(client, cookie, Fields());
        var body = Fields(version: version);
        body[field] = value;

        using var response = await SaveAsync(client, cookie, id, body);

        if (code is null)
        {
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            return;
        }

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await AdminStories.JsonAsync(response);
        Assert.Equal([field], AdminStories.Keys(problem.GetProperty("fieldCodes")));
        Assert.Equal(code, problem.GetProperty("fieldCodes").GetProperty(field).GetString());
        Assert.Equal(version, (await factory.FindStoryAsync(id))!.Version);
    }

    [Fact]
    public async Task Given_a_draft_event_or_an_unlisted_listing_When_a_story_points_to_it_Then_it_is_refused_and_a_published_one_is_kept()
    {
        var draftEvent = await factory.AddStoryEventAsync("Draft run", factory.Time.GetUtcNow().AddDays(3), published: false);
        var publishedEvent = await factory.AddStoryEventAsync("Published run", factory.Time.GetUtcNow().AddDays(3));
        var draftListing = await factory.AddListingAsync(ListingKind.Organization, "Unlisted Club", ListingStatus.Draft);
        var listed = await factory.AddListingAsync(ListingKind.Organization, "Listed Club");
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminStories.SignInAsync(factory, client, "dana.stories.points@example.org");
        var (id, _) = await CreatedAsync(client, cookie, Fields());

        async Task<HttpStatusCode> PointAsync(string kind, Guid target)
        {
            var body = Fields(version: (await factory.FindStoryAsync(id))!.Version);
            body["pointsTo"] = new Dictionary<string, object> { ["kind"] = kind, ["id"] = target };
            using var response = await SaveAsync(client, cookie, id, body);
            return response.StatusCode;
        }

        Assert.Equal(
            [HttpStatusCode.BadRequest, HttpStatusCode.OK, HttpStatusCode.BadRequest, HttpStatusCode.OK],
            [await PointAsync("event", draftEvent), await PointAsync("event", publishedEvent), await PointAsync("listing", draftListing), await PointAsync("listing", listed)]);
        var stored = (await factory.FindStoryAsync(id))!;
        Assert.Equal((StoryPointer.Listing, (Guid?)listed), (stored.PointsTo, stored.PointsToId));
    }

    [Fact]
    public async Task Given_another_story_holds_a_link_When_a_story_is_saved_with_it_Then_it_is_refused_with_slug_taken()
    {
        await factory.PutStoryAsync("Holds the link", StoryStatus.Published, slug: "held-link");
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminStories.SignInAsync(factory, client, "dana.stories.slug.taken@example.org");
        var (id, version) = await CreatedAsync(client, cookie, Fields());
        var body = Fields(version: version);
        body["slug"] = "held-link";

        using var response = await SaveAsync(client, cookie, id, body);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("slug_taken", (await AdminStories.JsonAsync(response)).GetProperty("fieldCodes").GetProperty("slug").GetString());
    }

    [Fact]
    public async Task Given_a_save_with_no_version_When_it_arrives_Then_it_is_refused_naming_the_version()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminStories.SignInAsync(factory, client, "dana.stories.noversion@example.org");
        var (id, _) = await CreatedAsync(client, cookie, Fields());

        using var response = await SaveAsync(client, cookie, id, Fields());

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("version_required", (await AdminStories.JsonAsync(response)).GetProperty("fieldCodes").GetProperty("version").GetString());
    }

    [Fact]
    public async Task Given_the_editor_When_it_asks_for_its_choices_Then_it_gets_the_bylines_by_name_and_the_published_events_and_listings()
    {
        await factory.AddBylineAsync("zz Options Last");
        await factory.AddBylineAsync("AA Options First");
        var soon = await factory.AddStoryEventAsync("Options upcoming run", factory.Time.GetUtcNow().AddDays(2));
        var hidden = await factory.AddStoryEventAsync("Options draft run", factory.Time.GetUtcNow().AddDays(2), published: false);
        var listing = await factory.AddListingAsync(ListingKind.Organization, "Options Listed Club");
        var unlisted = await factory.AddListingAsync(ListingKind.Organization, "Options Draft Club", ListingStatus.Draft);
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminStories.SignInAsync(factory, client, "dana.stories.options@example.org");

        using var response = await AdminStories.GetAsync(client, cookie, $"{AdminStories.Path}/options");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var options = await AdminStories.JsonAsync(response);
        Assert.Equal(["bylines", "events", "listings"], AdminStories.Keys(options));
        var bylines = options.GetProperty("bylines").EnumerateArray().Select(b => b.GetProperty("name").GetString()).ToList();
        Assert.True(bylines.IndexOf("AA Options First") < bylines.IndexOf("zz Options Last"));
        Assert.All(options.GetProperty("bylines").EnumerateArray(), b => Assert.Equal(["id", "name"], AdminStories.Keys(b)));
        var events = options.GetProperty("events").EnumerateArray().Select(e => e.GetProperty("id").GetString()).ToList();
        Assert.Contains(soon.ToString(), events);
        Assert.DoesNotContain(hidden.ToString(), events);
        var listings = options.GetProperty("listings").EnumerateArray().Select(l => l.GetProperty("id").GetString()).ToList();
        Assert.Contains(listing.ToString(), listings);
        Assert.DoesNotContain(unlisted.ToString(), listings);
    }
}
