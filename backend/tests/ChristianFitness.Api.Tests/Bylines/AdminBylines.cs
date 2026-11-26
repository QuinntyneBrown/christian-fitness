using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Tests.Admin;
using ChristianFitness.Api.Tests.Events;
using ChristianFitness.Domain.Members;
using ChristianFitness.Domain.News;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Bylines;

/// <summary>
/// What the console's byline tests need (L2-077; ADR 0094): the API with the clock at the mocks'
/// today, staff of either role signed in, and bylines and the stories that use them put straight in
/// the store, as the seed and the story editor (issue 172) make them.
/// </summary>
internal static class AdminBylines
{
    public const string Path = "/api/admin/stories/bylines";

    /// <summary>Signs a new staff member with <paramref name="role"/> in; answers the staff session cookie.</summary>
    public static async Task<string> SignInAsync(BylinesFactory factory, HttpClient client, string email, StaffRoleName role = StaffRoleName.Admin)
    {
        await Staff.CreateAsync(factory, client, email, role);
        using var signedIn = await Staff.SignInWithGoogleAsync(factory, client, email);
        return Staff.Cookie(signedIn);
    }

    /// <summary>Every byline, as the page asks for them.</summary>
    public static Task<HttpResponseMessage> ListAsync(HttpClient client, string cookie) =>
        AdminEvents.SendAsync(client, HttpMethod.Get, Path, cookie);

    /// <summary>Reads an answer as JSON.</summary>
    public static async Task<JsonElement> JsonAsync(HttpResponseMessage response) =>
        await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken).ConfigureAwait(false);

    /// <summary>The names of an object's properties, in order.</summary>
    public static string[] Keys(JsonElement element) => [.. element.EnumerateObject().Select(p => p.Name)];

    /// <summary>The listed bylines whose names start with <paramref name="prefix"/>, in any case, as the list orders them.</summary>
    public static async Task<JsonElement[]> RowsStartingAsync(HttpClient client, string cookie, string prefix)
    {
        using var response = await ListAsync(client, cookie);
        response.EnsureSuccessStatusCode();
        return [.. (await JsonAsync(response)).GetProperty("bylines").EnumerateArray()
            .Where(b => b.GetProperty("name").GetString()!.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))];
    }
}

/// <summary>The API with a clock at the mocks' today, and a way to add bylines and stories.</summary>
public class BylinesFactory : AdminEventsFactory
{
    /// <summary>Puts a byline in the store with <paramref name="stories"/> stories using it; answers its id.</summary>
    internal async Task<Guid> AddBylineAsync(string name, string bio = "Writes for Christian Fitness.", int stories = 0, string? photoKey = null)
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var byline = Byline.Create(name, bio, photoKey, Time.GetUtcNow());
        db.Bylines.Add(byline);
        for (var n = 0; n < stories; n++)
        {
            db.Stories.Add(Story.Create(byline.Id, $"Story {n + 1} by {name}", Time.GetUtcNow()));
        }

        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        return byline.Id;
    }

    /// <summary>Puts a story using <paramref name="bylineId"/> in the store, as the editor will.</summary>
    internal async Task AddStoryAsync(Guid bylineId)
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Stories.Add(Story.Create(bylineId, "A story that took the byline", Time.GetUtcNow()));
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
    }

    /// <summary>The byline as stored now, or none.</summary>
    internal async Task<Byline?> FindBylineAsync(Guid id)
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await db.Bylines.AsNoTracking().SingleOrDefaultAsync(b => b.Id == id, TestContext.Current.CancellationToken);
    }
}
