namespace ChristianFitness.Application.Sessions;

/// <summary>Who is signed in. It carries no contact detail and no password (L2-030 AC1).</summary>
public sealed record SessionDto(Guid MemberId, string Name);
