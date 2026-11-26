using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Events;

namespace ChristianFitness.Infrastructure.Security.Google;

/// <summary>
/// Fetches a Google account's photo on the server (L2-049 AC14), through the named client
/// <see cref="GoogleAuthentication.PhotoClient"/>. Only <c>https</c> addresses on Google's photo
/// host (<c>*.googleusercontent.com</c>) are fetched, so a token can never make the server call
/// anywhere else; a failure, a timeout or more than 5 MB answers none, and joining goes on without it.
/// </summary>
internal sealed class HttpGooglePhotos(IHttpClientFactory clients) : IGooglePhotos
{
    private const string PhotoHost = ".googleusercontent.com";

    private static readonly TimeSpan Timeout = TimeSpan.FromSeconds(5);

    public async Task<ReadOnlyMemory<byte>?> FetchAsync(string url, CancellationToken cancellationToken)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out var address)
            || address.Scheme != Uri.UriSchemeHttps
            || !address.IsDefaultPort
            || !address.Host.EndsWith(PhotoHost, StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(Timeout);
        try
        {
            using var client = clients.CreateClient(GoogleAuthentication.PhotoClient);
            using var response = await client.GetAsync(address, HttpCompletionOption.ResponseHeadersRead, timeout.Token).ConfigureAwait(false);
            if (!response.IsSuccessStatusCode || response.Content.Headers.ContentLength > ImageKeys.MaxBytes)
            {
                return null;
            }

            await using var body = await response.Content.ReadAsStreamAsync(timeout.Token).ConfigureAwait(false);
            using var copy = new MemoryStream();
            var buffer = new byte[81920];
            int read;
            while ((read = await body.ReadAsync(buffer, timeout.Token).ConfigureAwait(false)) > 0)
            {
                if (copy.Length + read > ImageKeys.MaxBytes)
                {
                    return null;
                }

                copy.Write(buffer, 0, read);
            }

            return copy.ToArray();
        }
        catch (HttpRequestException)
        {
            return null;
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            return null;
        }
    }
}
