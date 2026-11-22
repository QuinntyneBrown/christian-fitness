using System.Collections;

namespace ChristianFitness.Api.Tests.Telemetry;

/// <summary>
/// What an in-memory exporter has exported, and a way to await an item without sleeping: a wait
/// that times out names what did arrive.
/// </summary>
public sealed class ExportedCollection<T> : ICollection<T>
{
    private readonly List<T> _items = [];
    private readonly List<(Func<T, bool> Match, TaskCompletionSource<T> Arrived)> _waiters = [];
    private readonly Lock _lock = new();

    public int Count
    {
        get
        {
            lock (_lock)
            {
                return _items.Count;
            }
        }
    }

    public bool IsReadOnly => false;

    public void Add(T item)
    {
        lock (_lock)
        {
            _items.Add(item);
            foreach (var waiter in _waiters.Where(waiter => waiter.Match(item)).ToList())
            {
                _waiters.Remove(waiter);
                waiter.Arrived.TrySetResult(item);
            }
        }
    }

    public IReadOnlyList<T> Snapshot()
    {
        lock (_lock)
        {
            return [.. _items];
        }
    }

    public async Task<T> WaitForAsync(Func<T, bool> match, Func<T, string> describe, string expected)
    {
        TaskCompletionSource<T> arrived = new(TaskCreationOptions.RunContinuationsAsynchronously);
        lock (_lock)
        {
            var existing = _items.FirstOrDefault(match);
            if (existing is not null)
            {
                return existing;
            }

            _waiters.Add((match, arrived));
        }

        try
        {
            return await arrived.Task.WaitAsync(TimeSpan.FromSeconds(5), TestContext.Current.CancellationToken);
        }
        catch (TimeoutException)
        {
            var seen = string.Join(", ", Snapshot().Select(describe));
            throw new TimeoutException($"Expected {expected}; exported only: [{seen}]");
        }
    }

    public void Clear()
    {
        lock (_lock)
        {
            _items.Clear();
        }
    }

    public bool Contains(T item) => Snapshot().Contains(item);

    public void CopyTo(T[] array, int arrayIndex) => Snapshot().ToList().CopyTo(array, arrayIndex);

    public bool Remove(T item)
    {
        lock (_lock)
        {
            return _items.Remove(item);
        }
    }

    public IEnumerator<T> GetEnumerator() => Snapshot().GetEnumerator();

    IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();
}
