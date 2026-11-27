using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Tests.Events;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Time.Testing;

namespace ChristianFitness.Api.Tests.Preferences;

/// <summary>The API with a clock the tests move and archives kept in memory (journey 35).</summary>
public sealed class DataExportFactory : ApiFactory
{
    public static readonly DateTimeOffset Now = new(2026, 4, 15, 12, 45, 0, TimeSpan.Zero);

    public FakeTimeProvider Time { get; } = new(Now);

    protected override void ConfigureServices(IServiceCollection services)
    {
        services.RemoveAll<TimeProvider>();
        services.AddSingleton<TimeProvider>(Time);
    }
}

/// <summary>Requests the data export tests share.</summary>
internal static class Exports
{
    public const string Path = "/api/data-exports";

    public static Task<HttpResponseMessage> RequestAsync(HttpClient client, string? cookie) =>
        AdminEvents.SendAsync(client, HttpMethod.Post, Path, cookie);
}

/// <summary>
/// L2-066 AC1, AC3 and AC10 (journey 35): "Request download" records the request and audits it with
/// the member as actor; Preferences answers when it was asked for while that is within 24 hours, so
/// the confirmation shows in place of the button; a second request inside the 24 hours answers the
/// first and adds nothing.
/// </summary>
public sealed class DataExportRequestTests(DataExportFactory factory) : IClassFixture<DataExportFactory>
{
    [Fact]
    public async Task Given_a_member_When_they_request_a_download_Then_it_is_recorded_audited_and_shown_in_preferences_for_24_hours()
    {
        using var client = Browser.CreateClient(factory);
        var (cookie, memberId) = await Prefs.JoinAsync(factory, client, "grace.export.request@example.org");
        var before = await Prefs.GetAsync(client, cookie);
        Assert.Equal(JsonValueKind.Null, before.GetProperty("downloadRequestedAt").ValueKind);
        var askedAt = factory.Time.GetUtcNow();

        using var response = await Exports.RequestAsync(client, cookie);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var answer = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal(["requestedAt"], answer.EnumerateObject().Select(p => p.Name));
        Assert.Equal(askedAt, answer.GetProperty("requestedAt").GetDateTimeOffset());
        Assert.Equal(askedAt, (await Prefs.GetAsync(client, cookie)).GetProperty("downloadRequestedAt").GetDateTimeOffset());
        var (requests, audits) = await RecordsOfAsync(memberId);
        var request = Assert.Single(requests);
        var audit = Assert.Single(audits);
        Assert.Equal((memberId, "data_export.requested", "DataExportRequest", request, askedAt), audit);

        // Within the 24 hours a second press answers the first request and adds nothing.
        factory.Time.Advance(TimeSpan.FromHours(24) - TimeSpan.FromSeconds(1));
        using var again = await Exports.RequestAsync(client, cookie);
        Assert.Equal(HttpStatusCode.OK, again.StatusCode);
        Assert.Equal(askedAt, (await again.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken)).GetProperty("requestedAt").GetDateTimeOffset());
        Assert.Equal((1, 1), ((await RecordsOfAsync(memberId)).Requests.Count, (await RecordsOfAsync(memberId)).Audits.Count));
        Assert.Equal(askedAt, (await Prefs.GetAsync(client, cookie)).GetProperty("downloadRequestedAt").GetDateTimeOffset());

        // After 24 hours the button is back, and a press asks again.
        factory.Time.Advance(TimeSpan.FromSeconds(1));
        Assert.Equal(JsonValueKind.Null, (await Prefs.GetAsync(client, cookie)).GetProperty("downloadRequestedAt").ValueKind);
        using var later = await Exports.RequestAsync(client, cookie);
        Assert.Equal(factory.Time.GetUtcNow(), (await later.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken)).GetProperty("requestedAt").GetDateTimeOffset());
        Assert.Equal((2, 2), ((await RecordsOfAsync(memberId)).Requests.Count, (await RecordsOfAsync(memberId)).Audits.Count));
    }

    [Fact]
    public async Task Given_no_session_When_a_download_is_requested_Then_it_is_refused()
    {
        using var client = Browser.CreateClient(factory);

        using var response = await Exports.RequestAsync(client, cookie: null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    private async Task<(List<Guid> Requests, List<(Guid, string, string, Guid, DateTimeOffset)> Audits)> RecordsOfAsync(Guid memberId)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var requests = await db.DataExportRequests.AsNoTracking().Where(r => r.MemberId == memberId).Select(r => r.Id).ToListAsync(TestContext.Current.CancellationToken);
        var audits = (await db.AuditEntries.AsNoTracking().Where(a => a.ActorMemberId == memberId && a.Action == "data_export.requested").ToListAsync(TestContext.Current.CancellationToken))
            .Select(a => (a.ActorMemberId, a.Action, a.RecordType, a.RecordId, a.OccurredAt)).ToList();
        return (requests, audits);
    }
}
