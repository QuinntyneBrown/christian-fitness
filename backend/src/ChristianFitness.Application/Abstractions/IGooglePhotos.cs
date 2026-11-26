namespace ChristianFitness.Application.Abstractions;

/// <summary>
/// Fetches a Google account's photo on the server, so the browser never loads it from Google
/// (L2-049 AC9, AC14). Only Google's own photo addresses are fetched; anything else, a failure or
/// a photo over 5 MB answers none.
/// </summary>
public interface IGooglePhotos
{
    Task<ReadOnlyMemory<byte>?> FetchAsync(string url, CancellationToken cancellationToken);
}
