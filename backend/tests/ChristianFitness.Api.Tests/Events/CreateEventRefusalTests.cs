using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Events;

/// <summary>
/// L2-022 AC2 (ADR 0020): an event with a field missing or out of its limits is refused with 400
/// <c>validation_failed</c>, each failed field named with its own code in <c>fieldCodes</c>, and
/// nothing is saved. One row per code; the limits' edges are rows of
/// <c>CreateEventValidatorTests</c>.
/// </summary>
public sealed class CreateEventRefusalTests(AdminEventsFactory factory) : IClassFixture<AdminEventsFactory>
{
    public static TheoryData<string, string, object?, string> Rows() => new()
    {
        // field, its camel-case name in the body, the value sent, the code expected
        { "title", "title", "", "title_required" },
        { "title", "title", new string('t', 121), "title_too_long" },
        { "category", "category", "yoga", "category_required" },
        { "date", "date", "", "date_required" },
        { "date", "date", "2026-04-14", "start_in_past" },
        { "startTime", "startTime", "4pm", "start_time_required" },
        { "place", "place", " ", "place_required" },
        { "place", "place", new string('p', 201), "place_too_long" },
        { "area", "area", "", "area_required" },
        { "area", "area", new string('a', 101), "area_too_long" },
        { "priceCents", "priceCents", -1, "price_invalid" },
        { "capacity", "capacity", null, "capacity_required" },
        { "capacity", "capacity", 10_001, "capacity_out_of_range" },
        { "summary", "summary", "", "summary_required" },
        { "summary", "summary", new string('s', 1001), "summary_too_long" },
    };

    [Theory]
    [MemberData(nameof(Rows))]
    public async Task Given_an_event_with_one_field_out_of_its_limits_When_it_is_created_Then_it_is_refused_with_that_field_s_code_and_nothing_is_saved(
        string field, string bodyName, object? value, string code)
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminEvents.SignInStaffAsync(factory, client, $"dana.refused.{code}.{bodyName}.{Guid.NewGuid():N}@example.org");
        var before = await CountEventsAsync();
        var body = AdminEvents.Retreat();
        body[bodyName] = value;

        using var response = await AdminEvents.CreateAsync(client, cookie, body);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal(["code", "errors", "fieldCodes", "status", "title", "traceId", "type"], problem.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.Equal("validation_failed", problem.GetProperty("code").GetString());
        Assert.Equal([field], problem.GetProperty("fieldCodes").EnumerateObject().Select(p => p.Name));
        Assert.Equal(code, problem.GetProperty("fieldCodes").GetProperty(field).GetString());
        Assert.Equal([field], problem.GetProperty("errors").EnumerateObject().Select(p => p.Name));
        Assert.Equal(before, await CountEventsAsync());
    }

    [Fact]
    public async Task Given_an_event_with_several_fields_wrong_When_it_is_created_Then_each_field_is_named_with_its_code()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminEvents.SignInStaffAsync(factory, client, "dana.refused.several@example.org");
        var body = AdminEvents.Retreat();
        body["title"] = "";
        body["date"] = "2026-04-10";
        body["capacity"] = 0;

        using var response = await AdminEvents.CreateAsync(client, cookie, body);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal(
            ["capacity:capacity_out_of_range", "date:start_in_past", "title:title_required"],
            problem.GetProperty("fieldCodes").EnumerateObject().Select(p => $"{p.Name}:{p.Value.GetString()}").Order(StringComparer.Ordinal));
    }

    // The start is checked against the API's clock, not the client's: 20 minutes later the same start is
    // past. The step stays under the staff idle timeout (30 minutes), so the session still holds.
    [Fact]
    public async Task Given_a_start_that_was_ahead_When_the_clock_passes_it_Then_the_same_event_is_refused_with_start_in_past()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminEvents.SignInStaffAsync(factory, client, "dana.refused.clock@example.org");
        var now = factory.Time.GetUtcNow();
        var start = TimeZoneInfo.ConvertTime(now.AddMinutes(10), Domain.Events.EventSchedule.Toronto);
        var body = AdminEvents.Retreat();
        body["date"] = start.ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);
        body["startTime"] = start.ToString("HH:mm", System.Globalization.CultureInfo.InvariantCulture);
        body["title"] = "Ahead, then past";
        factory.Time.Advance(TimeSpan.FromMinutes(20));

        using var response = await AdminEvents.CreateAsync(client, cookie, body);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("start_in_past", problem.GetProperty("fieldCodes").GetProperty("date").GetString());
    }

    private async Task<int> CountEventsAsync()
    {
        using var scope = factory.Services.CreateScope();
        return await scope.ServiceProvider.GetRequiredService<AppDbContext>().Events.CountAsync(TestContext.Current.CancellationToken);
    }
}
