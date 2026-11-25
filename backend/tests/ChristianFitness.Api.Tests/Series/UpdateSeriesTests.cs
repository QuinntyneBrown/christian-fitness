using System.Net;
using System.Text.Json;
using ChristianFitness.Api.Tests.Events;
using ChristianFitness.Domain.Directory;
using ChristianFitness.Domain.Events;
using ChristianFitness.Domain.Members;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Series;

/// <summary>
/// L2-071 AC6, AC13 and AC16 (ADR 0091): Save changes replaces a series' details and copies them to
/// every session that has not started, so the events listed follow, while sessions already held keep
/// what members attended; a capacity below the members who joined is refused with 409
/// <c>capacity_below_joined</c> and nothing changes; an unknown series is 404 <c>not_found</c>. It
/// is audited as <c>series.updated</c>, and a Moderator may do it too.
/// </summary>
public sealed class UpdateSeriesTests(AdminSeriesFactory factory) : IClassFixture<AdminSeriesFactory>
{
    /// <summary>Couch to 5K as the editor sends it back, with <paramref name="title"/>.</summary>
    private static Dictionary<string, object?> Couch(string title, Guid host) => new(StringComparer.Ordinal)
    {
        ["title"] = title,
        ["category"] = "run",
        ["summary"] = "Eight weeks from walking to running a full 5K, together.",
        ["imageKey"] = null,
        ["hostListingId"] = host,
        ["priceCents"] = 6400,
        ["dropInPriceCents"] = 1000,
        ["capacity"] = 40,
        ["place"] = "Humber Bay Park East",
        ["area"] = "Etobicoke, Toronto",
    };

    private async Task<(EventSeries Series, IReadOnlyList<Guid> Sessions, Guid Host)> AddCouchAsync(string title)
    {
        var host = await factory.AddListingAsync(ListingKind.Organization, $"{title} Host");
        var series = AdminSeries.NewSeries(title, factory.Time.GetUtcNow(), capacity: 40, priceCents: 6400, dropInPriceCents: 1000, host: host);
        var sessions = await factory.AddCouchTo5KAsync(series);
        return (series, sessions, host);
    }

    private static Task<HttpResponseMessage> SaveAsync(HttpClient client, string cookie, Guid id, object body) =>
        AdminEvents.SendAsync(client, HttpMethod.Put, $"/api/admin/series/{id}", cookie, body);

    [Fact]
    public async Task Given_Couch_to_5K_When_an_Admin_saves_new_details_Then_the_series_and_its_sessions_still_to_come_follow()
    {
        var (couch, sessions, host) = await AddCouchAsync("Couch to 5K Save");
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminSeries.SignInAsync(factory, client, "dana.series.save@example.org");
        var body = Couch("Couch to 5K Run Club, Spring", host);
        body["place"] = "Marie Curtis Park";
        body["capacity"] = 45;
        body["dropInPriceCents"] = 1200;
        body["category"] = "workout";

        using var response = await SaveAsync(client, cookie, couch.Id, body);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var series = await AdminSeries.JsonAsync(response);
        Assert.Equal(
            ("Couch to 5K Run Club, Spring", "workout", "Marie Curtis Park", 45, 1200, 31),
            (series.GetProperty("title").GetString(), series.GetProperty("category").GetString(), series.GetProperty("place").GetString(),
             series.GetProperty("capacity").GetInt32(), series.GetProperty("dropInPriceCents").GetInt32(), series.GetProperty("joined").GetInt32()));
        Assert.Equal(8, series.GetProperty("sessions").GetArrayLength());

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var events = await db.Events.AsNoTracking().Where(e => e.SeriesId == couch.Id).OrderBy(e => e.StartsAt).ToListAsync(TestContext.Current.CancellationToken);
        Assert.Equal(sessions, events.Select(e => e.Id));
        // April 7 and 14 were held before today (April 15): they keep what members attended.
        Assert.All(events.Take(2), held => Assert.Equal(
            ("Couch to 5K Save", EventCategory.Run, "Humber Bay Park East", 40, 1000),
            (held.Title, held.Category, held.Place, held.Capacity, held.PriceCents)));
        // The six to come, the cancelled May 12 included, follow the series; a session's price is the drop-in price.
        Assert.All(events.Skip(2), next => Assert.Equal(
            ("Couch to 5K Run Club, Spring", EventCategory.Workout, "Marie Curtis Park", 45, 1200),
            (next.Title, next.Category, next.Place, next.Capacity, next.PriceCents)));
    }

