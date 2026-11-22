using ChristianFitness.Api.Errors;
using ChristianFitness.Api.Security;
using ChristianFitness.Api.Telemetry;
using ChristianFitness.Application;
using ChristianFitness.Infrastructure;
using ChristianFitness.Infrastructure.Health;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;

var builder = WebApplication.CreateBuilder(args);

builder.AddTelemetry();
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddSessionAuthentication(builder.Configuration);
builder.Services.AddSessions();
builder.Services.AddControllers();
builder.Services.AddProblemDetails(options =>
    options.CustomizeProblemDetails = context =>
    {
        context.ProblemDetails.Extensions.TryAdd("code", ProblemCodes.ForStatus(context.ProblemDetails.Status ?? context.HttpContext.Response.StatusCode));
        ProblemReference.AddTo(context);
    });
builder.Services.AddExceptionHandler<ProblemDetailsExceptionHandler>();

var app = builder.Build();

app.UseExceptionHandler();
app.UseStatusCodePages();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Liveness runs no check; readiness (and /health) checks the database. Status only (L2-040 AC2).
app.MapHealthChecks("/health/live", new HealthCheckOptions { Predicate = _ => false }).AllowAnonymous();
app.MapHealthChecks("/health/ready", new HealthCheckOptions { Predicate = check => check.Tags.Contains(HealthTags.Ready) }).AllowAnonymous();
app.MapHealthChecks("/health", new HealthCheckOptions { Predicate = check => check.Tags.Contains(HealthTags.Ready) }).AllowAnonymous();

app.Run();
