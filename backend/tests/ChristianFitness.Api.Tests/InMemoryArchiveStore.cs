using System.Collections.Concurrent;
using ChristianFitness.Application.Abstractions;

namespace ChristianFitness.Api.Tests;

/// <summary>Members' data archives in memory, so no test writes a file (ADR 0117).</summary>
public sealed class InMemoryArchiveStore : IArchiveStore
{
    private readonly ConcurrentDictionary<string, byte[]> _archives = new(StringComparer.Ordinal);

    /// <summary>The bytes kept under <paramref name="key"/>, or none.</summary>
    public byte[]? Of(string key) => _archives.TryGetValue(key, out var bytes) ? bytes : null;

    public Task SaveAsync(string key, ReadOnlyMemory<byte> content, CancellationToken cancellationToken)
    {
        _archives[key] = content.ToArray();
        return Task.CompletedTask;
    }

    public Task<Stream?> OpenAsync(string key, CancellationToken cancellationToken) =>
        Task.FromResult<Stream?>(_archives.TryGetValue(key, out var bytes) ? new MemoryStream(bytes, writable: false) : null);

    public Task DeleteAsync(string key, CancellationToken cancellationToken)
    {
        _archives.TryRemove(key, out _);
        return Task.CompletedTask;
    }
}
