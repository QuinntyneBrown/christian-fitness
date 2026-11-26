using System.Collections.Concurrent;
using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Events;

namespace ChristianFitness.Api.Tests;

/// <summary>
/// Event images, or feedback screenshots (ADR 0109), in memory, so no test writes a file (ADR 0025). Like the real store, a string that
/// is not a key made by <see cref="ImageKeys"/> names nothing.
/// </summary>
public sealed class InMemoryImageStore : IImageStore, IFeedbackScreenshotStore
{
    private readonly ConcurrentDictionary<string, byte[]> _images = new(StringComparer.Ordinal);

    public int Count => _images.Count;

    /// <summary>The bytes kept under <paramref name="key"/>, or none.</summary>
    public byte[]? Of(string key) => _images.TryGetValue(key, out var bytes) ? bytes : null;

    public Task<bool> ExistsAsync(string key, CancellationToken cancellationToken) =>
        Task.FromResult(ImageKeys.IsKey(key) && _images.ContainsKey(key));

    public Task SaveAsync(string key, ReadOnlyMemory<byte> content, CancellationToken cancellationToken)
    {
        _images[key] = content.ToArray();
        return Task.CompletedTask;
    }

    public Task<StoredImage?> OpenAsync(string key, CancellationToken cancellationToken) =>
        Task.FromResult(ImageKeys.IsKey(key) && _images.TryGetValue(key, out var bytes)
            ? new StoredImage(new MemoryStream(bytes), ImageKeys.ContentTypeOf(key))
            : null);
}
