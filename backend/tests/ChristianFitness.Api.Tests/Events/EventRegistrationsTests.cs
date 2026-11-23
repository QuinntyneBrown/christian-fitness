using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Tests.Account;
using ChristianFitness.Api.Tests.Admin;
using ChristianFitness.Api.Tests.Profiles;

namespace ChristianFitness.Api.Tests.Events;

/// <summary>
/// L2-024 AC1 (ADR 0036): staff open an event's registrations and see each registered member's
/// name and registration date, oldest first, with the capacity and a total that matches going in the
/// events list. Nothing else about a member is in the answer; a member, nobody signed in and an
/// unknown event are refused.
/// </summary>
public sealed class EventRegistrationsTests(RegisterForEventFactory factory) : IClassFixture<RegisterForEventFactory>
{
    private static string RegistrationsPath(Guid id) => $"/api/admin/events/{id}/registrations";

    private async Task<(HttpClient Client, string Cookie)> MemberAsync(string email, string name)
    {
        var client = Browser.CreateClient(factory);
        var cookie = await OwnProfileTests.JoinedAsync(client, JoinTests.Details(email) with { FullName = name });
        return (client, cookie);
    }

    private async Task<(HttpClient Client, string Cookie)> StaffAsync(string email)
    {
        var client = Browser.CreateClient(factory);
        await Staff.CreateAsync(factory, client, email, Domain.Members.StaffRoleName.Admin);
        using var signedIn = await Staff.SignInWithCodeAsync(client, email, factory.Time.GetUtcNow());
        return (client, Staff.Cookie(signedIn));
    }

    private static async Task<JsonElement> ReadAsync(HttpClient client, string cookie, HttpMethod method, string path, HttpStatusCode expected)
    {
        using var response = await AdminEvents.SendAsync(client, method, path, cookie);
        Assert.Equal(expected, response.StatusCode);
        return await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
    }

    [Fact]
    public async Task Given_two_registered_members_When_staff_open_the_registrations_Then_names_and_dates_are_listed_oldest_first_and_the_total_matches_going()
    {
        var id = await factory.AddEventAsync("Registered Run", capacity: 12);
        var other = await factory.AddEventAsync("Other Run");
        var (anna, annaCookie) = await MemberAsync("anna.registrations@example.org", "Anna Lee");
        var (ben, benCookie) = await MemberAsync("ben.registrations@example.org", "Ben Cho");
        var first = factory.Time.GetUtcNow();
        await ReadAsync(anna, annaCookie, HttpMethod.Post, $"/api/events/{id}/registrations", HttpStatusCode.OK);
        factory.Time.Advance(TimeSpan.FromMinutes(1));
        var second = factory.Time.GetUtcNow();
        await ReadAsync(ben, benCookie, HttpMethod.Post, $"/api/events/{id}/registrations", HttpStatusCode.OK);
        await ReadAsync(ben, benCookie, HttpMethod.Post, $"/api/events/{other}/registrations", HttpStatusCode.OK);
        var (staff, staffCookie) = await StaffAsync("dana.registrations@example.org");

        var answer = await ReadAsync(staff, staffCookie, HttpMethod.Get, RegistrationsPath(id), HttpStatusCode.OK);
        var list = await ReadAsync(staff, staffCookie, HttpMethod.Get, "/api/admin/events", HttpStatusCode.OK);

        Assert.Equal(["capacity", "eventId", "going", "registrations", "title"], answer.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.Equal(("Registered Run", 12, 2), (answer.GetProperty("title").GetString(), answer.GetProperty("capacity").GetInt32(), answer.GetProperty("going").GetInt32()));
        var rows = answer.GetProperty("registrations").EnumerateArray().ToArray();
        Assert.All(rows, row => Assert.Equal(["name", "registeredAt"], row.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal)));
        Assert.Equal(["Anna Lee", "Ben Cho"], rows.Select(r => r.GetProperty("name").GetString()));
        Assert.Equal([first, second], rows.Select(r => r.GetProperty("registeredAt").GetDateTimeOffset()));
        var listed = list.GetProperty("events").EnumerateArray().Single(e => e.GetProperty("id").GetString() == id.ToString());
        Assert.Equal(2, listed.GetProperty("going").GetInt32());
        Assert.Equal(answer.GetProperty("going").GetInt32(), listed.GetProperty("going").GetInt32());
    }

    [Fact]
    public async Task Given_an_event_nobody_registered_for_When_staff_open_the_registrations_Then_the_list_is_empty_and_going_is_zero()
    {
        var id = await factory.AddEventAsync("Quiet Run");
        var (staff, staffCookie) = await StaffAsync("dana.registrationsempty@example.org");

        var answer = await ReadAsync(staff, staffCookie, HttpMethod.Get, RegistrationsPath(id), HttpStatusCode.OK);

        Assert.Equal((0, 0), (answer.GetProperty("going").GetInt32(), answer.GetProperty("registrations").GetArrayLength()));
    }

    [Fact]
    public async Task Given_an_unknown_event_When_staff_open_the_registrations_Then_it_answers_404_not_found()
    {
        var (staff, staffCookie) = await StaffAsync("dana.registrationsunknown@example.org");

        var refusal = await ReadAsync(staff, staffCookie, HttpMethod.Get, RegistrationsPath(Guid.NewGuid()), HttpStatusCode.NotFound);

        Assert.Equal("not_found", refusal.GetProperty("code").GetString());
    }

    [Fact]
    public async Task Given_a_member_or_nobody_When_the_registrations_are_asked_for_Then_they_are_refused()
    {
        var id = await factory.AddEventAsync("Private Run");
        var (member, cookie) = await MemberAsync("grace.registrationsmember@example.org", "Grace Thompson");
        using var anonymous = Browser.CreateClient(factory);

        using var asMember = await AdminEvents.SendAsync(member, HttpMethod.Get, RegistrationsPath(id), cookie);
        using var asNobody = await AdminEvents.SendAsync(anonymous, HttpMethod.Get, RegistrationsPath(id), cookie: null);

        // A member session is not a staff session: the admin area answers it as it answers nobody (ADR 0011).
        Assert.Equal((HttpStatusCode.Unauthorized, HttpStatusCode.Unauthorized), (asMember.StatusCode, asNobody.StatusCode));
    }
}
