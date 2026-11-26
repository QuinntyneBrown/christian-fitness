namespace ChristianFitness.Domain.Feedback;

/// <summary>Where a note stands for staff (L2-074): New until answered or resolved.</summary>
public enum FeedbackStatus
{
    New,
    Replied,
    Resolved,
}
