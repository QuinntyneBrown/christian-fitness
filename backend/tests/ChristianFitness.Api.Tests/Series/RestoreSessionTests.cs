using System.Net;
using ChristianFitness.Api.Tests.Events;
using ChristianFitness.Application.Seeding;
using ChristianFitness.Domain.Events;
using ChristianFitness.Domain.Members;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Series;

/// <summary>
/// L2-071 AC5, AC9 (ADR 0103): staff restore a cancelled series date whose start has not passed.
/// It is upcoming again, Sessions left rises by one, the members who held a place hold it again,
/// the series chat is told, the answer says how many hold it, and an audit entry records who,
/// which series and which session. A date that is not cancelled is refused
/// <c>event_not_cancelled</c>, one that has started <c>session_started</c>, and a session not of
/// the series <c>not_found</c>, each changing nothing. A Moderator may restore too. Today is April
/// 15, 2026: Couch to 5K's May 12 is cancelled.
/// </summary>
public sealed class RestoreSessionTests(AdminSeriesFactory factory) : IClassFixture<AdminSeriesFactory>
{
    /// <summary>May 12, the sixth date: cancelled.</summary>
    private const int May12 = 5;

    private static Task<HttpResponseMessage> RestoreAsync(HttpClient client, string cookie, Guid seriesId, Guid sessionId) =>
        AdminEvents.SendAsync(client, HttpMethod.Post, $"/api/admin/series/{seriesId}/sessions/{sessionId}/restore", cookie);

    /// <summary>Couch to 5K with two members who held May 12 before it was cancelled; answers the series, its sessions and the members.</summary>
    private async Task<(EventSeries Series, IReadOnlyList<Guid> Sessions, Guid[] Held)> CouchHeldAsync(string title)
    {
        var series = AdminSeries.NewSeries(title, factory.Time.GetUtcNow());
        var sessions = await factory.AddCouchTo5KAsync(series);
        var tag = Guid.NewGuid().ToString("N")[..12];
        var held = new Guid[2];
        for (var n = 0; n < held.Length; n++)
        {
            var email = $"held{n}.{tag}@example.org";
            var (client, _) = await MemberSeries.MemberAsync(factory, email);
            client.Dispose();
            await MemberSeries.EnrolAsync(factory, series, email);
            held[n] = await MemberSeries.MemberIdAsync(factory, email);
        }

        await factory.AddRegistrationsAsync([(sessions[May12], held[0]), (sessions[May12], held[1])]);
        return (series, sessions, held);
    }

    [Fact]
    public async Task Given_May_12_cancelled_with_two_places_kept_When_an_Admin_restores_it_Then_it_is_upcoming_its_places_are_held_and_Sessions_left_rises_by_one()
    {
        var (series, sessions, held) = await CouchHeldAsync("Couch Restore");
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminSeries.SignInAsync(factory, client, "dana.series.restore@example.org");

        using var response = await RestoreAsync(client, cookie, series.Id, sessions[May12]);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var answer = await AdminSeries.JsonAsync(response);
        Assert.Equal(["series", "told"], AdminSeries.Keys(answer));
        Assert.Equal(2, answer.GetProperty("told").GetInt32());
        var shown = answer.GetProperty("series");
        Assert.Equal((6, 8), (shown.GetProperty("sessionsLeft").GetInt32(), shown.GetProperty("sessionsHeld").GetInt32()));
        Assert.Equal(
            ["done", "done", "live", "upcoming", "upcoming", "upcoming", "upcoming", "upcoming"],
            shown.GetProperty("sessions").EnumerateArray().Select(s => s.GetProperty("state").GetString()));
        Assert.Equal(2, shown.GetProperty("sessions")[May12].GetProperty("joinedGoing").GetInt32());

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(EventStatus.Published, (await db.Events.AsNoTracking().SingleAsync(e => e.Id == sessions[May12], TestContext.Current.CancellationToken)).Status);
        Assert.Equal(
            held.Order(),
            (await db.Registrations.Where(r => r.EventId == sessions[May12]).Select(r => r.MemberId).ToListAsync(TestContext.Current.CancellationToken)).Order());
    }

