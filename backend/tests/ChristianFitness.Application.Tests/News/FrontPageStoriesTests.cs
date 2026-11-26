using System.Globalization;
using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.News;
using ChristianFitness.Domain.News;
using ChristianFitness.Infrastructure.Persistence;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Time.Testing;

namespace ChristianFitness.Application.Tests.News;

/// <summary>
/// The front page's rules (L2-001 AC2, L2-069 AC5, AC6; ADR 0069, ADR 0105), one case per row: which
/// stories a reader may see, and which story leads, which are the headlines and which fall into the
/// river. Each test has its own store.
/// </summary>
public sealed class FrontPageStoriesTests : IAsyncDisposable
{
    private static readonly DateTimeOffset Now = new(2026, 4, 15, 12, 45, 0, TimeSpan.Zero);

    private readonly ServiceProvider _services;

    public FrontPageStoriesTests()
    {
        var store = $"front-page-{Guid.NewGuid():N}";
        _services = new ServiceCollection()
            .AddApplication()
            .AddDbContext<AppDbContext>(options => options.UseInMemoryDatabase(store))
            .AddScoped<IAppDbContext>(provider => provider.GetRequiredService<AppDbContext>())
            .AddSingleton<TimeProvider>(new FakeTimeProvider(Now))
            .BuildServiceProvider();
    }

    public static TheoryData<string, string, int?, bool> Statuses() => new()
    {
        // why, status, seconds from now a Scheduled story goes out, whether readers see it
        { "a Draft", "draft", null, false },
        { "a story In review", "review", null, false },
        { "a Scheduled story a second before its time", "scheduled", 1, false },
        { "a Scheduled story at its time", "scheduled", 0, true },
        { "a Scheduled story an hour past its time, not yet stored as Published", "scheduled", -3600, true },
        { "a Published story", "published", null, true },
        { "a Published story unpublished since", "unpublished", null, false },
    };

    [Theory]
    [MemberData(nameof(Statuses))]
    public async Task Given_one_story_When_the_front_page_is_read_Then_it_leads_only_if_readers_may_see_it(string why, string status, int? secondsFromNow, bool seen)
    {
        var written = Now.AddDays(-2);
        var story = Story.Create(Content("The story", StoryPlacement.Latest), written);
        switch (status)
        {
            case "review":
                story.SendForReview(written);
                break;
            case "scheduled":
                story.Schedule(Now.AddSeconds(secondsFromNow!.Value), Guid.NewGuid(), written);
                break;
            case "published" or "unpublished":
                story.Publish(Now.AddHours(-3));
                break;
        }

        if (status == "unpublished")
        {
            story.Unpublish(Now.AddHours(-1));
        }

        await StoreAsync(story);

        var page = await ReadAsync();

        Assert.True(seen == (page.Lead is not null), why);
        Assert.Empty(page.Headlines);
        Assert.Empty(page.Latest);
        if (seen)
        {
            Assert.Equal(status == "scheduled" ? Now.AddSeconds(secondsFromNow!.Value) : Now.AddHours(-3), page.Lead!.PublishedAt);
        }
    }

