namespace ChristianFitness.Application.Account;

/// <summary>
/// At most <see cref="Limit"/> accounts created from one client address in a sliding hour (L2-034
/// AC2; ADR 0012). <see cref="TryAcquire"/> records a creation before it happens and answers its
/// lease, or none once the address has used its hour; a join that then fails gives the lease back
/// with <see cref="Release"/>, so only accounts created count. Kept in memory under a lock: no
/// address is stored, and each call forgets addresses whose creations have all left the hour, so
/// it holds at most the last hour's creations.
/// </summary>
public sealed class AccountCreationLimiter(TimeProvider time)
{
    public const int Limit = 5;

    public static readonly TimeSpan Window = TimeSpan.FromHours(1);

    private readonly Lock _gate = new();
    private readonly Dictionary<string, List<DateTimeOffset>> _creations = new(StringComparer.Ordinal);

    /// <summary>Records a creation for <paramref name="partitionKey"/> now, or answers null when it has <see cref="Limit"/> in the last hour.</summary>
    public Lease? TryAcquire(string partitionKey)
    {
        ArgumentNullException.ThrowIfNull(partitionKey);
        var now = time.GetUtcNow();
        var windowStart = now - Window;
        lock (_gate)
        {
            Forget(windowStart);
            if (!_creations.TryGetValue(partitionKey, out var created))
            {
                created = [];
                _creations[partitionKey] = created;
            }

            if (created.Count >= Limit)
            {
                return null;
            }

            created.Add(now);
            return new Lease(partitionKey, now);
        }
    }

    /// <summary>Gives back a lease whose join created nothing.</summary>
    public void Release(Lease lease)
    {
        ArgumentNullException.ThrowIfNull(lease);
        lock (_gate)
        {
            if (_creations.TryGetValue(lease.PartitionKey, out var created) && created.Remove(lease.At) && created.Count == 0)
            {
                _creations.Remove(lease.PartitionKey);
            }
        }
    }

    /// <summary>Drops every creation the hour has left behind, and every address left with none.</summary>
    private void Forget(DateTimeOffset windowStart)
    {
        foreach (var (key, created) in _creations.ToList())
        {
            created.RemoveAll(at => at <= windowStart);
            if (created.Count == 0)
            {
                _creations.Remove(key);
            }
        }
    }

    /// <summary>
    /// One creation counted for an address. A class, not a record: a record's generated
    /// <c>ToString</c> would print the address if it were ever logged (L2-033 AC2).
    /// </summary>
    public sealed class Lease(string partitionKey, DateTimeOffset at)
    {
        internal string PartitionKey { get; } = partitionKey;

        internal DateTimeOffset At { get; } = at;
    }
}
