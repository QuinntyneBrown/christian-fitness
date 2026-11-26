using ChristianFitness.Application.News;
using Microsoft.AspNetCore.OutputCaching;

namespace ChristianFitness.Api.Feeds;

/// <summary>
/// The feeds' output cache (L2-060 AC2; ADR 0072, ADR 0108): a rendered feed is kept for
/// <see cref="Duration"/>, keyed by its path alone (a query string never makes another copy) and
/// tagged with its lower-cased path, which <see cref="IStoryFeedCache"/> evicts. Only a 200 without
/// a cookie is kept. A kept feed still answers a matching <c>If-None-Match</c> or
/// <c>If-Modified-Since</c> with 304. The cache runs after the rate limiter, so a kept feed still
/// counts against <c>public-reads</c>.
/// </summary>
public static class FeedOutputCache
{
    public const string Policy = "feeds";

    /// <summary>How long the API keeps a feed, and how long a reader may (<c>max-age</c>).</summary>
    public static readonly TimeSpan Duration = TimeSpan.FromMinutes(15);

    public static IServiceCollection AddFeedOutputCache(this IServiceCollection services)
    {
        services.AddOutputCache(options => options.AddPolicy(Policy, new FeedPolicy()));
        services.AddSingleton<IStoryFeedCache, OutputStoryFeedCache>();
        return services;
    }

    private sealed class FeedPolicy : IOutputCachePolicy
    {
        public ValueTask CacheRequestAsync(OutputCacheContext context, CancellationToken cancellation)
        {
            var request = context.HttpContext.Request;
            var cacheable = HttpMethods.IsGet(request.Method) || HttpMethods.IsHead(request.Method);
            context.EnableOutputCaching = true;
            context.AllowCacheLookup = cacheable;
            context.AllowCacheStorage = cacheable;
            context.AllowLocking = true;
            context.ResponseExpirationTimeSpan = Duration;
            context.Tags.Add(request.Path.Value!.ToLowerInvariant());
            return ValueTask.CompletedTask;
        }

        public ValueTask ServeFromCacheAsync(OutputCacheContext context, CancellationToken cancellation) => ValueTask.CompletedTask;

        public ValueTask ServeResponseAsync(OutputCacheContext context, CancellationToken cancellation)
        {
            var response = context.HttpContext.Response;
            if (response.StatusCode != StatusCodes.Status200OK || response.Headers.SetCookie.Count > 0)
            {
                context.AllowCacheStorage = false;
            }

            return ValueTask.CompletedTask;
        }
    }

    private sealed class OutputStoryFeedCache(IOutputCacheStore store) : IStoryFeedCache
    {
        public async Task EvictAsync(IReadOnlyCollection<string> tags, CancellationToken cancellationToken)
        {
            foreach (var tag in tags)
            {
                await store.EvictByTagAsync(tag, cancellationToken).ConfigureAwait(false);
            }
        }
    }
}
