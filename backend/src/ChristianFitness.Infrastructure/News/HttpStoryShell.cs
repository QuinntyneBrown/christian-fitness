using ChristianFitness.Application.News;
using Microsoft.Extensions.Configuration;

namespace ChristianFitness.Infrastructure.News;

/// <summary>
/// The member app's shell read over loopback from the static host of the same replica
/// (<c>StoryShell:Url</c>; ADR 0105) the first time it is wanted, then kept for the life of the
/// process, so it is always the shell of the build this replica serves. With no address, or while
/// the address cannot be read, there is none, and the next request tries again.
/// </summary>
public sealed class HttpStoryShell(IHttpClientFactory clients, IConfiguration configuration) : IStoryShell
{
    /// <summary>The named client the shell is read with.</summary>
    public const string ClientName = "story-shell";

    private string? _shell;

    public async Task<string?> GetAsync(CancellationToken cancellationToken)
    {
        if (_shell is { } kept)
        {
            return kept;
        }

        var url = configuration["StoryShell:Url"];
        if (string.IsNullOrWhiteSpace(url))
        {
            return null;
        }

        try
        {
            using var client = clients.CreateClient(ClientName);
            using var response = await client.GetAsync(new Uri(url, UriKind.Absolute), cancellationToken).ConfigureAwait(false);
            if (!response.IsSuccessStatusCode)
            {
                return null;
            }

            _shell = await response.Content.ReadAsStringAsync(cancellationToken).ConfigureAwait(false);
            return _shell;
        }
        catch (Exception e) when (e is HttpRequestException || (e is TaskCanceledException && !cancellationToken.IsCancellationRequested))
        {
            return null;
        }
    }
}
