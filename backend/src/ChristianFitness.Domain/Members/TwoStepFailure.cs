namespace ChristianFitness.Domain.Members;

/// <summary>
/// One wrong second-step code for an account (L2-046 AC4; ADR 0013), counted against
/// <see cref="TwoStepChallenge.FailureWindow"/>. Kept per account, not per challenge, so signing in
/// again does not reset the count. Nothing typed is kept.
/// </summary>
public sealed class TwoStepFailure
{
    private TwoStepFailure()
    {
    }

    public Guid Id { get; private set; }

    public Guid MemberId { get; private set; }

    public DateTimeOffset FailedAt { get; private set; }

    public static TwoStepFailure Record(Guid memberId, DateTimeOffset failedAt) =>
        new() { Id = Guid.CreateVersion7(failedAt), MemberId = memberId, FailedAt = failedAt };
}
