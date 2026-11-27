using ChristianFitness.Application.Abstractions;
using Microsoft.Extensions.Configuration;

namespace ChristianFitness.Infrastructure.Images;

/// <summary>
/// Members' data archives as files named by their key in the private directory the setting
/// <c>Exports:Directory</c> names, else <c>exports</c> next to the application (ADR 0117). Nothing
/// serves this directory: the API streams an archive only to its own member's session. A string
/// that is not a key made by <see cref="ArchiveKeys"/> names nothing, so no client text reaches a path.
/// </summary>
internal sealed class FileSystemArchiveStore(IConfiguration configuration) : IArchiveStore
{
    private readonly string _directory = Path.GetFullPath(
        configuration["Exports:Directory"] is { Length: > 0 } configured ? configured : Path.Combine(AppContext.BaseDirectory, "exports"));

    public async Task SaveAsync(string key, ReadOnlyMemory<byte> content, CancellationToken cancellationToken)
    {
        if (!ArchiveKeys.IsKey(key))
        {
            throw new ArgumentException("Not an archive key.", nameof(key));
        }

        Directory.CreateDirectory(_directory);
        await File.WriteAllBytesAsync(Path.Combine(_directory, key), content.ToArray(), cancellationToken).ConfigureAwait(false);
    }

    public Task<Stream?> OpenAsync(string key, CancellationToken cancellationToken)
    {
        var path = ArchiveKeys.IsKey(key) ? Path.Combine(_directory, key) : null;
        return Task.FromResult<Stream?>(path is not null && File.Exists(path)
            ? new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read, 4096, useAsync: true)
            : null);
    }

    public Task DeleteAsync(string key, CancellationToken cancellationToken)
    {
        if (ArchiveKeys.IsKey(key))
        {
            File.Delete(Path.Combine(_directory, key));
        }

        return Task.CompletedTask;
    }
}
