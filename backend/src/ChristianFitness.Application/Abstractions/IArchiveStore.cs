namespace ChristianFitness.Application.Abstractions;

/// <summary>
/// Where members' data archives are kept, by key, while their link works (L2-066 AC1, AC2; ADR
/// 0117). Private: only the member's own session is served one, through the API. A key is a new
/// GUID and <c>.zip</c>, so no client text reaches a path.
/// </summary>
public interface IArchiveStore
{
    Task SaveAsync(string key, ReadOnlyMemory<byte> content, CancellationToken cancellationToken);

    /// <summary>The archive, or none when the key names nothing. The caller disposes the stream.</summary>
    Task<Stream?> OpenAsync(string key, CancellationToken cancellationToken);

    /// <summary>Removes the archive; a key that names nothing is already removed.</summary>
    Task DeleteAsync(string key, CancellationToken cancellationToken);
}

/// <summary>The keys archives are kept under: a new GUID and <c>.zip</c>.</summary>
public static class ArchiveKeys
{
    public static string New() => $"{Guid.NewGuid():N}.zip";

    public static bool IsKey(string? key) =>
        key is { Length: 36 } && key.EndsWith(".zip", StringComparison.Ordinal) && Guid.TryParseExact(key[..32], "N", out _);
}
