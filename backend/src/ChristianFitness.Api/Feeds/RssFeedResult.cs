using System.Globalization;
using System.Text;
using System.Xml;
using ChristianFitness.Application.News;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Net.Http.Headers;

namespace ChristianFitness.Api.Feeds;

/// <summary>
/// Writes a <see cref="StoryFeed"/> as RSS 2.0 (L2-060 AC1; ADR 0108) with <see cref="XmlWriter"/>,
/// which escapes every value, so a headline or a summary is text, never markup. An item's author is
/// <c>dc:creator</c>, the byline's name: RSS's own <c>author</c> needs an email address. Its
/// <c>guid</c> is <c>urn:uuid:&lt;story id&gt;</c>, which stays the same when the story's link changes.
/// Every answer carries the feed's <c>ETag</c>, <c>Last-Modified</c> and <c>Cache-Control: public,
/// max-age=900</c>; when the request's validators still match it is 304 with no body (L2-060 AC2).
/// </summary>
public sealed class RssFeedResult(StoryFeed feed) : IActionResult
{
    public const string ContentType = "application/rss+xml; charset=utf-8";

    private const string Dc = "http://purl.org/dc/elements/1.1/";
    private const string Atom = "http://www.w3.org/2005/Atom";

    public async Task ExecuteResultAsync(ActionContext context)
    {
        ArgumentNullException.ThrowIfNull(context);
        var response = context.HttpContext.Response;
        var headers = response.GetTypedHeaders();
        headers.CacheControl = new CacheControlHeaderValue { Public = true, MaxAge = FeedOutputCache.Duration };
        headers.ETag = EntityTagHeaderValue.Parse(feed.ETag);
        headers.LastModified = feed.LastModified;
        if (feed.NotModified)
        {
            response.StatusCode = StatusCodes.Status304NotModified;
            return;
        }

        response.ContentType = ContentType;
        var settings = new XmlWriterSettings { Async = true, Encoding = new UTF8Encoding(false), Indent = false };
        await using var writer = XmlWriter.Create(response.Body, settings);
        await writer.WriteStartDocumentAsync().ConfigureAwait(false);
        await writer.WriteStartElementAsync(null, "rss", null).ConfigureAwait(false);
        await writer.WriteAttributeStringAsync(null, "version", null, "2.0").ConfigureAwait(false);
        await writer.WriteAttributeStringAsync("xmlns", "dc", null, Dc).ConfigureAwait(false);
        await writer.WriteAttributeStringAsync("xmlns", "atom", null, Atom).ConfigureAwait(false);
        await writer.WriteStartElementAsync(null, "channel", null).ConfigureAwait(false);
        await writer.WriteElementStringAsync(null, "title", null, feed.Title).ConfigureAwait(false);
        await writer.WriteElementStringAsync(null, "link", null, feed.Site.AbsoluteUri).ConfigureAwait(false);
        await writer.WriteElementStringAsync(null, "description", null, "Stories from Christian Fitness, a Christian community for health in body and spirit in the Greater Toronto Area.").ConfigureAwait(false);
        await writer.WriteElementStringAsync(null, "language", null, "en-ca").ConfigureAwait(false);
        await writer.WriteStartElementAsync("atom", "link", Atom).ConfigureAwait(false);
        await writer.WriteAttributeStringAsync(null, "href", null, feed.Self.AbsoluteUri).ConfigureAwait(false);
        await writer.WriteAttributeStringAsync(null, "rel", null, "self").ConfigureAwait(false);
        await writer.WriteAttributeStringAsync(null, "type", null, "application/rss+xml").ConfigureAwait(false);
        await writer.WriteEndElementAsync().ConfigureAwait(false);
        foreach (var item in feed.Items)
        {
            await writer.WriteStartElementAsync(null, "item", null).ConfigureAwait(false);
            await writer.WriteElementStringAsync(null, "title", null, item.Title).ConfigureAwait(false);
            await writer.WriteElementStringAsync(null, "link", null, item.Link.AbsoluteUri).ConfigureAwait(false);
            await writer.WriteElementStringAsync(null, "description", null, item.Summary).ConfigureAwait(false);
            if (item.Section is { } section)
            {
                await writer.WriteElementStringAsync(null, "category", null, section).ConfigureAwait(false);
            }

            if (item.Author is { } author)
            {
                await writer.WriteElementStringAsync("dc", "creator", Dc, author).ConfigureAwait(false);
            }

            await writer.WriteElementStringAsync(null, "pubDate", null, item.PublishedAt.ToUniversalTime().ToString("r", CultureInfo.InvariantCulture)).ConfigureAwait(false);
            await writer.WriteStartElementAsync(null, "guid", null).ConfigureAwait(false);
            await writer.WriteAttributeStringAsync(null, "isPermaLink", null, "false").ConfigureAwait(false);
            await writer.WriteStringAsync($"urn:uuid:{item.Id}").ConfigureAwait(false);
            await writer.WriteEndElementAsync().ConfigureAwait(false);
            await writer.WriteEndElementAsync().ConfigureAwait(false);
        }

        await writer.WriteEndElementAsync().ConfigureAwait(false);
        await writer.WriteEndElementAsync().ConfigureAwait(false);
        await writer.WriteEndDocumentAsync().ConfigureAwait(false);
    }
}
