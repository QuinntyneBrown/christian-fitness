using ChristianFitness.Infrastructure;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddInfrastructure(builder.Configuration);

var app = builder.Build();

// Liveness runs no check; readiness (and /health) checks the database. Status only (L2-040 AC2).
app.MapHealthChecks("/health/live", new HealthCheckOptions { Predicate = _ => false });
app.MapHealthChecks("/health/ready", new HealthCheckOptions { Predicate = check => check.Tags.Contains(DependencyInjection.ReadyTag) });
app.MapHealthChecks("/health", new HealthCheckOptions { Predicate = check => check.Tags.Contains(DependencyInjection.ReadyTag) });

app.Run();
