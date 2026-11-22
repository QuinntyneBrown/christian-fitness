using System.Collections.Frozen;
using System.Diagnostics;
using OpenTelemetry;

namespace ChristianFitness.Api.Telemetry;

/// <summary>
/// Keeps only the allowed tags on every span before it is exported, so a route is recorded as its
/// template and no span carries a URL, query string, body, contact detail or token (L2-033 AC2,
/// L2-040 AC1). It allows rather than denies, so a new instrumentation's tags are dropped until
/// someone decides they are safe.
/// </summary>
internal sealed class TelemetryRedactionProcessor : BaseProcessor<Activity>
{
    public static readonly FrozenSet<string> AllowedTags = FrozenSet.ToFrozenSet(
        ["http.route", "http.request.method", "http.response.status_code", "error.type"],
        StringComparer.Ordinal);

    public override void OnEnd(Activity data)
    {
        foreach (var key in data.TagObjects.Select(tag => tag.Key).Where(key => !AllowedTags.Contains(key)).ToList())
        {
            data.SetTag(key, null);
        }

        if (data.Status == ActivityStatusCode.Error)
        {
            data.SetStatus(ActivityStatusCode.Error);
        }

        if (data.Kind == ActivityKind.Server)
        {
            var method = data.GetTagItem("http.request.method") as string;
            var route = data.GetTagItem("http.route") as string;
            data.DisplayName = string.IsNullOrEmpty(route) ? method ?? "HTTP" : $"{method} {route}";
        }
    }
}
