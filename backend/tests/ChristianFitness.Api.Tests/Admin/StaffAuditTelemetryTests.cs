using System.Net;
using ChristianFitness.Api.Tests.Telemetry;
using ChristianFitness.Domain.Members;

namespace ChristianFitness.Api.Tests.Admin;

/// <summary>
/// L2-019 AC3 with L2-033 AC2 (ADR 0023): an audited staff change tells telemetry what was done and
/// nothing of who did it or which record it changed; the audit entry in the database holds those.
/// </summary>
public sealed class StaffAuditTelemetryTests(TelemetryTests.Factory factory) : IClassFixture<TelemetryTests.Factory>
{
    [Fact]
    public async Task Given_staff_When_they_sign_in_and_out_Then_telemetry_names_each_audited_action_and_no_person_or_record()
    {
        using var client = Browser.CreateClient(factory);
        var id = await Staff.CreateAsync(factory, client, "dana.audit.telemetry@example.org", StaffRoleName.Admin);
        using var signedIn = await Staff.SignInWithCodeAsync(client, "dana.audit.telemetry@example.org");
        using var signedOut = await Browser.SendAsync(client, HttpMethod.Delete, "/api/admin/session", Staff.Cookie(signedIn));
        Assert.Equal(HttpStatusCode.NoContent, signedOut.StatusCode);

        foreach (var action in new[] { "staff_session.started", "staff_session.ended" })
        {
            var log = await factory.Logs.WaitForAsync(
                l => l.Body == "Staff change {AuditAction} audited" && (l.Attributes ?? []).Any(a => a.Key == "AuditAction" && Equals(a.Value, action)),
                l => $"{l.Body} {{{string.Join(", ", (l.Attributes ?? []).Select(a => $"{a.Key}={a.Value}"))}}}",
                $"the audit log of {action}");
            Assert.Equal(["AuditAction", "{OriginalFormat}"], (log.Attributes ?? []).Select(a => a.Key).Order(StringComparer.Ordinal));
        }

        var recorded = factory.Spans.Snapshot()
            .SelectMany(s => s.TagObjects.Select(t => $"{t.Value}").Append(s.DisplayName).Append(s.StatusDescription ?? string.Empty).Concat(s.Events.Select(e => e.Name)))
            .Concat(factory.Logs.Snapshot().Select(log => string.Join(" | ", [log.CategoryName, log.FormattedMessage, log.Body, .. (log.Attributes ?? []).Select(a => $"{a.Key}={a.Value}")])))
            .ToArray();
        foreach (var personal in new[] { id, "dana.audit.telemetry", "Grace Thompson", "StaffSession" })
        {
            Assert.DoesNotContain(recorded, value => value.Contains(personal, StringComparison.OrdinalIgnoreCase));
        }
    }
}