    [Fact]
    public async Task Given_May_12_cancelled_When_it_is_restored_Then_the_series_chat_is_told_by_Christian_Fitness_and_an_audit_entry_records_it()
    {
        using (var seed = factory.Services.CreateScope())
        {
            await new SeedRunner([new SystemAccountSeed(factory.Time)], seed.ServiceProvider.GetRequiredService<AppDbContext>()).RunAsync(TestContext.Current.CancellationToken);
        }

        var (series, sessions, _) = await CouchHeldAsync("Couch Restore Told");
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminSeries.SignInAsync(factory, client, "dana.series.restore.told@example.org");

        using var response = await RestoreAsync(client, cookie, series.Id, sessions[May12]);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var notice = Assert.Single(await db.ChatMessages.AsNoTracking().Where(m => m.ScopeId == series.Id).ToListAsync(TestContext.Current.CancellationToken));
        Assert.Equal(
            (ChatScopeKind.Series, SystemMembers.ChristianFitnessId, "Tue, May 12 is back on. If you held a place, it is yours again."),
            (notice.ScopeKind, notice.AuthorId, notice.Text));
        var staffId = await db.Members.Where(m => m.NormalizedEmail == "dana.series.restore.told@example.org").Select(m => m.Id).SingleAsync(TestContext.Current.CancellationToken);
        var entry = Assert.Single(await db.AuditEntries.Where(e => e.RecordId == sessions[May12]).ToListAsync(TestContext.Current.CancellationToken));
        Assert.Equal((staffId, "series.session_restored", "Event"), (entry.ActorMemberId, entry.Action, entry.RecordType));
    }

    public static TheoryData<string, int, HttpStatusCode, string> Refusals() => new()
    {
        // why, which session (-1: one of another series), the status and the code expected
        { "May 5 is not cancelled", 4, HttpStatusCode.Conflict, "event_not_cancelled" },
        { "cancelled April 14 has started", 1, HttpStatusCode.Conflict, "session_started" },
        { "the session is another series'", -1, HttpStatusCode.NotFound, "not_found" },
    };

    [Theory]
    [MemberData(nameof(Refusals))]
    public async Task Given_a_date_that_cannot_be_restored_When_staff_restore_it_Then_it_is_refused_and_nothing_changes(string why, int index, HttpStatusCode status, string code)
    {
        var series = AdminSeries.NewSeries($"Couch Restore Refused {why}", factory.Time.GetUtcNow());
        var sessions = await factory.AddSeriesAsync(
            series,
            [
                new(new DateOnly(2026, 4, 7)),
                new(new DateOnly(2026, 4, 14), Cancelled: true),
                new(new DateOnly(2026, 4, 21)),
                new(new DateOnly(2026, 4, 28)),
                new(new DateOnly(2026, 5, 5)),
                new(new DateOnly(2026, 5, 12), Cancelled: true),
            ]);
        var elsewhere = await factory.AddCouchTo5KAsync(AdminSeries.NewSeries($"Elsewhere Restore {why}", factory.Time.GetUtcNow()));
        var sessionId = index < 0 ? elsewhere[May12] : sessions[index];
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminSeries.SignInAsync(factory, client, $"dana.series.restore.refused.{index + 1}@example.org");
        EventStatus before;
        using (var scope = factory.Services.CreateScope())
        {
            before = (await scope.ServiceProvider.GetRequiredService<AppDbContext>().Events.AsNoTracking().SingleAsync(e => e.Id == sessionId, TestContext.Current.CancellationToken)).Status;
        }

        using var response = await RestoreAsync(client, cookie, series.Id, sessionId);

        Assert.Equal(status, response.StatusCode);
        Assert.Equal(code, (await AdminSeries.JsonAsync(response)).GetProperty("code").GetString());
        using var after = factory.Services.CreateScope();
        var db = after.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(before, (await db.Events.AsNoTracking().SingleAsync(e => e.Id == sessionId, TestContext.Current.CancellationToken)).Status);
        Assert.Equal(0, await db.AuditEntries.CountAsync(e => e.RecordId == sessionId, TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task Given_a_Moderator_When_they_restore_a_date_Then_it_is_restored()
    {
        var (series, sessions, _) = await CouchHeldAsync("Couch Restore Moderator");
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminSeries.SignInAsync(factory, client, "mo.series.restore@example.org", StaffRoleName.Moderator);

        using var response = await RestoreAsync(client, cookie, series.Id, sessions[May12]);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
