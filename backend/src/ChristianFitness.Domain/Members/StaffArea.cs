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

    /// <summary>Listings and listing suggestions, <c>api/admin/directory</c> (ADR 0064, ADR 0090).</summary>
    Directory,

    /// <summary>Event series (L2-071; ADR 0091): open to Moderators too.</summary>
    Series,

    /// <summary>Stories and their bylines, <c>api/admin/stories</c> (L2-068 AC7; ADR 0094): Admins only.</summary>
    Publishing,

    /// <summary>Community Pick, <c>api/admin/community-pick</c> (L2-072 AC11; ADR 0098): open to Moderators too.</summary>
    CommunityPick,

    /// <summary>An admin endpoint in no area above yet: closed to Moderators until a slice names its area.</summary>
    Unlisted,
}
