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
/// them). The start rule moves the clock, so it is in <see cref="EditEventPastStartTests"/>.
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

        public Task<IReadOnlyDictionary<Guid, int>> GoingForAsync(IReadOnlyCollection<Guid> eventIds, CancellationToken cancellationToken) =>
            Task.FromResult<IReadOnlyDictionary<Guid, int>>(new Dictionary<Guid, int>());

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
}
