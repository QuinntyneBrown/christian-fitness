namespace ChristianFitness.Domain.Scheduling;

/// <summary>
/// The exclusive, expiring right to run scheduled work (ADR 0069, ADR 0104): one row per kind of
/// work, by <see cref="Name"/>. A replica takes it when it is free or expired, or renews it when it
/// already holds it; <see cref="Version"/> is the concurrency token, so of two replicas taking it at
/// once only one is stored. <see cref="Fence"/> grows each time a different holder takes it.
/// </summary>
public sealed class SchedulerLease
{
    public const int NameMaxLength = 64;
    public const int HolderMaxLength = 128;

    private SchedulerLease()
    {
    }

    public string Name { get; private set; } = string.Empty;

    /// <summary>The replica holding it, by a name of its own; none until first taken.</summary>
    public string? Holder { get; private set; }

    /// <summary>When it is free to take unless the holder renews it first.</summary>
    public DateTimeOffset ExpiresAt { get; private set; }

    /// <summary>Grows each time the lease changes hands.</summary>
    public long Fence { get; private set; }

    /// <summary>Grows with every write; the concurrency token.</summary>
    public int Version { get; private set; }

    /// <summary>A lease no one holds yet.</summary>
    public static SchedulerLease Create(string name, DateTimeOffset now)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        return new SchedulerLease { Name = name, ExpiresAt = now };
    }

    /// <summary>
    /// Takes or renews the lease for <paramref name="holder"/> until <paramref name="now"/> plus
    /// <paramref name="duration"/>, when it is free, expired or already the holder's; answers whether
    /// it did. The change still has to be stored before another replica's.
    /// </summary>
    public bool TryTake(string holder, DateTimeOffset now, TimeSpan duration)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(holder);
        if (Holder != holder && ExpiresAt > now)
        {
            return false;
        }

        if (Holder != holder)
        {
            Holder = holder;
            Fence++;
        }

        ExpiresAt = now + duration;
        Version++;
        return true;
    }
}
