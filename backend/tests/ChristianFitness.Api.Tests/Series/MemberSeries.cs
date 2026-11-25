using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Tests.Account;
using ChristianFitness.Api.Tests.Profiles;
using ChristianFitness.Domain.Events;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Series;

/// <summary>
/// What the member's series tests need (L2-050; ADR 0093): a member who joined, the list and count
/// read through the API, and an enrolment put straight in the store, as journey 12's Join will.
/// </summary>
internal static class MemberSeries
{
    public const string Path = "/api/events/series";

    public static async Task<(HttpClient Client, string Cookie)> MemberAsync(AdminSeriesFactory factory, string email)
    {
        var client = Browser.CreateClient(factory);
        var cookie = await OwnProfileTests.JoinedAsync(client, JoinTests.Details(email));
        return (client, cookie);
    }

    /// <summary>Reads the list with <paramref name="query"/> (no leading <c>?</c>); asserts 200.</summary>
    public static async Task<JsonElement> ListAsync(HttpClient client, string cookie, string query = "")
    {
        using var response = await Browser.SendAsync(client, HttpMethod.Get, query.Length == 0 ? Path : $"{Path}?{query}", cookie);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
    }

    /// <summary>The titles of a list, in order.</summary>
    public static List<string?> TitlesOf(JsonElement list) =>
        [.. list.GetProperty("series").EnumerateArray().Select(s => s.GetProperty("title").GetString())];

    /// <summary>Reads the count; asserts 200 and its one key.</summary>
    public static async Task<int> CountAsync(HttpClient client, string cookie)
    {
        using var response = await Browser.SendAsync(client, HttpMethod.Get, $"{Path}/count", cookie);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var answer = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal(["count"], AdminSeries.Keys(answer));
        return answer.GetProperty("count").GetInt32();
    }

    /// <summary>Enrols the member with <paramref name="email"/> in <paramref name="series"/>.</summary>
    public static async Task EnrolAsync(AdminSeriesFactory factory, EventSeries series, string email)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var normalized = Domain.Members.Member.NormalizeEmail(email);
        var memberId = await db.Members.Where(m => m.NormalizedEmail == normalized).Select(m => m.Id).SingleAsync(TestContext.Current.CancellationToken);
        db.SeriesEnrolments.Add(SeriesEnrolment.Of(series.Id, memberId, series.PriceCents, series.CreatedAt));
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
    }
}
