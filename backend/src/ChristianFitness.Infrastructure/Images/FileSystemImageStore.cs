using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Events;
using Microsoft.Extensions.Configuration;

namespace ChristianFitness.Infrastructure.Images;

/// <summary>
/// Event images as files named by their key in the directory the setting <c>Images:Directory</c>
/// names, else <c>images</c> next to the application (ADR 0025). A string that is not a key made by
/// <see cref="ImageKeys"/> names nothing, so no client text reaches a path.
/// </summary>
internal sealed class FileSystemImageStore(IConfiguration configuration) : IImageStore
{
    private readonly string _directory = Path.GetFullPath(
        configuration["Images:Directory"] is { Length: > 0 } configured ? configured : Path.Combine(AppContext.BaseDirectory, "images"));

    public Task<bool> ExistsAsync(string key, CancellationToken cancellationToken) =>
        Task.FromResult(ImageKeys.IsKey(key) && File.Exists(Path.Combine(_directory, key)));

    public async Task SaveAsync(string key, ReadOnlyMemory<byte> content, CancellationToken cancellationToken)
    {
        if (!ImageKeys.IsKey(key))
        {
            throw new ArgumentException("Not an image key.", nameof(key));
        }

        Directory.CreateDirectory(_directory);
        await File.WriteAllBytesAsync(Path.Combine(_directory, key), content.ToArray(), cancellationToken).ConfigureAwait(false);
    }

    public Task<StoredImage?> OpenAsync(string key, CancellationToken cancellationToken)
    {
        var path = ImageKeys.IsKey(key) ? Path.Combine(_directory, key) : null;
        return Task.FromResult(path is not null && File.Exists(path)
            ? new StoredImage(new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read, 4096, useAsync: true), ImageKeys.ContentTypeOf(key))
            : null);
    }

    public Task DeleteAsync(string key, CancellationToken cancellationToken)
    {
        if (ImageKeys.IsKey(key))
        {
            File.Delete(Path.Combine(_directory, key));
        }

        return Task.CompletedTask;
    }
}
