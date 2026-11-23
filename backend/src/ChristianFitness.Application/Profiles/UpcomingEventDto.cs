namespace ChristianFitness.Application.Profiles;

/// <summary>An event the member is going to, as the profile's "Going to" list shows it (L2-005 AC1); staff cancelled it when <paramref name="Cancelled"/> (ADR 0035).</summary>
public sealed record UpcomingEventDto(Guid EventId, string Title, DateTimeOffset StartsAt, string? ImageUrl, bool Cancelled = false);
