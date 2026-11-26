using System.Xml.Linq;

namespace ChristianFitness.Api.Tests.Stories;

/// <summary>
/// What the feed tests need (L2-060; ADR 0072, ADR 0108): a feed asked for as a reader asks, with no
/// session and no cookie, and its RSS read back as items.
/// </summary>
internal static class StoryFeeds
{
    public static readonly XNamespace Dc = "http://purl.org/dc/elements/1.1/";
    public static readonly XNamespace Atom = "http://www.w3.org/2005/Atom";

    /// <summary>Asks for the feed at <paramref name="path"/>, with any extra request headers.</summary>
    public static async Task<HttpResponseMessage> GetAsync(StoriesFactory factory, string path, Action<HttpRequestMessage>? headers = null, string? clientAddress = null)
    {
        using var client = Browser.CreateClientWithoutToken(factory);
        using var request = new HttpRequestMessage(HttpMethod.Get, new Uri(path, UriKind.Relative));
        if (clientAddress is not null)
        {
            request.Headers.Add(ApiFactory.ClientAddressHeader, clientAddress);
        }

        headers?.Invoke(request);
        return await client.SendAsync(request, TestContext.Current.CancellationToken).ConfigureAwait(false);
    }

    /// <summary>The RSS document of a feed answer.</summary>
    public static async Task<XDocument> DocumentAsync(HttpResponseMessage response) =>
        XDocument.Parse(await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken).ConfigureAwait(false));

    /// <summary>The titles of the feed's items, in order.</summary>
    public static async Task<string[]> TitlesAsync(HttpResponseMessage response) =>
        [.. (await DocumentAsync(response).ConfigureAwait(false)).Root!.Element("channel")!.Elements("item").Select(i => i.Element("title")!.Value)];
}
