namespace ChristianFitness.Domain.Events;

/// <summary>
/// One member's place in a whole series; at most one per pair (ADR 0091). The console counts them
/// as "Joined" (L2-071 AC1, AC2, AC13); joining and leaving come with journey 12, which holds a
/// place at each remaining session as well.
/// </summary>
public sealed class SeriesEnrolment
{
    private SeriesEnrolment()
    {
    }

    public Guid Id { get; private set; }

    public Guid SeriesId { get; private set; }

    public Guid MemberId { get; private set; }

    /// <summary>Reserved for a paid series until payment is made outside the system; else confirmed (ADR 0032).</summary>
    public RegistrationStatus Status { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    /// <summary>A place in <paramref name="seriesId"/>, reserved when the series is paid.</summary>
    public static SeriesEnrolment Of(Guid seriesId, Guid memberId, int seriesPriceCents, DateTimeOffset createdAt) => new()
    {
        Id = Guid.CreateVersion7(createdAt),
        SeriesId = seriesId,
        MemberId = memberId,
        Status = seriesPriceCents > 0 ? RegistrationStatus.Reserved : RegistrationStatus.Confirmed,
        CreatedAt = createdAt,
    };
}
