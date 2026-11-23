using System.Net.Http.Json;
using ChristianFitness.Api.Tests.Admin;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Time.Testing;

namespace ChristianFitness.Api.Tests.Events;

/// <summary>
/// What the admin event tests need: the API with a clock they move, a signed-in staff member, and
/// the event the event editor mock draws, as the admin app sends it (ADR 0021).
/// </summary>
internal static class AdminEvents
{
    /// <summary>The mocks' today: Wednesday, April 15, 2026, 8:45 AM in Toronto (12:45 UTC).</summary>
    public static readonly DateTimeOffset Today = new(2026, 4, 15, 12, 45, 0, TimeSpan.Zero);

    /// <summary>Whole Life Retreat, from the event editor mock, as the editor sends it.</summary>
    public static Dictionary<string, object?> Retreat() => new(StringComparer.Ordinal)
    {
        ["title"] = "Whole Life Retreat",
        ["category"] = "retreat",
        ["date"] = "2026-05-22",
        ["startTime"] = "16:00",
        ["place"] = "Muskoka Woods, Rosseau",
        ["area"] = "Muskoka Lakes",
        ["priceCents"] = 34000,
        ["capacity"] = 60,
        ["summary"] = "Three days of trail runs, strength sessions, worship by the lake and real rest. Meals and cabins included.",
    };

    /// <summary>Signs a new staff member with <paramref name="email"/> in to the admin app; answers the staff session cookie.</summary>
    public static async Task<string> SignInStaffAsync(AdminEventsFactory factory, HttpClient client, string email)
    {
        await Staff.CreateAsync(factory, client, email, Domain.Members.StaffRoleName.Admin);
        using var signedIn = await Staff.SignInWithCodeAsync(client, email, factory.Time.GetUtcNow());
        return Staff.Cookie(signedIn);
    }

    /// <summary>Sends <paramref name="body"/> as JSON with <paramref name="method"/> to <paramref name="path"/>, carrying <paramref name="cookie"/>.</summary>
    public static async Task<HttpResponseMessage> SendAsync(HttpClient client, HttpMethod method, string path, string? cookie, object? body = null)
    {
        using var request = new HttpRequestMessage(method, new Uri(path, UriKind.Relative)) { Content = body is null ? null : JsonContent.Create(body) };
        if (cookie is not null)
        {
            request.Headers.Add("Cookie", cookie);
        }

        return await client.SendAsync(request, TestContext.Current.CancellationToken).ConfigureAwait(false);
    }

    /// <summary>Creates <paramref name="body"/> as a draft through the API.</summary>
    /// <summary>Creates a draft and answers its id.</summary>
    public static async Task<Guid> CreatedIdAsync(HttpClient client, string cookie, object body)
    {
        using var response = await CreateAsync(client, cookie, body).ConfigureAwait(false);
        response.EnsureSuccessStatusCode();
        var created = await response.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>(TestContext.Current.CancellationToken).ConfigureAwait(false);
        return Guid.Parse(created.GetProperty("id").GetString()!);
    }

    public static Task<HttpResponseMessage> CreateAsync(HttpClient client, string cookie, object body) =>
        SendAsync(client, HttpMethod.Post, "/api/admin/events", cookie, body);
}

/// <summary>The API with a clock the tests move (AGENTS.md: never sleep), starting at <see cref="AdminEvents.Today"/>.</summary>
public class AdminEventsFactory : ApiFactory
{
    public FakeTimeProvider Time { get; } = new(AdminEvents.Today);

    protected override void ConfigureServices(IServiceCollection services)
    {
        base.ConfigureServices(services);
        services.RemoveAll<TimeProvider>();
        services.AddSingleton<TimeProvider>(Time);
    }
}
