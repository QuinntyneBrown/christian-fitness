namespace ChristianFitness.Application.Abstractions;

/// <summary>
/// Where feedback screenshots are kept, by key, apart from the public images (L2-063 AC4, AC10;
/// ADR 0109). A key is <see cref="Events.ImageKeys"/>' kind: a new GUID and the extension its
/// content's signature gave, so no client text reaches a path. Only staff read them back
/// (journey 31).
/// </summary>
public interface IFeedbackScreenshotStore
{
    Task SaveAsync(string key, ReadOnlyMemory<byte> content, CancellationToken cancellationToken);

    /// <summary>The screenshot, or none when the key names nothing. The caller disposes the stream.</summary>
    Task<StoredImage?> OpenAsync(string key, CancellationToken cancellationToken);
}
