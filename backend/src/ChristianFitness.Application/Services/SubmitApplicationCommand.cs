using MediatR;

namespace ChristianFitness.Application.Services;

/// <summary>
/// The Apply to be listed dialog's values for the signed-in member (L2-026; ADR 0000). A class, not
/// a record, so a generated <c>ToString</c> never prints the values if one is logged.
/// </summary>
public sealed class SubmitApplicationCommand : IRequest<ApplicationDto>
{
    public string Role { get; init; } = string.Empty;

    /// <summary>One of <c>Training</c>, <c>Nutrition</c>, <c>Physio</c>, <c>Coaching</c>, <c>Counselling</c>.</summary>
    public string Category { get; init; } = string.Empty;

    public string Credentials { get; init; } = string.Empty;

    public string Where { get; init; } = string.Empty;

    public string Price { get; init; } = string.Empty;

    public string About { get; init; } = string.Empty;
}
