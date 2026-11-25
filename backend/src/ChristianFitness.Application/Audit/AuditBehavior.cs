using ChristianFitness.Application.Abstractions;
using MediatR;
using Microsoft.Extensions.Logging;

namespace ChristianFitness.Application.Audit;

/// <summary>
/// Audits every staff change (L2-019 AC3; ADR 0023). For an <see cref="IAuditableCommand"/> it opens
/// the request's <see cref="AuditTrail"/>, runs the handler and, when the handler succeeds, saves the
/// entry the handler recorded (already saved if the handler saved after recording it). A command
/// that is refused or fails throws before this point and leaves no entry. An auditable command whose
/// handler names no record fails, so a slice that forgets cannot change data unaudited. Telemetry
/// gets the action name only: never who, nor which record (L2-033 AC2).
/// </summary>
internal sealed partial class AuditBehavior<TRequest, TResponse>(AuditTrail trail, IAppDbContext db, ILogger<AuditTrail> logger)
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(next);
        if (request is not IAuditableCommand command)
        {
            return await next(cancellationToken).ConfigureAwait(false);
        }

        trail.Open(command.AuditAction);
        var response = await next(cancellationToken).ConfigureAwait(false);
        if (trail.NothingChanged)
        {
            return response;
        }

        if (trail.Entry is null)
        {
            throw new InvalidOperationException($"{typeof(TRequest).Name} changed data without recording an audit entry.");
        }

        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        Audited(logger, command.AuditAction);
        return response;
    }

    [LoggerMessage(Level = LogLevel.Information, Message = "Staff change {AuditAction} audited")]
    private static partial void Audited(ILogger logger, string auditAction);
}
