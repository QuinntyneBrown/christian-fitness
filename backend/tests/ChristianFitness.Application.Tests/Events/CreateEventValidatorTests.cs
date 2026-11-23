using ChristianFitness.Application.Events;
using Microsoft.Extensions.Time.Testing;

namespace ChristianFitness.Application.Tests.Events;

/// <summary>
/// L2-022 AC2 (ADR 0020): the event editor's rules, one case per row: each limit on both sides of
/// its edge, and the code of the one field that fails. The clock is the mocks' today, Wednesday,
/// April 15, 2026, 8:45 AM in Toronto (12:45 UTC).
/// </summary>
public sealed class CreateEventValidatorTests
{
    private static readonly DateTimeOffset Now = new(2026, 4, 15, 12, 45, 0, TimeSpan.Zero);

    public static TheoryData<string, string, object?, string?> Cases() => new()
    {
        // why, field, value, expected "Field:code" or null when valid
        { "the retreat as the mock draws it", "", null, null },
        { "title blank", "Title", "", "Title:title_required" },
        { "title white space", "Title", "   ", "Title:title_required" },
        { "title 120", "Title", new string('t', 120), null },
        { "title 120 once trimmed", "Title", "  " + new string('t', 120) + " ", null },
        { "title 121", "Title", new string('t', 121), "Title:title_too_long" },
        { "category blank", "Category", "", "Category:category_required" },
        { "category unknown", "Category", "yoga", "Category:category_required" },
        { "category in title case", "Category", "Retreat", "Category:category_required" },
        { "category run", "Category", "run", null },
        { "date blank", "Date", "", "Date:date_required" },
        { "date that does not exist", "Date", "2026-02-30", "Date:date_required" },
        { "date in another format", "Date", "22/05/2026", "Date:date_required" },
        { "start a minute ago", "Start", "2026-04-15 08:44", "Date:start_in_past" },
        { "start now", "Start", "2026-04-15 08:45", "Date:start_in_past" },
        { "start in a minute", "Start", "2026-04-15 08:46", null },
        { "start yesterday", "Date", "2026-04-14", "Date:start_in_past" },
        { "time blank", "StartTime", "", "StartTime:start_time_required" },
        { "time in 12-hour form", "StartTime", "4pm", "StartTime:start_time_required" },
        { "time 24:00", "StartTime", "24:00", "StartTime:start_time_required" },
        { "time 00:00", "StartTime", "00:00", null },
        { "place blank", "Place", "", "Place:place_required" },
        { "place 200", "Place", new string('p', 200), null },
        { "place 201", "Place", new string('p', 201), "Place:place_too_long" },
        { "area blank", "Area", " ", "Area:area_required" },
        { "area 100", "Area", new string('a', 100), null },
        { "area 101", "Area", new string('a', 101), "Area:area_too_long" },
        { "price missing", "PriceCents", null, "PriceCents:price_invalid" },
        { "price below zero", "PriceCents", -1, "PriceCents:price_invalid" },
        { "price free", "PriceCents", 0, null },
        { "price $10,000", "PriceCents", 1_000_000, null },
        { "price a cent over $10,000", "PriceCents", 1_000_001, "PriceCents:price_invalid" },
        { "capacity missing", "Capacity", null, "Capacity:capacity_required" },
        { "capacity 0", "Capacity", 0, "Capacity:capacity_out_of_range" },
        { "capacity 1", "Capacity", 1, null },
        { "capacity 10,000", "Capacity", 10_000, null },
        { "capacity 10,001", "Capacity", 10_001, "Capacity:capacity_out_of_range" },
        { "summary blank", "Summary", "", "Summary:summary_required" },
        { "summary 1,000", "Summary", new string('s', 1000), null },
        { "summary 1,001", "Summary", new string('s', 1001), "Summary:summary_too_long" },
    };

    [Theory]
    [MemberData(nameof(Cases))]
    public void Given_an_event_When_it_is_validated_Then_only_the_expected_field_fails_with_its_code(string why, string field, object? value, string? expected)
    {
        var command = With(field, value);

        var result = new CreateEventValidator(new FakeTimeProvider(Now)).Validate(command);

        var actual = result.Errors.Select(e => $"{e.PropertyName}:{e.ErrorCode}").ToList();
        Assert.True((expected is null ? [] : new[] { expected }).SequenceEqual(actual), $"{why}: {string.Join(", ", actual)}");
    }

    [Fact]
    public void Given_every_code_When_its_field_fails_Then_the_code_is_one_the_API_names_in_fieldCodes()
    {
        var codes = Cases().Select(row => (string?)row.Data.Item4).OfType<string>().Select(e => e.Split(':')[1]).Distinct(StringComparer.Ordinal);

        Assert.All(codes, code => Assert.Contains(code, CreateEventValidator.FieldCodes));
    }

    /// <summary>Whole Life Retreat from the event editor mock, with <paramref name="field"/> set to <paramref name="value"/>.</summary>
    private static CreateEventCommand With(string field, object? value)
    {
        var start = field == "Start" ? ((string)value!).Split(' ') : null;
        return new CreateEventCommand
        {
            Title = field == "Title" ? (string)value! : "Whole Life Retreat",
            Category = field == "Category" ? (string)value! : "retreat",
            Date = start?[0] ?? (field == "Date" ? (string)value! : "2026-05-22"),
            StartTime = start?[1] ?? (field == "StartTime" ? (string)value! : "16:00"),
            Place = field == "Place" ? (string)value! : "Muskoka Woods, Rosseau",
            Area = field == "Area" ? (string)value! : "Muskoka Lakes",
            PriceCents = field == "PriceCents" ? (int?)value : 34000,
            Capacity = field == "Capacity" ? (int?)value : 60,
            Summary = field == "Summary" ? (string)value! : "Three days of trail runs, strength sessions, worship by the lake and real rest.",
        };
    }
}
