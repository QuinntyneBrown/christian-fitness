using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Tests.Admin;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Events;

/// <summary>
/// L2-022 AC7 (ADR 0025): staff open an event for editing and save changes under the limits of
/// AC2; an event that does not exist is 404 <c>not_found</c>; the status never changes; a saved
/// change is a staff change that leaves one audit entry (L2-019 AC3).
/// </summary>
public sealed class EditEventTests(AdminEventsFactory factory) : IClassFixture<AdminEventsFactory>
{
    [Fact]
    public async Task Given_a_saved_event_When_staff_open_it_Then_the_editor_values_answer_with_the_toronto_date_and_time()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminEvents.SignInStaffAsync(factory, client, "dana.edit.get@example.org");
        var id = await AdminEvents.CreatedIdAsync(client, cookie, AdminEvents.Retreat());

        using var response = await AdminEvents.SendAsync(client, HttpMethod.Get, $"/api/admin/events/{id}", cookie);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var detail = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal(
            ["area", "capacity", "category", "date", "going", "id", "place", "priceCents", "startTime", "status", "summary", "title"],
            detail.EnumerateObject().Where(p => p.Name != "imageKey" || p.Value.ValueKind != JsonValueKind.Null).Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.Equal(id.ToString(), detail.GetProperty("id").GetString());
        Assert.Equal("2026-05-22", detail.GetProperty("date").GetString());
        Assert.Equal("16:00", detail.GetProperty("startTime").GetString());
        Assert.Equal("retreat", detail.GetProperty("category").GetString());
        Assert.Equal(34000, detail.GetProperty("priceCents").GetInt32());
        Assert.Equal("draft", detail.GetProperty("status").GetString());
        Assert.Equal(0, detail.GetProperty("going").GetInt32());
    }

    [Fact]
    public async Task Given_an_unknown_event_When_staff_open_it_Then_it_answers_404_not_found()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminEvents.SignInStaffAsync(factory, client, "dana.edit.unknown@example.org");

        using var response = await AdminEvents.SendAsync(client, HttpMethod.Get, $"/api/admin/events/{Guid.NewGuid()}", cookie);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("not_found", (await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken)).GetProperty("code").GetString());
    }

    [Fact]
    public async Task Given_a_saved_event_When_staff_save_changes_Then_the_event_is_updated_and_stays_a_draft()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminEvents.SignInStaffAsync(factory, client, "dana.edit.put@example.org");
        var id = await AdminEvents.CreatedIdAsync(client, cookie, AdminEvents.Retreat());
        var body = AdminEvents.Retreat();
        body["title"] = "  Whole Life Retreat 2026  ";
        body["date"] = "2026-06-12";
        body["startTime"] = "09:30";
        body["place"] = "Camp Muskoka";
        body["capacity"] = 80;
        body["priceCents"] = 0;

        using var response = await AdminEvents.SendAsync(client, HttpMethod.Put, $"/api/admin/events/{id}", cookie, body);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var updated = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("Whole Life Retreat 2026", updated.GetProperty("title").GetString());
        // 9:30 AM on June 12 in Toronto is daylight time, UTC-4.
        Assert.Equal("2026-06-12T13:30:00+00:00", updated.GetProperty("startsAt").GetString());
        Assert.Equal(80, updated.GetProperty("capacity").GetInt32());
        Assert.Equal("draft", updated.GetProperty("status").GetString());
        using var scope = factory.Services.CreateScope();
        var stored = await scope.ServiceProvider.GetRequiredService<AppDbContext>().Events.SingleAsync(e => e.Id == id, TestContext.Current.CancellationToken);
        Assert.Equal(("Whole Life Retreat 2026", "Camp Muskoka", 0, 80), (stored.Title, stored.Place, stored.PriceCents, stored.Capacity));
    }

    [Fact]
    public async Task Given_a_saved_change_When_it_is_read_back_Then_one_audit_entry_names_who_updated_which_event()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminEvents.SignInStaffAsync(factory, client, "dana.edit.audit@example.org");
        var id = await AdminEvents.CreatedIdAsync(client, cookie, AdminEvents.Retreat());
        var body = AdminEvents.Retreat();
        body["place"] = "Camp Muskoka";

        using var response = await AdminEvents.SendAsync(client, HttpMethod.Put, $"/api/admin/events/{id}", cookie, body);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var staffId = await db.Members.Where(m => m.NormalizedEmail == "dana.edit.audit@example.org").Select(m => m.Id).SingleAsync(TestContext.Current.CancellationToken);
        var entries = await db.AuditEntries.Where(e => e.RecordId == id && e.Action == "event.updated").ToListAsync(TestContext.Current.CancellationToken);
        var entry = Assert.Single(entries);
        Assert.Equal((staffId, "Event"), (entry.ActorMemberId, entry.RecordType));
    }

    [Fact]
    public async Task Given_an_unknown_event_When_staff_save_changes_Then_it_answers_404_not_found_and_saves_nothing()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminEvents.SignInStaffAsync(factory, client, "dana.edit.put.unknown@example.org");

        using var response = await AdminEvents.SendAsync(client, HttpMethod.Put, $"/api/admin/events/{Guid.NewGuid()}", cookie, AdminEvents.Retreat());

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("not_found", (await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken)).GetProperty("code").GetString());
    }

    public static TheoryData<string, string, object?, string, string> Refusals => new()
    {
        // why, field, value, fieldCodes key, code
        { "a missing title", "title", "  ", "title", "title_required" },
        { "a title over 120", "title", new string('t', 121), "title", "title_too_long" },
        { "no category", "category", "", "category", "category_required" },
        { "no date", "date", "", "date", "date_required" },
        { "a past date", "date", "2026-04-10", "date", "start_in_past" },
        { "a capacity of 0", "capacity", 0, "capacity", "capacity_out_of_range" },
        { "a price over $10,000", "priceCents", 1_000_001, "priceCents", "price_invalid" },
        { "a summary over 1,000", "summary", new string('s', 1001), "summary", "summary_too_long" },
    };

    [Theory]
    [MemberData(nameof(Refusals))]
    public async Task Given_staff_When_they_save_a_change_outside_a_limit_Then_it_is_refused_with_the_fields_own_code_and_nothing_is_saved(
        string why, string field, object? value, string key, string code)
    {
        Assert.NotNull(why);
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminEvents.SignInStaffAsync(factory, client, $"dana.edit.refuse.{field}.{code}@example.org");
        var id = await AdminEvents.CreatedIdAsync(client, cookie, AdminEvents.Retreat());
        var body = AdminEvents.Retreat();
        body[field] = value;

        using var response = await AdminEvents.SendAsync(client, HttpMethod.Put, $"/api/admin/events/{id}", cookie, body);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("validation_failed", problem.GetProperty("code").GetString());
        Assert.Equal(code, problem.GetProperty("fieldCodes").GetProperty(key).GetString());
        using var scope = factory.Services.CreateScope();
        var stored = await scope.ServiceProvider.GetRequiredService<AppDbContext>().Events.SingleAsync(e => e.Id == id, TestContext.Current.CancellationToken);
        Assert.Equal("Whole Life Retreat", stored.Title);
        Assert.Equal(60, stored.Capacity);
    }
}
