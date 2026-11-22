using OpenTelemetry;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;

namespace ChristianFitness.Api.Telemetry;

internal static class TelemetrySetup
{
    public const string DefaultServiceName = "christian-fitness-api";

    /// <summary>
    /// OpenTelemetry traces, metrics and logs (L2-040 AC1). Exported by OTLP only when
    /// <c>OTEL_EXPORTER_OTLP_ENDPOINT</c> is set (docs/operations/settings.md).
    /// </summary>
    public static WebApplicationBuilder AddTelemetry(this WebApplicationBuilder builder)
    {
        var configuration = builder.Configuration;
        var exportOtlp = !string.IsNullOrWhiteSpace(configuration["OTEL_EXPORTER_OTLP_ENDPOINT"]);
        var serviceName = configuration["OTEL_SERVICE_NAME"] is { Length: > 0 } name ? name : DefaultServiceName;

        // ASP.NET Core's request logs print the full URL, query string included.
        builder.Logging.AddFilter("Microsoft.AspNetCore", LogLevel.Warning);

        var telemetry = builder.Services.AddOpenTelemetry()
            .ConfigureResource(resource => resource.AddService(serviceName))
            .WithTracing(tracing => tracing
                .AddAspNetCoreInstrumentation()
                .AddProcessor<TelemetryRedactionProcessor>())
            .WithMetrics(metrics => metrics
                .AddAspNetCoreInstrumentation()
                .AddView("http.server.request.duration", new MetricStreamConfiguration { TagKeys = [.. TelemetryRedactionProcessor.AllowedTags] }))
            .WithLogging();

        if (exportOtlp)
        {
            telemetry.UseOtlpExporter();
        }

        return builder;
    }
}
