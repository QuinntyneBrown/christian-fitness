namespace ChristianFitness.Domain.Services;

/// <summary>Where a professional application stands (L2-026; ADR 0000). Staff decide it in slice 25.</summary>
public enum ApplicationStatus
{
    Pending,
    Approved,
    Declined,
}
