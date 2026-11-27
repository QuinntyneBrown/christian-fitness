using ChristianFitness.Application.Abstractions;

namespace ChristianFitness.Application.Tests.Events;

/// <summary>An image store that holds exactly the keys the test names (ADR 0025).</summary>
internal sealed class FakeImageStore(params string[] keys) : IImageStore
{
    public Task<bool> ExistsAsync(string key, CancellationToken cancellationToken) => Task.FromResult(keys.Contains(key, StringComparer.Ordinal));

    public Task SaveAsync(string key, ReadOnlyMemory<byte> content, CancellationToken cancellationToken) => Task.CompletedTask;

    public Task<StoredImage?> OpenAsync(string key, CancellationToken cancellationToken) => Task.FromResult<StoredImage?>(null);

    public Task DeleteAsync(string key, CancellationToken cancellationToken) => Task.CompletedTask;
}
