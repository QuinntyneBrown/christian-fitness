namespace ChristianFitness.Domain.Members;

/// <summary>
/// The accounts the system itself owns (ADR 0065, ADR 0087). "Christian Fitness" sends suggestion
/// outcomes, claim links and feedback replies as direct messages; it cannot sign in, is in no list
/// and takes no replies.
/// </summary>
public static class SystemMembers
{
    /// <summary>The stable id of the Christian Fitness account, which the seed creates.</summary>
    public static readonly Guid ChristianFitnessId = new("0193a9c0-0000-7000-8000-00000000cf00");

    public const string ChristianFitnessName = "Christian Fitness";

    /// <summary>An unroutable address (RFC 2606 <c>.invalid</c>): no mail is ever sent to it and no one can join with it.</summary>
    public const string ChristianFitnessEmail = "system@christian.fitness.invalid";
}
