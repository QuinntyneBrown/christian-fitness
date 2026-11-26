using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Events;
using Microsoft.Extensions.Configuration;

namespace ChristianFitness.Infrastructure.Images;

/// <summary>
/// Feedback screenshots as files named by their key in the private directory the setting
/// <c>Feedback:ScreenshotDirectory</c> names, else <c>feedback-screenshots</c> next to the
/// application (ADR 0109). Nothing serves this directory to the public. A string that is not a key
/// made by <see cref="ImageKeys"/> names nothing, so no client text reaches a path.
/// </summary>
internal sealed class FileSystemFeedbackScreenshotStore(IConfiguration configuration) : IFeedbackScreenshotStore
{
    private readonly string _directory = Path.GetFullPath(
        configuration["Feedback:ScreenshotDirectory"] is { Length: > 0 } configured ? configured : Path.Combine(AppContext.BaseDirectory, "feedback-screenshots"));

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
}
