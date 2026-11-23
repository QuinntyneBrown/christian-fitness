namespace ChristianFitness.Application.Audit;

/// <summary>
/// A staff command that changes data (L2-019 AC3; ADR 0023). <see cref="AuditBehavior{TRequest, TResponse}"/>
/// records an audit entry for it when its handler succeeds; its handler names who made the change
/// and which record it changed through <see cref="AuditTrail"/>. Every data-changing staff command
/// carries this marker, and nothing else is needed to audit it.
/// </summary>
public interface IAuditableCommand
{
    /// <summary>What the command does, as a stable name: <c>{record}.{past tense}</c>, such as <c>event.created</c>.</summary>
    string AuditAction { get; }
}
