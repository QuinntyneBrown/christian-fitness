namespace ChristianFitness.Domain.Members;

/// <summary>
/// A member's request for a copy of their data (L2-066 AC1 to AC3; ADR 0078, ADR 0117): when it was
/// asked for, and once the scheduled builder has made the .zip, when it was ready, the key it is
/// stored under and when its link stops working. A class with no generated <c>ToString</c>.
/// </summary>
public sealed class DataExportRequest
{
    /// <summary>How long a request shows as asked for, and answers a second press (AC3).</summary>
    public static readonly TimeSpan RequestWindow = TimeSpan.FromHours(24);

    /// <summary>How long the link works once the archive is ready (AC2).</summary>
    public static readonly TimeSpan LinkLifetime = TimeSpan.FromDays(7);

    public const int ArchiveKeyMaxLength = 64;

    private DataExportRequest()
    {
    }

    public Guid Id { get; private set; }

    public Guid MemberId { get; private set; }

    public DateTimeOffset RequestedAt { get; private set; }

    public DateTimeOffset? ReadyAt { get; private set; }

    /// <summary>Where the archive is kept while it can be downloaded; none before it is built and after it expires.</summary>
    public string? ArchiveKey { get; private set; }

    public DateTimeOffset? ExpiresAt { get; private set; }

    public static DataExportRequest Ask(Guid memberId, DateTimeOffset now) =>
        new() { Id = Guid.CreateVersion7(now), MemberId = memberId, RequestedAt = now };

    /// <summary>Whether a request made at this time still shows as asked for at <paramref name="now"/>.</summary>
    public bool IsRecentAt(DateTimeOffset now) => now - RequestedAt < RequestWindow;

    /// <summary>The archive is stored under <paramref name="archiveKey"/>; its link works for <see cref="LinkLifetime"/>.</summary>
    public void Ready(string archiveKey, DateTimeOffset now)
    {
        ArgumentException.ThrowIfNullOrEmpty(archiveKey);
        if (ReadyAt is not null)
        {
            throw new InvalidOperationException("The archive is built once.");
        }

        ArchiveKey = archiveKey;
        ReadyAt = now;
        ExpiresAt = now + LinkLifetime;
    }

    /// <summary>Whether its archive can be downloaded at <paramref name="now"/>.</summary>
    public bool IsDownloadableAt(DateTimeOffset now) => ArchiveKey is not null && ExpiresAt > now;

    /// <summary>The archive has been removed; the link stops working.</summary>
    public void Expire() => ArchiveKey = null;
}
