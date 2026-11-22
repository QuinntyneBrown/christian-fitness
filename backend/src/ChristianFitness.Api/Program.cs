using ChristianFitness.Api.Errors;
using ChristianFitness.Api.Security;
using ChristianFitness.Infrastructure;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddSessionAuthentication();
builder.Services.AddProblemDetails(options =>
    options.CustomizeProblemDetails = context =>
        context.ProblemDetails.Extensions.TryAdd("code", ProblemCodes.ForStatus(context.ProblemDetails.Status ?? context.HttpContext.Response.StatusCode)));

var app = builder.Build();

app.UseStatusCodePages();
app.UseAuthentication();
app.UseAuthorization();

// Liveness runs no check; readiness (and /health) checks the database. Status only (L2-040 AC2).
app.MapHealthChecks("/health/live", new HealthCheckOptions { Predicate = _ => false }).AllowAnonymous();
app.MapHealthChecks("/health/ready", new HealthCheckOptions { Predicate = check => check.Tags.Contains(DependencyInjection.ReadyTag) }).AllowAnonymous();
app.MapHealthChecks("/health", new HealthCheckOptions { Predicate = check => check.Tags.Contains(DependencyInjection.ReadyTag) }).AllowAnonymous();

app.Run();