    public static TheoryData<string, string, string?, string, string> Placements() => new()
    {
        // why, the published stories as name:placement:minutes ago, the lead, the headlines, the river
        { "nothing placed: the newest leads, the next four are headlines, the rest follow", "a:latest:1 b:latest:2 c:latest:3 d:latest:4 e:latest:5 f:latest:6 g:latest:7", "a", "b c d e", "f g" },
        { "one story", "a:latest:1", "a", "", "" },
        { "five stories fill the top and leave no river", "a:latest:1 b:latest:2 c:latest:3 d:latest:4 e:latest:5", "a", "b c d e", "" },
        { "an older story placed Lead leads", "a:latest:1 b:latest:2 c:latest:3 d:latest:4 e:latest:5 f:lead:6 g:latest:7", "f", "a b c d", "e g" },
        { "of two Leads the newer leads and the other is an ordinary story", "a:lead:1 b:latest:2 c:latest:3 d:latest:4 e:latest:5 f:lead:6 g:latest:7", "a", "b c d e", "f g" },
        { "stories placed Top are headlines before newer ones, shown newest first", "a:latest:1 b:latest:2 c:latest:3 d:latest:4 e:top:5 f:top:6 g:latest:7", "a", "b c e f", "d g" },
        { "four placed Top take every headline", "a:latest:1 b:latest:2 c:top:3 d:top:4 e:top:5 f:top:6 g:latest:7", "a", "c d e f", "b g" },
        { "of six placed Top the newest four are headlines and the others follow by date", "a:latest:1 b:top:2 c:top:3 d:latest:4 e:top:5 f:top:6 g:top:7 h:top:8", "a", "b c e f", "d g h" },
        { "with no Lead the newest leads even when placed Top", "a:top:1 b:latest:2 c:latest:3 d:latest:4 e:latest:5 f:latest:6", "a", "b c d e", "f" },
        { "a Lead and Top stories together", "a:latest:1 b:top:2 c:latest:3 d:lead:4 e:top:5 f:latest:6 g:latest:7", "d", "a b c e", "f g" },
    };

    [Theory]
    [MemberData(nameof(Placements))]
    public async Task Given_published_stories_When_the_front_page_is_read_Then_each_sits_where_it_was_placed_and_none_appears_twice(
        string why, string stories, string? lead, string headlines, string river)
    {
        await StoreAsync([.. stories.Split(' ').Select(Published)]);

        var page = await ReadAsync();

        Assert.Equal((why, lead), (why, page.Lead?.Headline));
        Assert.Equal((why, headlines), (why, string.Join(' ', page.Headlines.Select(s => s.Headline))));
        Assert.Equal((why, river), (why, string.Join(' ', page.Latest.Select(s => s.Headline))));
    }

    [Fact]
    public async Task Given_a_Draft_placed_Lead_When_the_front_page_is_read_Then_the_newest_published_story_leads()
    {
        await StoreAsync(Published("a:latest:1"), Published("b:latest:2"), Story.Create(Content("draft", StoryPlacement.Lead), Now.AddMinutes(-1)));

        var page = await ReadAsync();

        Assert.Equal(("a", "b"), (page.Lead?.Headline, string.Join(' ', page.Headlines.Select(s => s.Headline))));
    }

    public static TheoryData<string, string?, bool, string> Sections() => new()
    {
        // why, the section asked for, whether it is answered, the river
        { "no section is Latest, every section together", null, true, "e f h" },
        { "Events", "events", true, "a" },
        { "Training", "training", true, "b" },
        { "Nutrition", "nutrition", true, "c" },
        { "Faith & Body by its slug (ADR 0071), whatever its stories' placement", "faith-body", true, "d g h" },
        { "Community", "community", true, "e" },
        { "Pros", "pros", true, "f" },
        { "the console's name for Faith & Body", "faith-and-body", false, "" },
        { "a section in title case", "Events", false, "" },
        { "a section with spaces around it", " events ", false, "" },
        { "Latest named as a section", "latest", false, "" },
        { "a blank section", "", false, "" },
        { "a section the front page does not have", "recipes", false, "" },
    };

    [Theory]
    [MemberData(nameof(Sections))]
    public async Task Given_a_story_in_each_section_When_a_section_is_asked_for_Then_only_a_known_one_is_answered_with_its_stories_alone(
        string why, string? section, bool answered, string river)
    {
        await StoreAsync([.. "a:latest:1:events b:latest:2:training c:latest:3:nutrition d:lead:4:faith-body e:latest:5:community f:latest:6:pros g:top:7:faith-body h:latest:8:faith-body"
            .Split(' ').Select(Published)]);
        var query = new ListFrontPageStoriesQuery(section);

        if (!answered)
        {
            var refused = await Assert.ThrowsAsync<ValidationException>(() => ReadAsync(query));
            Assert.Equal((why, "Section:section_invalid"), (why, string.Join(' ', refused.Errors.Select(e => $"{e.PropertyName}:{e.ErrorCode}"))));
            return;
        }

        var page = await ReadAsync(query);

        Assert.Equal((why, river), (why, string.Join(' ', page.Latest.Select(s => s.Headline))));
        Assert.Equal((why, section is null), (why, page.Lead is not null));
        Assert.Equal((why, section is null ? 4 : 0), (why, page.Headlines.Count));
    }

