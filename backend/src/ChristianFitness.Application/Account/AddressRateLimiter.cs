namespace ChristianFitness.Application.Account;

/// <summary>
/// At most a given number of leases per client address in a sliding window (L2-034; ADR 0012, ADR
/// 0014). <see cref="TryAcquire"/> records one now and answers it, or none once the address has
/// used its window; <see cref="Release"/> gives one back, for a limit that counts only what
/// succeeded. Kept in memory under a lock: no address is stored, and each call forgets addresses
/// whose leases have all left the window, so it holds at most the last window's leases. Each
/// subclass is one limit with counts of its own.
/// </summary>
public abstract class AddressRateLimiter
{
    private readonly TimeProvider _time;
    private readonly int _limit;
    private readonly TimeSpan _window;
    private readonly Lock _gate = new();
    private readonly Dictionary<string, List<DateTimeOffset>> _leases = new(StringComparer.Ordinal);

    protected AddressRateLimiter(TimeProvider time, int limit, TimeSpan window)
    {
        ArgumentNullException.ThrowIfNull(time);
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(limit);
        _time = time;
        _limit = limit;
        _window = window;
    }

    /// <summary>Records a lease for <paramref name="partitionKey"/> now, or answers null when it holds the limit in the window.</summary>
    public Lease? TryAcquire(string partitionKey)
    {
        ArgumentNullException.ThrowIfNull(partitionKey);
        var now = _time.GetUtcNow();
        var windowStart = now - _window;
        lock (_gate)
        {
            Forget(windowStart);
            if (!_leases.TryGetValue(partitionKey, out var held))
            {
                held = [];
                _leases[partitionKey] = held;
            }

            if (held.Count >= _limit)
            {
                return null;
            }

            held.Add(now);
            return new Lease(partitionKey, now);
        }
    }

    /// <summary>Gives back a lease whose request did not count.</summary>
    public void Release(Lease lease)
    {
        ArgumentNullException.ThrowIfNull(lease);
        lock (_gate)
        {
            if (_leases.TryGetValue(lease.PartitionKey, out var held) && held.Remove(lease.At) && held.Count == 0)
            {
                _leases.Remove(lease.PartitionKey);
            }
        }
    }

    /// <summary>Drops every lease the window has left behind, and every address left with none.</summary>
    private void Forget(DateTimeOffset windowStart)
    {
        foreach (var (key, held) in _leases.ToList())
        {
            held.RemoveAll(at => at <= windowStart);
            if (held.Count == 0)
            {
                _leases.Remove(key);
            }
        }
    }

    /// <summary>
    /// One request counted for an address. A class, not a record: a record's generated
    /// <c>ToString</c> would print the address if it were ever logged (L2-033 AC2).
    /// </summary>
    public sealed class Lease(string partitionKey, DateTimeOffset at)
    {
        internal string PartitionKey { get; } = partitionKey;

        internal DateTimeOffset At { get; } = at;
    }
}