    [Fact]
    public async Task Given_a_series_with_no_drop_in_When_it_is_saved_Then_its_sessions_to_come_cost_the_series_price()
    {
        var (couch, _, host) = await AddCouchAsync("Couch to 5K No Drop-in");
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminSeries.SignInAsync(factory, client, "dana.series.save.nodropin@example.org");
        var body = Couch("Couch to 5K No Drop-in", host);
        body["dropInPriceCents"] = null;

        using var response = await SaveAsync(client, cookie, couch.Id, body);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(JsonValueKind.Null, (await AdminSeries.JsonAsync(response)).GetProperty("dropInPriceCents").ValueKind);
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var next = await db.Events.AsNoTracking().Where(e => e.SeriesId == couch.Id && e.StartsAt > factory.Time.GetUtcNow()).Select(e => e.PriceCents).ToListAsync(TestContext.Current.CancellationToken);
        Assert.All(next, price => Assert.Equal(6400, price));
    }

    public static TheoryData<int, HttpStatusCode> Capacities() => new()
    {
        // the capacity sent to a series 31 members joined, the answer
        { 30, HttpStatusCode.Conflict },
        { 31, HttpStatusCode.OK },
        { 32, HttpStatusCode.OK },
    };

    [Theory]
    [MemberData(nameof(Capacities))]
    public async Task Given_31_members_joined_When_the_capacity_is_saved_Then_one_below_31_is_refused_and_changes_nothing(int capacity, HttpStatusCode expected)
    {
        var (couch, _, host) = await AddCouchAsync($"Couch to 5K Capacity {capacity}");
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminSeries.SignInAsync(factory, client, $"dana.series.capacity.{capacity}@example.org");
        var body = Couch($"Renamed {capacity}", host);
        body["capacity"] = capacity;

        using var response = await SaveAsync(client, cookie, couch.Id, body);

        Assert.Equal(expected, response.StatusCode);
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var stored = await db.EventSeries.AsNoTracking().SingleAsync(s => s.Id == couch.Id, TestContext.Current.CancellationToken);
        if (expected == HttpStatusCode.Conflict)
        {
            Assert.Equal("capacity_below_joined", (await AdminSeries.JsonAsync(response)).GetProperty("code").GetString());
            Assert.Equal(($"Couch to 5K Capacity {capacity}", 40), (stored.Title, stored.Capacity));
            Assert.Equal(0, await db.AuditEntries.CountAsync(e => e.RecordId == couch.Id, TestContext.Current.CancellationToken));
        }
        else
        {
            Assert.Equal(($"Renamed {capacity}", capacity), (stored.Title, stored.Capacity));
        }
    }

    [Fact]
    public async Task Given_an_Admin_When_they_save_a_series_Then_an_audit_entry_records_who_and_which_series()
    {
        var (couch, _, host) = await AddCouchAsync("Couch to 5K Audit");
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminSeries.SignInAsync(factory, client, "dana.series.save.audit@example.org");

        using var response = await SaveAsync(client, cookie, couch.Id, Couch("Couch to 5K Audit", host));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var staffId = await db.Members.Where(m => m.NormalizedEmail == "dana.series.save.audit@example.org").Select(m => m.Id).SingleAsync(TestContext.Current.CancellationToken);
        var entry = Assert.Single(await db.AuditEntries.Where(e => e.RecordId == couch.Id).ToListAsync(TestContext.Current.CancellationToken));
        Assert.Equal((staffId, "series.updated", "EventSeries"), (entry.ActorMemberId, entry.Action, entry.RecordType));
    }

    [Fact]
    public async Task Given_a_Moderator_When_they_save_a_series_Then_it_is_saved()
    {
        var (couch, _, host) = await AddCouchAsync("Couch to 5K Moderator");
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminSeries.SignInAsync(factory, client, "joel.series.save@example.org", StaffRoleName.Moderator);

        using var response = await SaveAsync(client, cookie, couch.Id, Couch("Couch to 5K by Joel", host));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("Couch to 5K by Joel", (await AdminSeries.JsonAsync(response)).GetProperty("title").GetString());
    }

    [Fact]
    public async Task Given_no_such_series_When_it_is_saved_Then_it_is_404_not_found()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminSeries.SignInAsync(factory, client, "dana.series.save.missing@example.org");

        using var response = await SaveAsync(client, cookie, Guid.NewGuid(), Couch("Nowhere", DirectoryListing.TeamListingId));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("not_found", (await AdminSeries.JsonAsync(response)).GetProperty("code").GetString());
    }

    [Fact]
    public async Task Given_a_blank_title_When_a_series_is_saved_Then_it_is_refused_naming_the_title_and_nothing_changes()
    {
        var (couch, _, host) = await AddCouchAsync("Couch to 5K Blank");
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminSeries.SignInAsync(factory, client, "dana.series.save.blank@example.org");

        using var response = await SaveAsync(client, cookie, couch.Id, Couch(" ", host));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await AdminSeries.JsonAsync(response);
        Assert.Equal("title_required", problem.GetProperty("fieldCodes").GetProperty("title").GetString());
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal("Couch to 5K Blank", (await db.EventSeries.AsNoTracking().SingleAsync(s => s.Id == couch.Id, TestContext.Current.CancellationToken)).Title);
    }
}
