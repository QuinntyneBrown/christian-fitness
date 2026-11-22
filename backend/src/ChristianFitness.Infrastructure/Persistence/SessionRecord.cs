namespace ChristianFitness.Infrastructure.Persistence;

/// <summary>
/// One signed-in session, kept on the server so that signing out ends it there (L2-004 AC5; ADR
/// 0009). The cookie carries only the protected <see cref="Id"/>; the ticket holds the member id
/// claim and the session's expiry, nothing personal.
/// </summary>
public sealed class SessionRecord
{
    public string Id { get; set; } = string.Empty;

    public Guid MemberId { get; set; }

    public DateTimeOffset? ExpiresAt { get; set; }

    /// <summary>The serialized authentication ticket.</summary>
    public byte[] Ticket { get; set; } = [];
}
