using System.Diagnostics;
using System.Globalization;

namespace ChristianFitness.Api.Errors;

/// <summary>
/// The <c>reference</c> extension of every 5xx ProblemDetails (L2-043 AC3): <c>CF-</c> and the
/// first eight hexadecimal digits of the request's W3C trace id in upper case. A member quotes it;
/// an operator finds the trace from it. It is not personal data and nothing new is logged.
/// </summary>
public static class ProblemReference
{
    public const string Extension = "reference";

    public static string For(ActivityTraceId traceId) =>
        string.Create(CultureInfo.InvariantCulture, $"CF-{traceId.ToHexString()[..8].ToUpperInvariant()}");

    /// <summary>Adds the reference to a server error's ProblemDetails while a request activity runs.</summary>
    public static void AddTo(ProblemDetailsContext context)
    {
        var status = context.ProblemDetails.Status ?? context.HttpContext.Response.StatusCode;
        if (status >= StatusCodes.Status500InternalServerError && Activity.Current is { } activity)
        {
            context.ProblemDetails.Extensions.TryAdd(Extension, For(activity.TraceId));
        }
    }
}
