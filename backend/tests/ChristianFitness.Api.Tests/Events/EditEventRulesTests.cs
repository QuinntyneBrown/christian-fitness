using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Tests.Admin;
using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Profiles;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Time.Testing;

namespace ChristianFitness.Api.Tests.Events;

/// <summary>
/// L2-022 AC3 and AC7 (ADR 0025): the two rules of an edit that need more than the fields. A start
/// that has passed may stay but not be moved to another time in the past, and the capacity may not go
/// below the members going. The registrations are a reader that answers a number (slice 6.1 owns
/// them), and the clock is this class's own.
/// </summary>
public sealed class EditEventRulesTests(EditEventRulesTests.Factory factory) : IClassFixture<EditEventRulesTests.Factory>
{
    public sealed class Factory : AdminEventsFactory
    {
        public int Going { get; set; }

        protected override void ConfigureServices(IServiceCollection services)
        {
            base.ConfigureServices(services);
            services.RemoveAll<IRegistrationReader>();
            services.AddSingleton<IRegistrationReader>(new FixedGoing(this));
        }
    }

    private sealed class FixedGoing(Factory factory) : IRegistrationReader
    {
        public Task<int> GoingAsync(Guid eventId, CancellationToken cancellationToken) => Task.FromResult(factory.Going);

        public Task<IReadOnlyList<UpcomingEventDto>> UpcomingForAsync(Guid memberId, DateTimeOffset now, CancellationToken cancellationToken) =>
            Task.FromResult<IReadOnlyList<UpcomingEventDto>>([]);

        public Task<IReadOnlyDictionary<Guid, int>> CountsForAsync(IReadOnlyCollection<Guid> memberIds, CancellationToken cancellationToken) =>
            Task.FromResult<IReadOnlyDictionary<Guid, int>>(new Dictionary<Guid, int>());
    }

    [Theory]
    [InlineData(35, HttpStatusCode.Conflict)]
    [InlineData(36, HttpStatusCode.OK)]
    [InlineData(37, HttpStatusCode.OK)]
    public async Task Given_36_going_When_staff_set_the_capacity_Then_below_36_is_refused_with_capacity_below_going(int capacity, HttpStatusCode expected)
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminEvents.SignInStaffAsync(factory, client, $"dana.going.{capacity}@example.org");
        var id = await AdminEvents.CreatedIdAsync(client, cookie, AdminEvents.Retreat());
        factory.Going = 36;
        var body = AdminEvents.Retreat();
        body["capacity"] = capacity;

        using var response = await AdminEvents.SendAsync(client, HttpMethod.Put, $"/api/admin/events/{id}", cookie, body);

        factory.Going = 0;
        Assert.Equal(expected, response.StatusCode);
        if (expected == HttpStatusCode.Conflict)
        {
            Assert.Equal("capacity_below_going", (await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken)).GetProperty("code").GetString());
        }
    }

    [Fact]
    public async Task Given_an_event_that_has_begun_When_staff_edit_it_Then_an_unchanged_start_is_kept_and_a_new_start_in_the_past_is_refused()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminEvents.SignInStaffAsync(factory, client, "dana.past@example.org");
        var id = await AdminEvents.CreatedIdAsync(client, cookie, AdminEvents.Retreat());
        // The retreat starts May 22 at 4:00 PM Toronto; the clock moves to May 23.
        factory.Time.Advance(new DateTimeOffset(2026, 5, 23, 12, 0, 0, TimeSpan.Zero) - factory.Time.GetUtcNow());
        // The staff session idled out meanwhile (ADR 0016), so staff sign in again.
        using var signedIn = await Staff.SignInWithCodeAsync(client, "dana.past@example.org", factory.Time.GetUtcNow());
        cookie = Staff.Cookie(signedIn);
        var sameStart = AdminEvents.Retreat();
        sameStart["place"] = "Camp Muskoka";
        var movedBack = AdminEvents.Retreat();
        movedBack["date"] = "2026-05-21";
        var movedAhead = AdminEvents.Retreat();
        movedAhead["date"] = "2026-06-01";

        using var kept = await AdminEvents.SendAsync(client, HttpMethod.Put, $"/api/admin/events/{id}", cookie, sameStart);
        using var refused = await AdminEvents.SendAsync(client, HttpMethod.Put, $"/api/admin/events/{id}", cookie, movedBack);
        using var moved = await AdminEvents.SendAsync(client, HttpMethod.Put, $"/api/admin/events/{id}", cookie, movedAhead);

        Assert.Equal(HttpStatusCode.OK, kept.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, refused.StatusCode);
        var problem = await refused.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("start_in_past", problem.GetProperty("fieldCodes").GetProperty("date").GetString());
        Assert.Equal(HttpStatusCode.OK, moved.StatusCode);
    }
}
