namespace ChristianFitness.Domain.Directory;

/// <summary>Where a listing suggestion is in staff's review (L2-073; ADR 0085).</summary>
public enum SuggestionStatus
{
    /// <summary>Sent by a member; staff have not decided it.</summary>
    Waiting,

    /// <summary>Staff approved it and made a draft listing from it.</summary>
    Approved,

    /// <summary>Staff declined it.</summary>
    Declined,
}
