using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Tests.Admin;
using ChristianFitness.Api.Tests.Events;
using ChristianFitness.Domain.Events;
using ChristianFitness.Domain.Members;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.CommunityPicks;

/// <summary>
/// What the Community Pick tests need (L2-072; ADR 0098): the API with the clock at the mocks'
/// today, staff of either role signed in, and events, registrations and picks put straight in the
/// store, as the event editor, members and earlier picks make them.
/// </summary>
internal static class AdminCommunityPicks
{
    public const string EventsPath = "/api/admin/community-pick/events";
    public const string PicksPath = "/api/admin/community-pick/picks";

    /// <summary>Signs a new staff member with <paramref name="role"/> in; answers the staff session cookie.</summary>
    public static async Task<string> SignInAsync(CommunityPickFactory factory, HttpClient client, string email, StaffRoleName role = StaffRoleName.Admin)
    {
        await Staff.CreateAsync(factory, client, email, role);
        using var signedIn = await Staff.SignInWithGoogleAsync(factory, client, email);
        return Staff.Cookie(signedIn);
    }

    /// <summary>The pickable events, as the page asks for them.</summary>
    public static Task<HttpResponseMessage> ListAsync(HttpClient client, string cookie) =>
        AdminEvents.SendAsync(client, HttpMethod.Get, EventsPath, cookie);

    /// <summary>Records a pick of <paramref name="eventId"/> with <paramref name="note"/>.</summary>
    public static Task<HttpResponseMessage> RecordAsync(HttpClient client, string? cookie, object? eventId, object? note) =>
        AdminEvents.SendAsync(client, HttpMethod.Post, PicksPath, cookie, new Dictionary<string, object?>(StringComparer.Ordinal) { ["eventId"] = eventId, ["note"] = note });

    /// <summary>Reads an answer as JSON.</summary>
    public static async Task<JsonElement> JsonAsync(HttpResponseMessage response) =>
        await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken).ConfigureAwait(false);

    /// <summary>The names of an object's properties, in order.</summary>
    public static string[] Keys(JsonElement element) => [.. element.EnumerateObject().Select(p => p.Name)];
}

/// <summary>The API with a clock at the mocks' today, and a way to add events, registrations and picks.</summary>
public class CommunityPickFactory : AdminEventsFactory
{
    /// <summary>
    /// Puts an event in the store starting <paramref name="startsIn"/> from now, published unless
    /// <paramref name="status"/> says otherwise, with <paramref name="going"/> members registered.
    /// </summary>
    internal async Task<Guid> AddEventAsync(
        string title,
        TimeSpan startsIn,
        EventStatus status = EventStatus.Published,
        int going = 0,
        int capacity = 200,
        int priceCents = 0,
        string? imageKey = null,
        string place = "Martin Goodman Trail, Marilyn Bell Park",
        string area = "Waterfront, Toronto")
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var now = Time.GetUtcNow();
        var added = Event.CreateDraft(title, EventCategory.Run, now + startsIn, place, area, priceCents, capacity, "A summary.", now, imageKey);
        if (status != EventStatus.Draft)
        {
            added.Publish();
        }

        if (status == EventStatus.Cancelled)
        {
            added.Cancel();
        }

        db.Events.Add(added);
        for (var n = 0; n < going; n++)
        {
            db.Registrations.Add(Registration.Of(added.Id, Guid.CreateVersion7(), priceCents, now));
        }

        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        return added.Id;
    }

    /// <summary>Puts a pick of <paramref name="eventId"/> made at <paramref name="pickedAt"/> in the store.</summary>
    internal async Task AddPickAsync(Guid eventId, DateTimeOffset pickedAt)
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.CommunityPicks.Add(CommunityPick.Record(eventId, "An earlier pick.", Guid.CreateVersion7(), pickedAt));
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
    }

    /// <summary>The picks of <paramref name="eventId"/> as stored now.</summary>
    internal async Task<List<CommunityPick>> PicksOfAsync(Guid eventId)
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await db.CommunityPicks.AsNoTracking().Where(p => p.EventId == eventId).ToListAsync(TestContext.Current.CancellationToken);
    }
}
