using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Events;

/// <summary>
/// L2-019 AC3 (ADR 0023): creating an event is a staff change, so a draft that is saved leaves one
/// audit entry naming who created it and which event; a draft the validator refuses leaves none.
/// </summary>
public sealed class CreateEventAuditTests(AdminEventsFactory factory) : IClassFixture<AdminEventsFactory>
{
    [Fact]
    public async Task Given_signed_in_staff_When_they_create_an_event_Then_an_audit_entry_records_who_created_which_event()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminEvents.SignInStaffAsync(factory, client, "dana.audit.create@example.org");

        using var response = await AdminEvents.CreateAsync(client, cookie, AdminEvents.Retreat());

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var eventId = Guid.Parse((await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken)).GetProperty("id").GetString()!);
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var staffId = await db.Members.Where(m => m.NormalizedEmail == "dana.audit.create@example.org").Select(m => m.Id).SingleAsync(TestContext.Current.CancellationToken);
        var entries = await db.AuditEntries.Where(e => e.RecordId == eventId).ToListAsync(TestContext.Current.CancellationToken);
        var entry = Assert.Single(entries);
        Assert.Equal((staffId, "event.created", "Event"), (entry.ActorMemberId, entry.Action, entry.RecordType));
    }

    [Fact]
    public async Task Given_signed_in_staff_When_the_event_is_refused_Then_no_audit_entry_is_recorded()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await AdminEvents.SignInStaffAsync(factory, client, "dana.audit.refused@example.org");
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var before = await db.AuditEntries.CountAsync(e => e.Action == "event.created", TestContext.Current.CancellationToken);
        var body = AdminEvents.Retreat();
        body["title"] = string.Empty;

        using var response = await AdminEvents.CreateAsync(client, cookie, body);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(before, await db.AuditEntries.CountAsync(e => e.Action == "event.created", TestContext.Current.CancellationToken));
    }
}
