using ChristianFitness.Application.Abstractions;
using ChristianFitness.Domain.Audit;

namespace ChristianFitness.Application.Audit;

/// <summary>
/// The audit entry of the auditable command a request is running (ADR 0021), one per request scope.
/// <see cref="AuditBehavior{TRequest, TResponse}"/> opens it with the command's action; the handler
/// names who changed which record with <see cref="Record"/>, before it saves, so the entry is saved
/// with the change itself whenever the change goes through <see cref="IAppDbContext"/>.
/// </summary>
public sealed class AuditTrail(IAppDbContext db, TimeProvider time)
{
    private string? _action;

    /// <summary>The entry the handler recorded, or none yet.</summary>
    internal AuditEntry? Entry { get; private set; }

    /// <summary>Opens the trail for a command doing <paramref name="action"/>.</summary>
    internal void Open(string action)
    {
        if (_action is not null)
        {
            throw new InvalidOperationException("One auditable command runs per request.");
        }

        _action = action;
    }

    /// <summary>
    /// Records that <paramref name="actorMemberId"/> changed the <paramref name="recordType"/> with
    /// <paramref name="recordId"/>, now. Only a handler of an <see cref="IAuditableCommand"/> calls it,
    /// once, and only when the change is going ahead.
    /// </summary>
    public void Record(Guid actorMemberId, string recordType, Guid recordId)
    {
        var action = _action ?? throw new InvalidOperationException("Only an auditable command records an audit entry.");
        if (Entry is not null)
        {
            throw new InvalidOperationException("An auditable command records one audit entry.");
        }

        Entry = AuditEntry.Record(actorMemberId, action, recordType, recordId, time.GetUtcNow());
        db.AuditEntries.Add(Entry);
    }
}
