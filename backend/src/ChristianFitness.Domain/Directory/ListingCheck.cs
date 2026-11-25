namespace ChristianFitness.Domain.Directory;

/// <summary>The four checks every listing passes before staff approve it (L2-073 AC3), in the panel's order.</summary>
public enum ListingCheck
{
    /// <summary>Certification or registration number verified with the issuing body.</summary>
    Credentials,

    /// <summary>Liability coverage on file, where the work calls for it.</summary>
    Insurance,

    /// <summary>At least one from a church or ministry leader.</summary>
    TwoReferences,

    /// <summary>A call with the team about faith and how they work.</summary>
    Conversation,
}
