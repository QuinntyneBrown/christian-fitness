namespace ChristianFitness.Domain.Feedback;

/// <summary>What a note is about (L2-063 AC3; ADR 0109): sent as <c>idea</c>, <c>problem</c>, <c>correction</c> or <c>thanks</c>.</summary>
public enum FeedbackKind
{
    Idea,

    /// <summary>"Something's off": the one kind that may carry a screenshot (L2-063 AC4).</summary>
    Problem,

    Correction,

    Thanks,
}
