using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Tests.Account;
using ChristianFitness.Api.Tests.Admin;
using ChristianFitness.Api.Tests.Events;
using ChristianFitness.Api.Tests.Profiles;
using ChristianFitness.Domain.Events;
using ChristianFitness.Domain.Members;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Chat;

/// <summary>
/// L2-017 (slice 25.1; ADR 0057): a member reports a message of a group chat or a direct conversation
/// (<c>POST /api/messages/{id}/reports</c> with an optional reason). The report records who, which
/// message and when; an Active sender becomes Flagged, and the staff Members list shows them so; a
/// second report of the same message by the same member is refused <c>already_reported</c> with no new
/// row; the caller's own message, a message of a conversation they are not in and an unknown message
/// are refused with a code and record nothing.
/// </summary>
public sealed class ReportMessageTests(RegisterForEventFactory factory) : IClassFixture<RegisterForEventFactory>
{
    private sealed record Person(string Cookie, Guid Id, string Name);

    private async Task<Person> MemberAsync(string email, string name)
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await OwnProfileTests.JoinedAsync(client, JoinTests.Details(email) with { FullName = name });
        using var scope = factory.Services.CreateScope();
        var normalized = Member.NormalizeEmail(email);
        var id = await scope.ServiceProvider.GetRequiredService<AppDbContext>().Members
            .Where(m => m.NormalizedEmail == normalized).Select(m => m.Id)
            .SingleAsync(TestContext.Current.CancellationToken);
        return new Person(cookie, id, name);
    }

    private async Task<Guid> GroupMessageAsync(Guid eventId, Person author, params Person[] registered)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        foreach (var person in registered.Append(author).DistinctBy(p => p.Id))
        {
            db.Registrations.Add(Registration.Of(eventId, person.Id, 0, factory.Time.GetUtcNow()));
        }

        factory.Time.Advance(TimeSpan.FromSeconds(1));
        var message = ChatMessage.Of(eventId, author.Id, "Group words", factory.Time.GetUtcNow());
        db.ChatMessages.Add(message);
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        return message.Id;
    }

    private async Task<Guid> DirectMessageAsync(Person from, Person to)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        factory.Time.Advance(TimeSpan.FromSeconds(1));
        var message = DirectMessage.Of(from.Id, to.Id, "Private words", factory.Time.GetUtcNow());
        db.DirectMessages.Add(message);
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        return message.Id;
    }

    private async Task<(HttpStatusCode Status, JsonElement Body)> ReportAsync(Person who, Guid messageId, object? body = null)
    {
        using var client = Browser.CreateClient(factory);
        using var response = await AdminEvents.SendAsync(client, HttpMethod.Post, $"/api/messages/{messageId}/reports", who.Cookie, body ?? new { reason = (string?)null });
        var text = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        return (response.StatusCode, text.Length == 0 ? default : JsonSerializer.Deserialize<JsonElement>(text));
    }

    private async Task<MessageReport[]> ReportsAsync(Guid messageId)
    {
        using var scope = factory.Services.CreateScope();
        return await scope.ServiceProvider.GetRequiredService<AppDbContext>().MessageReports
            .Where(r => r.MessageId == messageId).ToArrayAsync(TestContext.Current.CancellationToken);
    }

    private async Task<MemberStatus> StatusOfAsync(Person who)
    {
        using var scope = factory.Services.CreateScope();
        return await scope.ServiceProvider.GetRequiredService<AppDbContext>().Members
            .Where(m => m.Id == who.Id).Select(m => m.Status).SingleAsync(TestContext.Current.CancellationToken);
    }

    private async Task<JsonElement> StaffMembersAsync(string status)
    {
        using var staff = Browser.CreateClient(factory);
        var email = $"dana.{Guid.NewGuid():N}@example.org";
        await Staff.CreateAsync(factory, staff, email, StaffRoleName.Moderator);
        using var signedIn = await Staff.SignInWithCodeAsync(staff, email, factory.Time.GetUtcNow());
        using var response = await Browser.SendAsync(staff, HttpMethod.Get, $"/api/admin/members?status={status}", Staff.Cookie(signedIn));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
    }

    [Fact]
    public async Task Given_a_group_message_from_another_member_When_reported_with_a_reason_Then_it_is_recorded_and_the_sender_is_flagged_for_staff()
    {
        var eventId = await factory.AddEventAsync("Report Group Run");
        var kevin = await MemberAsync("kevin.rg@example.org", "Kevin Brooks");
        var grace = await MemberAsync("grace.rg@example.org", "Grace Thompson");
        var message = await GroupMessageAsync(eventId, kevin, grace);
        factory.Time.Advance(TimeSpan.FromMinutes(5));

        var (status, _) = await ReportAsync(grace, message, new { reason = "  Pressuring newcomers for money  " });

        Assert.Equal(HttpStatusCode.Created, status);
        var report = Assert.Single(await ReportsAsync(message));
        Assert.Equal((grace.Id, kevin.Id, "Pressuring newcomers for money", factory.Time.GetUtcNow()), (report.ReporterId, report.SenderId, report.Reason, report.ReportedAt));
        Assert.Equal(MemberStatus.Flagged, await StatusOfAsync(kevin));
        var flagged = await StaffMembersAsync("flagged");
        var row = Assert.Single(flagged.GetProperty("members").EnumerateArray(), m => m.GetProperty("id").GetGuid() == kevin.Id);
        Assert.Equal(("flagged", "Reported by a member"), (row.GetProperty("status").GetString(), row.GetProperty("note").GetString()));
        Assert.Equal(MemberStatus.Active, await StatusOfAsync(grace));
    }

    [Fact]
    public async Task Given_a_direct_message_from_another_member_When_reported_without_a_reason_Then_it_is_recorded_with_no_reason_and_the_sender_is_flagged()
    {
        var kevin = await MemberAsync("kevin.rd@example.org", "Kevin Brooks");
        var grace = await MemberAsync("grace.rd@example.org", "Grace Thompson");
        var message = await DirectMessageAsync(kevin, grace);

        var (status, _) = await ReportAsync(grace, message);

        Assert.Equal(HttpStatusCode.Created, status);
        var report = Assert.Single(await ReportsAsync(message));
        Assert.Equal((grace.Id, kevin.Id, (string?)null), (report.ReporterId, report.SenderId, report.Reason));
        Assert.Equal(MemberStatus.Flagged, await StatusOfAsync(kevin));
    }

    [Fact]
    public async Task Given_a_message_already_reported_When_the_same_member_reports_it_again_Then_already_reported_and_no_second_row()
    {
        var kevin = await MemberAsync("kevin.twice@example.org", "Kevin Brooks");
        var grace = await MemberAsync("grace.twice@example.org", "Grace Thompson");
        var message = await DirectMessageAsync(kevin, grace);
        Assert.Equal(HttpStatusCode.Created, (await ReportAsync(grace, message, new { reason = "First" })).Status);

        var (status, body) = await ReportAsync(grace, message, new { reason = "Second" });

        Assert.Equal(HttpStatusCode.Conflict, status);
        Assert.Equal("already_reported", body.GetProperty("code").GetString());
        Assert.Equal(["First"], (await ReportsAsync(message)).Select(r => r.Reason));
    }

    [Fact]
    public async Task Given_a_reported_message_reinstated_by_staff_When_the_same_member_reports_it_again_Then_the_sender_is_not_flagged_a_second_time()
    {
        var kevin = await MemberAsync("kevin.never@example.org", "Kevin Brooks");
        var grace = await MemberAsync("grace.never@example.org", "Grace Thompson");
        var message = await DirectMessageAsync(kevin, grace);
        Assert.Equal(HttpStatusCode.Created, (await ReportAsync(grace, message)).Status);
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var member = await db.Members.SingleAsync(m => m.Id == kevin.Id, TestContext.Current.CancellationToken);
            Assert.True(member.TryReinstate());
            await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        }

        var (status, _) = await ReportAsync(grace, message);

        Assert.Equal(HttpStatusCode.Conflict, status);
        Assert.Equal(MemberStatus.Active, await StatusOfAsync(kevin));
    }

    [Fact]
    public async Task Given_a_flagged_sender_When_another_member_reports_their_message_Then_both_reports_are_kept_and_the_note_is_unchanged()
    {
        var kevin = await MemberAsync("kevin.two@example.org", "Kevin Brooks");
        var grace = await MemberAsync("grace.two@example.org", "Grace Thompson");
        var mary = await MemberAsync("mary.two@example.org", "Mary Okoye");
        var first = await DirectMessageAsync(kevin, grace);
        var second = await DirectMessageAsync(kevin, mary);
        Assert.Equal(HttpStatusCode.Created, (await ReportAsync(grace, first)).Status);

        var (status, _) = await ReportAsync(mary, second);

        Assert.Equal(HttpStatusCode.Created, status);
        Assert.Single(await ReportsAsync(second));
        Assert.Equal(MemberStatus.Flagged, await StatusOfAsync(kevin));
    }

    [Fact]
    public async Task Given_a_suspended_sender_When_their_message_is_reported_Then_the_report_is_recorded_and_they_stay_suspended()
    {
        var kevin = await MemberAsync("kevin.susp@example.org", "Kevin Brooks");
        var grace = await MemberAsync("grace.susp@example.org", "Grace Thompson");
        var message = await DirectMessageAsync(kevin, grace);
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var member = await db.Members.SingleAsync(m => m.Id == kevin.Id, TestContext.Current.CancellationToken);
            Assert.True(member.TrySuspend("Repeated harassment"));
            await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        }

        var (status, _) = await ReportAsync(grace, message);

        Assert.Equal(HttpStatusCode.Created, status);
        Assert.Single(await ReportsAsync(message));
        Assert.Equal(MemberStatus.Suspended, await StatusOfAsync(kevin));
    }

    [Fact]
    public async Task Given_a_members_own_message_When_they_report_it_Then_cannot_report_own_message_and_nothing_is_recorded()
    {
        var eventId = await factory.AddEventAsync("Report Own Run");
        var grace = await MemberAsync("grace.own@example.org", "Grace Thompson");
        var kevin = await MemberAsync("kevin.own@example.org", "Kevin Brooks");
        var group = await GroupMessageAsync(eventId, grace, kevin);
        var direct = await DirectMessageAsync(grace, kevin);

        foreach (var message in new[] { group, direct })
        {
            var (status, body) = await ReportAsync(grace, message);

            Assert.Equal(HttpStatusCode.Forbidden, status);
            Assert.Equal("cannot_report_own_message", body.GetProperty("code").GetString());
            Assert.Empty(await ReportsAsync(message));
        }

        Assert.Equal(MemberStatus.Active, await StatusOfAsync(grace));
    }

    [Fact]
    public async Task Given_a_message_of_a_conversation_the_member_is_not_in_When_they_report_it_Then_message_not_found_and_the_sender_is_not_flagged()
    {
        var eventId = await factory.AddEventAsync("Report Outsider Run");
        var kevin = await MemberAsync("kevin.out@example.org", "Kevin Brooks");
        var grace = await MemberAsync("grace.out@example.org", "Grace Thompson");
        var mary = await MemberAsync("mary.out@example.org", "Mary Okoye");
        var group = await GroupMessageAsync(eventId, kevin, grace);
        var direct = await DirectMessageAsync(kevin, grace);

        foreach (var message in new[] { group, direct, Guid.NewGuid() })
        {
            var (status, body) = await ReportAsync(mary, message);

            Assert.Equal(HttpStatusCode.NotFound, status);
            Assert.Equal("message_not_found", body.GetProperty("code").GetString());
            Assert.Empty(await ReportsAsync(message));
        }

        Assert.Equal(MemberStatus.Active, await StatusOfAsync(kevin));
    }

    [Fact]
    public async Task Given_a_reason_over_500_characters_When_reported_Then_field_too_long_and_nothing_is_recorded()
    {
        var kevin = await MemberAsync("kevin.long@example.org", "Kevin Brooks");
        var grace = await MemberAsync("grace.long@example.org", "Grace Thompson");
        var message = await DirectMessageAsync(kevin, grace);

        var (status, body) = await ReportAsync(grace, message, new { reason = new string('x', 501) });
        var (okStatus, _) = await ReportAsync(grace, message, new { reason = new string('y', 500) });

        Assert.Equal(HttpStatusCode.BadRequest, status);
        Assert.Equal("field_too_long", body.GetProperty("code").GetString());
        Assert.Equal(HttpStatusCode.Created, okStatus);
        Assert.Equal(500, Assert.Single(await ReportsAsync(message)).Reason!.Length);
    }

    [Fact]
    public async Task Given_a_visitor_When_they_report_a_message_Then_they_are_refused_401()
    {
        using var client = Browser.CreateClient(factory);

        using var response = await AdminEvents.SendAsync(client, HttpMethod.Post, $"/api/messages/{Guid.NewGuid()}/reports", null, new { reason = (string?)null });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
