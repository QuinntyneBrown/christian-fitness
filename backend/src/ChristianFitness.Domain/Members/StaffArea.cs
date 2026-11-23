namespace ChristianFitness.Domain.Members;

/// <summary>The parts of the admin console an endpoint can belong to (L2-019; ADR 0020).</summary>
public enum StaffArea
{
    /// <summary>The console itself: the staff session, and anything at <c>api/admin</c> alone.</summary>
    Console,

    Dashboard,

    Members,

    Events,

    Services,

    /// <summary>An admin endpoint in no area above yet: closed to Moderators until a slice names its area.</summary>
    Unlisted,
}
