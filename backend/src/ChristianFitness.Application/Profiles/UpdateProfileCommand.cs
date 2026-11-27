using System.Text.Json.Serialization;
using MediatR;

namespace ChristianFitness.Application.Profiles;

/// <summary>
/// The Edit profile dialog's values for the member the URL names (L2-006; ADR 0024). A class, not a
/// record: a record's generated <c>ToString</c> would print the home church and bio if it were ever
/// logged (L2-033 AC2).
/// </summary>
public sealed class UpdateProfileCommand : IRequest<OwnProfileDto>
{
    /// <summary>The member id as the URL wrote it; never read from the body.</summary>
    [JsonIgnore]
    public string MemberId { get; private init; } = string.Empty;

    public string Name { get; init; } = string.Empty;

    public string? City { get; init; }

    /// <summary>Optional and sensitive (L2-033 AC1): blank or missing is stored as none.</summary>
    public string? HomeChurch { get; init; }

    public string? Bio { get; init; }

    public IReadOnlyList<string> Goals { get; init; } = [];

    public IReadOnlyList<string> Interests { get; init; } = [];

    /// <summary>The values of <paramref name="body"/> for the member <paramref name="memberId"/> names.</summary>
    public static UpdateProfileCommand For(string memberId, UpdateProfileCommand body)
    {
        ArgumentNullException.ThrowIfNull(body);
        return new UpdateProfileCommand
        {
            MemberId = memberId,
            Name = body.Name,
            City = body.City,
            HomeChurch = body.HomeChurch,
            Bio = body.Bio,
            Goals = body.Goals,
            Interests = body.Interests,
        };
    }
}