    public static TheoryData<string, int, string?, string> Rivers() => new()
    {
        // why, how many stories, the section read (none: Latest, whose top takes five), the size of each page
        { "no stories", 0, "training", "0" },
        { "one story", 1, "training", "1" },
        { "one page exactly has no next", 12, "training", "12" },
        { "one more than a page", 13, "training", "12 1" },
        { "two pages exactly", 24, "training", "12 12" },
        { "one under the bound", 59, "training", "12 12 12 12 11" },
        { "the bound exactly", 60, "training", "12 12 12 12 12" },
        { "one over the bound stops at 60", 61, "training", "12 12 12 12 12" },
        { "far over the bound stops at 60", 100, "training", "12 12 12 12 12" },
        { "Latest pages what is under the lead and the four headlines", 18, null, "12 1" },
        { "Latest stops at 60 under the top", 70, null, "12 12 12 12 12" },
    };

    [Theory]
    [MemberData(nameof(Rivers))]
    public async Task Given_a_river_When_it_is_read_to_its_end_Then_it_comes_12_at_a_time_newest_first_with_no_story_twice_and_stops_at_60(
        string why, int count, string? section, string sizes)
    {
        var names = Enumerable.Range(1, count).Select(n => n.ToString("D3", CultureInfo.InvariantCulture)).ToArray();
        await StoreAsync([.. names.Select((name, index) => Published($"{name}:latest:{index + 1}:training"))]);

        var page = await ReadAsync(new ListFrontPageStoriesQuery(section));
        var pages = new List<FrontPageDto> { page };
        while (page.NextCursor is not null && pages.Count < 10)
        {
            page = await ReadAsync(new ListFrontPageStoriesQuery(section, page.NextCursor));
            pages.Add(page);
        }

        Assert.Equal((why, sizes), (why, string.Join(' ', pages.Select(p => p.Latest.Count))));
        var top = section is null ? 5 : 0;
        Assert.Equal(names.Skip(top).Take(60), pages.SelectMany(p => p.Latest).Select(s => s.Headline));
        Assert.All(pages.Skip(1), later => Assert.True(later.Lead is null && later.Headlines.Count == 0 && later.MostRead.Count == 0, why));
    }

    [Fact]
    public async Task Given_14_stories_that_went_out_at_the_same_instant_When_the_river_is_read_Then_the_pages_continue_by_id_with_no_story_twice_or_missing()
    {
        var stories = Enumerable.Range(1, 14).Select(n => Published($"{n.ToString("D2", CultureInfo.InvariantCulture)}:latest:7:events")).ToArray();
        await StoreAsync(stories);

        var first = await ReadAsync(new ListFrontPageStoriesQuery("events"));
        var second = await ReadAsync(new ListFrontPageStoriesQuery("events", first.NextCursor));

        Assert.Equal(stories.Select(s => s.Id).OrderDescending(), first.Latest.Concat(second.Latest).Select(s => s.Id));
        Assert.Equal((12, 2), (first.Latest.Count, second.Latest.Count));
    }

    private const string Ticks = "639118755000000000";
    private const string Id = "0190c0de00007000800000000000002a";

    public static TheoryData<string, string, bool> Cursors() => new()
    {
        // why, the cursor's text before it is encoded (raw: sent as it is), whether it is answered
        { "a position with no top stories, as a section's page writes", $"{Ticks}|{Id}|12|", true },
        { "a position with the lead and four headlines", $"{Ticks}|{Id}|48|{Id},{Id},{Id},{Id},{Id}", true },
        { "text that is not base64", "raw:not a cursor!", false },
        { "a blank cursor", "raw:", false },
        { "too few parts", $"{Ticks}|{Id}|12", false },
        { "too many parts", $"{Ticks}|{Id}|12||", false },
        { "a time that is not a number", $"soon|{Id}|12|", false },
        { "a time before year 1", $"-1|{Id}|12|", false },
        { "a time after the last instant", $"9999999999999999999|{Id}|12|", false },
        { "an id that is not one", $"{Ticks}|42|12|", false },
        { "no stories given yet", $"{Ticks}|{Id}|0|", false },
        { "the bound already reached", $"{Ticks}|{Id}|60|", false },
        { "a count that is not a number", $"{Ticks}|{Id}|some|", false },
        { "six top stories", $"{Ticks}|{Id}|12|{Id},{Id},{Id},{Id},{Id},{Id}", false },
        { "a top story that is not an id", $"{Ticks}|{Id}|12|first", false },
    };

