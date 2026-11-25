namespace ChristianFitness.Domain.Directory;

/// <summary>Where a directory listing is in its review (L2-054 AC8; ADR 0082). Only <see cref="Published"/> is listed.</summary>
public enum ListingStatus
{
    /// <summary>Not yet checked by staff.</summary>
    Draft,

    /// <summary>Checked by staff and in the directory ("Listed" in the console).</summary>
    Published,

    /// <summary>Staff declined it.</summary>
    Declined,

    /// <summary>Staff took it out of the directory.</summary>
    Removed,
}
