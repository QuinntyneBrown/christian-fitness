using ChristianFitness.Application.Abstractions;
using ChristianFitness.Infrastructure.Health;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Infrastructure;

public static class DependencyInjection
{
    /// <summary>The database and the readiness check. Never migrates (L2-041 AC1): <c>cf migrate</c> does.</summary>
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Default");
        services.AddDbContext<AppDbContext>(options => options.UseNpgsql(connectionString));
        services.AddScoped<IAppDbContext>(provider => provider.GetRequiredService<AppDbContext>());
        services.AddHealthChecks().AddCheck<DatabaseHealthCheck>("database", tags: [DatabaseHealthCheck.ReadyTag]);
        return services;
    }

    /// <summary>The tag of the checks that make the API ready.</summary>
    public const string ReadyTag = DatabaseHealthCheck.ReadyTag;
}
