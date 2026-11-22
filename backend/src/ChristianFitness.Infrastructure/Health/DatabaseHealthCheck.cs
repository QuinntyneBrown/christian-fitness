using ChristianFitness.Application.Abstractions;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace ChristianFitness.Infrastructure.Health;

/// <summary>Readiness: the database is reachable (L2-040 AC2). Reports status only, never why.</summary>
internal sealed class DatabaseHealthCheck(IAppDbContext db) : IHealthCheck
{
    public const string ReadyTag = "ready";

    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
    {
        try
        {
            return await db.CanConnectAsync(cancellationToken).ConfigureAwait(false)
                ? HealthCheckResult.Healthy()
                : HealthCheckResult.Unhealthy();
        }
#pragma warning disable CA1031 // Any failure to reach the database means not ready; its detail is not reported.
        catch (Exception)
#pragma warning restore CA1031
        {
            return HealthCheckResult.Unhealthy();
        }
    }
}
