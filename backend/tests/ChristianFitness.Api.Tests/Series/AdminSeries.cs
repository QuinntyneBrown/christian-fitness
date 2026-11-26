using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Tests.Admin;
using ChristianFitness.Api.Tests.Events;
using ChristianFitness.Domain.Events;
using ChristianFitness.Domain.Members;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Series;

/// <summary>
/// What the console's series tests need (L2-071; ADR 0091): the API with the clock at the mocks'
/// today (<see cref="AdminEvents.Today"/>, Wednesday April 15, 2026), staff of either role signed
/// in, and series with dated sessions put straight in the store, as the seed or the create and Add
/// a date slices make them.
/// </summary>
internal static class AdminSeries
{
    /// <summary>Signs a new staff member with <paramref name="role"/> in; answers the staff session cookie.</summary>
    public static async Task<string> SignInAsync(AdminSeriesFactory factory, HttpClient client, string email, StaffRoleName role = StaffRoleName.Admin)
    {
        await Staff.CreateAsync(factory, client, email, role);
        using var signedIn = await Staff.SignInWithCodeAsync(client, email, factory.Time.GetUtcNow());
        return Staff.Cookie(signedIn);
    }

    /// <summary>The 6:30 PM start, in Toronto, of <paramref name="date"/>.</summary>
    public static DateTimeOffset At(DateOnly date, int hour = 18, int minute = 30) =>
        EventSchedule.StartOf(date, new TimeOnly(hour, minute));

    /// <summary>A series as the seed or the editor makes it, hosted by the team listing unless <paramref name="host"/> is given.</summary>
    public static EventSeries NewSeries(
        string title,
        DateTimeOffset createdAt,
        int capacity = 40,
        int priceCents = 0,
        int? dropInPriceCents = 0,
        Guid? host = null,
        string place = "Humber Bay Park East",
        string area = "Etobicoke, Toronto",
        EventCategory category = EventCategory.Run) =>
        EventSeries.Create(
            title,
            category,
            "Eight weeks from walking to running a full 5K, together.",
            null,
            host ?? Domain.Directory.DirectoryListing.TeamListingId,
            priceCents,
            dropInPriceCents,
            capacity,
            place,
            area,
            createdAt);

    /// <summary>Reads an answer as JSON.</summary>
    public static async Task<JsonElement> JsonAsync(HttpResponseMessage response) =>
        await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken).ConfigureAwait(false);

    /// <summary>The names of an object's properties, in order.</summary>
    public static string[] Keys(JsonElement element) => [.. element.EnumerateObject().Select(p => p.Name)];
}

/// <summary>One session to put in the store: its Toronto date, an optional topic, and whether it was cancelled.</summary>
internal sealed record SessionSeed(DateOnly Date, string? Topic = null, bool Cancelled = false, int StartHour = 18, int StartMinute = 30, int Minutes = 60);

/// <summary>The API with a clock the tests move, starting at the mocks' today, and a way to add series.</summary>
public class AdminSeriesFactory : AdminEventsFactory
{
    /// <summary>Puts <paramref name="series"/>, its <paramref name="sessions"/> and <paramref name="joined"/> enrolments in the store; answers the sessions' ids in the order given.</summary>
    internal async Task<IReadOnlyList<Guid>> AddSeriesAsync(EventSeries series, IReadOnlyList<SessionSeed> sessions, int joined = 0)
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.EventSeries.Add(series);
        var ids = new List<Guid>();
        foreach (var seed in sessions)
        {
            var starts = AdminSeries.At(seed.Date, seed.StartHour, seed.StartMinute);
            var session = Event.CreateSession(series, starts, starts.AddMinutes(seed.Minutes), seed.Topic, series.CreatedAt);
            if (seed.Cancelled)
            {
                session.Cancel();
            }

            db.Events.Add(session);
            ids.Add(session.Id);
        }

        for (var n = 0; n < joined; n++)
        {
            db.SeriesEnrolments.Add(SeriesEnrolment.Of(series.Id, Guid.NewGuid(), series.PriceCents, series.CreatedAt));
        }

        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        return ids;
    }

    /// <summary>Gives each member a place at each session, as Register or Join would (free, so confirmed).</summary>
    internal async Task AddRegistrationsAsync(IReadOnlyList<(Guid SessionId, Guid MemberId)> places)
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        foreach (var (sessionId, memberId) in places)
        {
            db.Registrations.Add(Registration.Of(sessionId, memberId, 0, Time.GetUtcNow()));
        }

        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
    }

    /// <summary>Couch to 5K Run Club as the mocks draw it: eight Tuesdays from April 7, the sixth cancelled, 31 of 40 joined.</summary>
    internal Task<IReadOnlyList<Guid>> AddCouchTo5KAsync(EventSeries series) =>
        AddSeriesAsync(
            series,
            [
                new(new DateOnly(2026, 4, 7), "Walk, run 60 seconds, repeat. Meet your pace group"),
                new(new DateOnly(2026, 4, 14), "Run 90 seconds, walk 2 minutes"),
                new(new DateOnly(2026, 4, 21), "Same intervals, six times through"),
                new(new DateOnly(2026, 4, 28), "First 5-minute run"),
                new(new DateOnly(2026, 5, 5), "Two 8-minute runs"),
                new(new DateOnly(2026, 5, 12), "No class: Victoria Day week", Cancelled: true),
                new(new DateOnly(2026, 5, 19), "Twenty minutes without stopping"),
                new(new DateOnly(2026, 5, 26), "Graduation 5K and potluck"),
            ],
            joined: 31);
}
