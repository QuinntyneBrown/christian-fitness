using System.Net;
using ChristianFitness.Domain.Members;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Time.Testing;

namespace ChristianFitness.Api.Tests.Admin;

/// <summary>
/// L2-019 AC3 (ADR 0023): a staff change that succeeds leaves one audit entry saying who made it,
/// what it was, which record it changed and when; a refused one leaves none. Proved on the staff
/// commands <c>main</c> has: starting and ending a staff session.
/// </summary>
public sealed class StaffAuditTests(StaffAuditTests.Factory factory) : IClassFixture<StaffAuditTests.Factory>
{
    /// <summary>The API with a clock the tests move (AGENTS.md: never sleep).</summary>
    public sealed class Factory : ApiFactory
    {
        public FakeTimeProvider Time { get; } = new(new DateTimeOffset(2026, 11, 23, 9, 0, 10, TimeSpan.Zero));

        protected override void ConfigureServices(IServiceCollection services)
        {
            services.RemoveAll<TimeProvider>();
            services.AddSingleton<TimeProvider>(Time);
        }
    }

    [Fact]
    public async Task Given_staff_with_two_step_set_up_When_their_code_starts_the_staff_session_Then_an_audit_entry_records_who_what_which_record_and_when()
    {
        using var client = Browser.CreateClient(factory);
        var id = Guid.Parse(await Staff.CreateAsync(factory, client, "dana.audit.in@example.org", StaffRoleName.Admin));
        factory.Time.Advance(TimeSpan.FromMinutes(3));
        var at = factory.Time.GetUtcNow();

        using var response = await Staff.SignInWithCodeAsync(client, "dana.audit.in@example.org", at);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal([(id, "staff_session.started", "StaffSession", id, at)], await EntriesOfAsync(id));
    }

    [Fact]
    public async Task Given_signed_in_staff_When_they_sign_out_Then_an_audit_entry_records_the_session_they_ended()
    {
        using var client = Browser.CreateClient(factory);
        var id = Guid.Parse(await Staff.CreateAsync(factory, client, "sam.audit.out@example.org", StaffRoleName.Moderator));
        var signedInAt = factory.Time.GetUtcNow();
        using var signedIn = await Staff.SignInWithCodeAsync(client, "sam.audit.out@example.org", signedInAt);
        factory.Time.Advance(TimeSpan.FromMinutes(7));
        var signedOutAt = factory.Time.GetUtcNow();

        using var response = await Browser.SendAsync(client, HttpMethod.Delete, "/api/admin/session", Staff.Cookie(signedIn));

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(
            [(id, "staff_session.started", "StaffSession", id, signedInAt), (id, "staff_session.ended", "StaffSession", id, signedOutAt)],
            await EntriesOfAsync(id));
    }

    public static TheoryData<string, string, string, bool> Refused => new()
    {
        // why, email, password, whether a wrong code is sent after the password step
        { "a wrong password", "dana.audit.password@example.org", "abundantlifE", false },
        { "the password step alone, which starts no session", "dana.audit.pending@example.org", Staff.Password, false },
        { "a wrong code", "dana.audit.code@example.org", Staff.Password, true },
    };

    [Theory]
    [MemberData(nameof(Refused))]
    public async Task Given_staff_When_their_sign_in_is_refused_or_not_finished_Then_no_audit_entry_is_recorded(string why, string email, string password, bool wrongCode)
    {
        Assert.NotNull(why);
        using var client = Browser.CreateClient(factory);
        var id = Guid.Parse(await Staff.CreateAsync(factory, client, email, StaffRoleName.Admin));

        using var passwordStep = await Staff.SignInAsync(client, email, password);
        if (wrongCode)
        {
            var right = Staff.CodeAt(factory.Time.GetUtcNow());
            using var codeStep = await Staff.VerifyAsync(client, Staff.StepCookie(passwordStep), right == "999999" ? "999998" : "999999");
            Assert.Equal(HttpStatusCode.Unauthorized, codeStep.StatusCode);
        }

        Assert.Empty(await EntriesOfAsync(id));
        Assert.DoesNotContain(await AllEntriesAsync(), entry => entry.RecordId == id);
    }

    /// <summary>The audit entries <paramref name="actor"/> made, oldest first.</summary>
    private async Task<List<(Guid Actor, string Action, string RecordType, Guid RecordId, DateTimeOffset OccurredAt)>> EntriesOfAsync(Guid actor)
    {
        var entries = await AllEntriesAsync();
        return [.. entries
            .Where(entry => entry.ActorMemberId == actor)
            .OrderBy(entry => entry.OccurredAt)
            .Select(entry => (entry.ActorMemberId, entry.Action, entry.RecordType, entry.RecordId, entry.OccurredAt))];
    }

    private async Task<List<Domain.Audit.AuditEntry>> AllEntriesAsync()
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await db.AuditEntries.AsNoTracking().ToListAsync(TestContext.Current.CancellationToken);
    }
}
