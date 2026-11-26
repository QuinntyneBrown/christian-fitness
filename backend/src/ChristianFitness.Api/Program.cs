using ChristianFitness.Api.Chat;
using ChristianFitness.Api.Errors;
using ChristianFitness.Api.Feeds;
using ChristianFitness.Api.Scheduling;
using ChristianFitness.Api.Security;
using ChristianFitness.Api.Telemetry;
using ChristianFitness.Application;
using ChristianFitness.Application.Chat;
using ChristianFitness.Application.Notifications;
using ChristianFitness.Infrastructure;
using ChristianFitness.Infrastructure.Email;
using ChristianFitness.Infrastructure.Health;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;

var builder = WebApplication.CreateBuilder(args);

builder.AddTelemetry();
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddSessionAuthentication(builder.Configuration);
builder.Services.AddSessions();
builder.Services.AddEmail(builder.Configuration, builder.Environment.IsDevelopment());
builder.Services.AddRequestAntiforgery();
builder.Services.AddSecurityHeaders();
builder.Services.AddPublicReads();
// Each rendered RSS feed is kept 15 minutes and evicted by tag when its stories change (ADR 0108).
builder.Services.AddFeedOutputCache();
// Missing fields reach the validators, which name them (L2-032 AC1); a body that cannot be read at
// all is refused without repeating any of it.
builder.Services.AddControllers(options =>
    {
        options.SuppressImplicitRequiredAttributeForNonNullableReferenceTypes = true;
        options.AddAntiforgeryFilters();
        options.AddStaffAreaConvention();
    })
    .ConfigureApiBehaviorOptions(options => options.InvalidModelStateResponseFactory = _ => new BadRequestObjectResult(ProblemCodes.Unreadable())
    {
        ContentTypes = { "application/problem+json" },
    });
builder.Services.AddProblemDetails(options =>
    options.CustomizeProblemDetails = context =>
    {
        context.ProblemDetails.Extensions.TryAdd("code", ProblemCodes.For(context.HttpContext, context.ProblemDetails.Status ?? context.HttpContext.Response.StatusCode));
        if (ProblemCodes.ReasonFor(context.HttpContext) is { } reason)
        {
            context.ProblemDetails.Extensions.TryAdd("reason", reason);
        }

        ProblemReference.AddTo(context);
    });
builder.Services.AddExceptionHandler<ProblemDetailsExceptionHandler>();
builder.Services.AddSignalR();
builder.Services.AddSingleton<IChatChannel, HubChatChannel>();
builder.Services.AddSingleton<INotificationChannel, HubNotificationChannel>();
// The one scheduler: publishes scheduled stories when due, behind a database lease (ADR 0069, ADR 0104).
builder.Services.AddPublishingClock();

var app = builder.Build();

app.UseSecurityHeaders();
app.UseExceptionHandler();
app.UseStatusCodePages();
app.UseAuthentication();
app.UseRateLimiter();
// After the rate limiter, so a kept feed still counts against public-reads (ADR 0072).
app.UseOutputCache();
app.UseAuthorization();
app.UseAntiforgeryTokens();

app.MapControllers();
app.MapHub<ChatHub>(ChatHub.Path);
app.MapAntiforgeryToken();

// Liveness runs no check; readiness (and /health) checks the database. Status only (L2-040 AC2).
app.MapHealthChecks("/health/live", new HealthCheckOptions { Predicate = _ => false }).AllowAnonymous();
app.MapHealthChecks("/health/ready", new HealthCheckOptions { Predicate = check => check.Tags.Contains(HealthTags.Ready) }).AllowAnonymous();
app.MapHealthChecks("/health", new HealthCheckOptions { Predicate = check => check.Tags.Contains(HealthTags.Ready) }).AllowAnonymous();

app.Run();
