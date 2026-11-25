using System.Globalization;
using System.Threading.RateLimiting;
using ChristianFitness.Api.Errors;
using ChristianFitness.Application.Abstractions;
using Microsoft.AspNetCore.RateLimiting;

namespace ChristianFitness.Api.Security;

/// <summary>
/// The <c>public-reads</c> rate-limiter policy (L2-034 AC4, AC5; ADR 0072, ADR 0082): a request
/// without a session counts against its client address (<see cref="ClientAddressPartition.Of"/>), at
/// most 120 a minute in a sliding window of six 10-second segments; the next is refused with 429
/// ProblemDetails, code <c>too_many_requests</c>, and <c>Retry-After</c> in seconds. A signed-in
/// caller is not counted. The counts live in memory per process and hold no address beyond the window.
/// </summary>
public static class PublicReads
{
    public const string Policy = "public-reads";
    public const string TooManyRequests = "too_many_requests";
    public const int PermitLimit = 120;
    public static readonly TimeSpan Window = TimeSpan.FromMinutes(1);
    public const int SegmentsPerWindow = 6;

    public static IServiceCollection AddPublicReads(this IServiceCollection services) =>
        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.AddPolicy(Policy, context =>
                context.User.Identity?.IsAuthenticated == true
                    ? RateLimitPartition.GetNoLimiter(string.Empty)
                    : RateLimitPartition.GetSlidingWindowLimiter(
                        ClientAddressPartition.Of(context.Connection.RemoteIpAddress),
                        _ => new SlidingWindowRateLimiterOptions
                        {
                            PermitLimit = PermitLimit,
                            Window = Window,
                            SegmentsPerWindow = SegmentsPerWindow,
                            QueueLimit = 0,
                        }));
            // The status-code page writes the ProblemDetails, with this code instead of the status's own.
            options.OnRejected = (rejected, _) =>
            {
                var retryAfter = rejected.Lease.TryGetMetadata(MetadataName.RetryAfter, out var wait)
                    ? wait
                    : Window / SegmentsPerWindow;
                rejected.HttpContext.Response.Headers.RetryAfter =
                    Math.Max(1, (int)Math.Ceiling(retryAfter.TotalSeconds)).ToString(CultureInfo.InvariantCulture);
                ProblemCodes.Override(rejected.HttpContext, TooManyRequests);
                return ValueTask.CompletedTask;
            };
        });
}
