using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Domain.Events;

namespace ChristianFitness.Api.Tests.Series;

/// <summary>
/// L2-050 AC2, AC3 and L2-075 AC2, AC3 (ADR 0081, ADR 0093): a member narrows the Series view by
/// category, by the title search (trimmed, any case, blank narrows nothing) and to the series they
/// joined, read from the session; an unknown category is refused with <c>category_invalid</c>.
/// Each test searches for a word only its own series carry, since the store is the class's.
/// </summary>
public sealed class FilterSeriesTests(AdminSeriesFactory factory) : IClassFixture<AdminSeriesFactory>
{
    private static readonly SessionSeed[] ToCome = [new(new DateOnly(2026, 4, 28)), new(new DateOnly(2026, 5, 5))];

    private async Task<EventSeries> AddAsync(string title, EventCategory category = EventCategory.Run, int day = 28)
    {
        var series = AdminSeries.NewSeries(title, factory.Time.GetUtcNow(), category: category);
        await factory.AddSeriesAsync(series, [new(new DateOnly(2026, 4, day)), .. ToCome.Skip(1)]);
        return series;
    }

    [Fact]
    public async Task Given_a_padded_upper_case_search_When_a_member_asks_Then_only_titles_containing_it_show_by_next_session()
    {
        await AddAsync("Quartz Evening Run", day: 29);
        await AddAsync("Morning quartz Walk", day: 27);
        await AddAsync("Saturday Park Bootcamp");
        var (client, cookie) = await MemberSeries.MemberAsync(factory, "grace.series.quartz@example.org");

        var list = await MemberSeries.ListAsync(client, cookie, $"q={Uri.EscapeDataString("  QUARTZ ")}");

        Assert.Equal(["Morning quartz Walk", "Quartz Evening Run"], MemberSeries.TitlesOf(list));
    }

    [Theory]
    [InlineData("")]
    [InlineData("%20%20")]
    public async Task Given_blank_search_text_When_a_member_asks_Then_the_list_is_not_narrowed(string q)
    {
        await AddAsync($"Slate {q.Length}");
        var (client, cookie) = await MemberSeries.MemberAsync(factory, $"grace.series.blank.{q.Length}@example.org");
        var all = await MemberSeries.ListAsync(client, cookie);

        var list = await MemberSeries.ListAsync(client, cookie, $"q={q}");

        Assert.Equal(MemberSeries.TitlesOf(all), MemberSeries.TitlesOf(list));
        Assert.Contains($"Slate {q.Length}", MemberSeries.TitlesOf(list));
    }

    [Fact]
    public async Task Given_a_category_and_a_search_When_a_member_asks_Then_both_apply()
    {
        await AddAsync("Basalt Run Club");
        await AddAsync("Basalt Circuits", EventCategory.Workout);
        await AddAsync("Other Circuits", EventCategory.Workout);
        var (client, cookie) = await MemberSeries.MemberAsync(factory, "grace.series.basalt@example.org");

        var list = await MemberSeries.ListAsync(client, cookie, "q=basalt&category=workout");

        Assert.Equal(["Basalt Circuits"], MemberSeries.TitlesOf(list));
        Assert.All(list.GetProperty("series").EnumerateArray(), s => Assert.Equal("workout", s.GetProperty("category").GetString()));
    }

    [Theory]
    [InlineData("yoga")]
    [InlineData("RUN")]
    public async Task Given_a_category_the_API_does_not_know_When_a_member_asks_Then_it_is_refused_with_category_invalid(string category)
    {
        var (client, cookie) = await MemberSeries.MemberAsync(factory, $"grace.series.bad.{category}@example.org");

        using var response = await Browser.SendAsync(client, HttpMethod.Get, $"{MemberSeries.Path}?category={category}", cookie);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("validation_failed", problem.GetProperty("code").GetString());
        Assert.Equal(["category"], AdminSeries.Keys(problem.GetProperty("fieldCodes")));
        Assert.Equal("category_invalid", problem.GetProperty("fieldCodes").GetProperty("category").GetString());
    }

    [Fact]
    public async Task Given_series_the_member_and_another_joined_When_the_member_asks_for_joined_only_Then_only_their_own_show()
    {
        const string Grace = "grace.series.gneiss@example.org";
        const string Ada = "ada.series.gneiss@example.org";
        var mine = await AddAsync("Gneiss Mine");
        var theirs = await AddAsync("Gneiss Theirs");
        await AddAsync("Gneiss Nobody's");
        var (client, cookie) = await MemberSeries.MemberAsync(factory, Grace);
        await MemberSeries.MemberAsync(factory, Ada);
        await MemberSeries.EnrolAsync(factory, mine, Grace);
        await MemberSeries.EnrolAsync(factory, theirs, Ada);
        var adaId = await MemberSeries.MemberIdAsync(factory, Ada);

        var joined = await MemberSeries.ListAsync(client, cookie, "q=gneiss&joined=true");
        // The member is the session's: another member's id under any name changes nothing.
        var named = await MemberSeries.ListAsync(client, cookie, $"q=gneiss&joined=true&memberId={adaId}&member={adaId}");

        Assert.Equal(["Gneiss Mine"], MemberSeries.TitlesOf(joined));
        Assert.Equal(["Gneiss Mine"], MemberSeries.TitlesOf(named));
    }

    [Theory]
    [InlineData("false")]
    [InlineData("True")]
    [InlineData("1")]
    public async Task Given_joined_other_than_exactly_true_When_a_member_asks_Then_the_list_is_not_narrowed(string value)
    {
        await AddAsync($"Shale {value}");
        var (client, cookie) = await MemberSeries.MemberAsync(factory, $"grace.series.shale.{value}@example.org");

        var list = await MemberSeries.ListAsync(client, cookie, $"q=shale%20{value}&joined={value}");

        Assert.Equal([$"Shale {value}"], MemberSeries.TitlesOf(list));
    }
}
