using ChristianFitness.Api.Errors;
using ChristianFitness.Api.Security;
using ChristianFitness.Api.Telemetry;
using ChristianFitness.Application;
using ChristianFitness.Infrastructure;
using ChristianFitness.Infrastructure.Health;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;

var builder = WebApplication.CreateBuilder(args);

builder.AddTelemetry();
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddSessionAuthentication(builder.Configuration);
builder.Services.AddSessions();
builder.Services.AddRequestAntiforgery();
// Missing fields reach the validators, which name them (L2-032 AC1); a body that cannot be read at
// all is refused without repeating any of it.
builder.Services.AddControllers(options =>
    {
        options.SuppressImplicitRequiredAttributeForNonNullableReferenceTypes = true;
        options.AddAntiforgeryFilters();
    })
    .ConfigureApiBehaviorOptions(options => options.InvalidModelStateResponseFactory = _ => new BadRequestObjectResult(ProblemCodes.Unreadable())
    {
        ContentTypes = { "application/problem+json" },
    });
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
app.UseAntiforgeryTokens();

app.MapControllers();
app.MapAntiforgeryToken();

// Liveness runs no check; readiness (and /health) checks the database. Status only (L2-040 AC2).
app.MapHealthChecks("/health/live", new HealthCheckOptions { Predicate = _ => false }).AllowAnonymous();
app.MapHealthChecks("/health/ready", new HealthCheckOptions { Predicate = check => check.Tags.Contains(HealthTags.Ready) }).AllowAnonymous();
app.MapHealthChecks("/health", new HealthCheckOptions { Predicate = check => check.Tags.Contains(HealthTags.Ready) }).AllowAnonymous();

app.Run();
