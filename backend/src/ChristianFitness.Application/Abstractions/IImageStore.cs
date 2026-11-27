namespace ChristianFitness.Application.Abstractions;

/// <summary>An image read back from the store with the content type its key's extension names.</summary>
public sealed record StoredImage(Stream Content, string ContentType);

/// <summary>
/// Where event images are kept, by key (L2-022 AC4; ADR 0025). A key is a new GUID without dashes
/// plus the extension its content's signature gave, so no client text ever reaches a path: a string
/// that is not such a key does not exist.
/// </summary>
public interface IImageStore
{
    Task<bool> ExistsAsync(string key, CancellationToken cancellationToken);

    Task SaveAsync(string key, ReadOnlyMemory<byte> content, CancellationToken cancellationToken);

    /// <summary>The image, or none when the key names nothing. The caller disposes the stream.</summary>
    Task<StoredImage?> OpenAsync(string key, CancellationToken cancellationToken);

    /// <summary>Removes the image, such as an erased member's photo (ADR 0078, ADR 0118); a key that names nothing is a no-op.</summary>
    Task DeleteAsync(string key, CancellationToken cancellationToken);
}
