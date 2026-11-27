using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Audit;
using ChristianFitness.Domain.Members;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Preferences;

/// <summary>
/// "Request download" on Preferences (L2-066 AC1, AC10; ADR 0117): records that the member asked for
/// their data, audited with the member as actor (ADR 0078). A request of theirs younger than 24 hours
/// is answered instead, and nothing is added or audited.
/// </summary>
public sealed record RequestDataExportCommand : IRequest<DataExportRequestedDto>, IAuditableCommand
{
    public string AuditAction => "data_export.requested";
}

/// <summary>When the member asked; the scheduled builder emails the link within 24 hours of it.</summary>
public sealed record DataExportRequestedDto(DateTimeOffset RequestedAt);

internal static class DataExportRequests
{
    /// <summary>The member's request still shown as asked for at <paramref name="now"/>, or none (AC3).</summary>
    public static async Task<DataExportRequest?> RecentAsync(IAppDbContext db, Guid memberId, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var since = now - DataExportRequest.RequestWindow;
        return await db.DataExportRequests.AsNoTracking()
            .Where(r => r.MemberId == memberId && r.RequestedAt > since)
            .OrderByDescending(r => r.RequestedAt)
            .FirstOrDefaultAsync(cancellationToken).ConfigureAwait(false);
    }
}

internal sealed class RequestDataExportHandler(IAppDbContext db, ICurrentMember current, AuditTrail audit, TimeProvider time)
    : IRequestHandler<RequestDataExportCommand, DataExportRequestedDto>
{
    public async Task<DataExportRequestedDto> Handle(RequestDataExportCommand request, CancellationToken cancellationToken)
    {
        var now = time.GetUtcNow();
        if (await DataExportRequests.RecentAsync(db, current.Id, now, cancellationToken).ConfigureAwait(false) is { } recent)
        {
            audit.Unchanged();
            return new DataExportRequestedDto(recent.RequestedAt);
        }

        var asked = DataExportRequest.Ask(current.Id, now);
        db.DataExportRequests.Add(asked);
        audit.Record(current.Id, nameof(DataExportRequest), asked.Id);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return new DataExportRequestedDto(asked.RequestedAt);
    }
}