    [Theory]
    [MemberData(nameof(Cursors))]
    public async Task Given_a_cursor_When_the_river_is_read_Then_only_one_the_front_page_could_have_written_is_answered(string why, string text, bool answered)
    {
        var cursor = text.StartsWith("raw:", StringComparison.Ordinal)
            ? text[4..]
            : Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(text)).Replace('+', '-').Replace('/', '_').TrimEnd('=');
        var query = new ListFrontPageStoriesQuery(null, cursor);

        if (answered)
        {
            Assert.True((await ReadAsync(query)).Latest.Count == 0, why);
        }
        else
        {
            var refused = await Assert.ThrowsAsync<ValidationException>(() => ReadAsync(query));
            Assert.Equal((why, "Cursor:cursor_invalid"), (why, string.Join(' ', refused.Errors.Select(e => $"{e.PropertyName}:{e.ErrorCode}"))));
        }
    }

    [Fact]
    public async Task Given_a_story_falls_out_of_the_top_between_pages_When_the_next_page_is_read_Then_it_is_not_repeated_and_none_is_skipped()
    {
        // "old" leads by placement although it is the oldest; after the first page it stops being the Lead.
        var old = Published("old:lead:900");
        await StoreAsync([old, .. Enumerable.Range(1, 20).Select(n => Published($"{n.ToString("D2", CultureInfo.InvariantCulture)}:latest:{n}"))]);
        var first = await ReadAsync();
        using (var scope = _services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            (await db.Stories.SingleAsync(s => s.Id == old.Id, TestContext.Current.CancellationToken)).GiveUpLead();
            db.Stories.Add(Published("new:lead:0"));
            await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        }

        var second = await ReadAsync(new ListFrontPageStoriesQuery(null, first.NextCursor));

        Assert.Equal("old", first.Lead?.Headline);
        Assert.Equal("05 06 07 08 09 10 11 12 13 14 15 16", string.Join(' ', first.Latest.Select(s => s.Headline)));
        Assert.Equal("17 18 19 20", string.Join(' ', second.Latest.Select(s => s.Headline)));
        Assert.Null(second.NextCursor);
    }

    public async ValueTask DisposeAsync() => await _services.DisposeAsync();

    private static StoryContent Content(string headline, StoryPlacement placement, StorySection section = StorySection.Community) =>
        Story.Blank with { Headline = headline, Text = "Words.", Section = section, BylineId = Guid.NewGuid(), Placement = placement, Slug = headline };

    /// <summary>A Published story from <c>name:placement:minutes ago</c>, with an optional fourth part naming its section.</summary>
    private static Story Published(string spec)
    {
        var parts = spec.Split(':');
        var at = Now.AddMinutes(-int.Parse(parts[2], CultureInfo.InvariantCulture));
        var section = parts.Length > 3 ? StorySections.SectionOf(parts[3])!.Value : StorySection.Community;
        var story = Story.Create(Content(parts[0], StoryNames.PlacementOf(parts[1])!.Value, section), at);
        story.Publish(at);
        return story;
    }

    private async Task StoreAsync(params Story[] stories)
    {
        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Stories.AddRange(stories);
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
    }

    private async Task<FrontPageDto> ReadAsync(ListFrontPageStoriesQuery? query = null)
    {
        using var scope = _services.CreateScope();
        return await scope.ServiceProvider.GetRequiredService<ISender>().Send(query ?? new ListFrontPageStoriesQuery(), TestContext.Current.CancellationToken);
    }
}
