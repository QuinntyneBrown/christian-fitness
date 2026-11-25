namespace ChristianFitness.Application.Abstractions;

/// <summary>The member the current request's session belongs to.</summary>
public interface ICurrentMember
{
    /// <summary>The signed-in member's id. Only endpoints that require a session ask for it.</summary>
    Guid Id { get; }

    /// <summary>The signed-in member's id, or none for an anonymous caller: for reads that serve both (ADR 0088).</summary>
    Guid? SignedInId { get; }
}
