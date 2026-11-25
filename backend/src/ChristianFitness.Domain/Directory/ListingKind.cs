namespace ChristianFitness.Domain.Directory;

/// <summary>
/// What a directory listing is (L2-054), declared in the order the directory groups them. Stored by
/// name, so the order here never changes what a row means.
/// </summary>
public enum ListingKind
{
    Organization,
    Person,
    Instructor,
    Ambassador,
    Company,
    ChurchMinistry,
}
