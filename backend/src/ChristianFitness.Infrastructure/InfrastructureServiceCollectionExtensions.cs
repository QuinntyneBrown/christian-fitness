using ChristianFitness.Application.Abstractions;
using ChristianFitness.Infrastructure.Health;
using ChristianFitness.Infrastructure.Persistence;
using ChristianFitness.Infrastructure.Security;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace ChristianFitness.Infrastructure;

public static class InfrastructureServiceCollectionExtensions
{
    /// <summary>
    /// The PostgreSQL database (ADR 0004), the password hasher, the clock and the readiness check.
    /// Never migrates (L2-041 AC1): <c>cf migrate</c> does.
    /// </summary>
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Default");
        services.AddDbContext<AppDbContext>(options => options.UseNpgsql(connectionString));
        services.AddScoped<IAppDbContext>(provider => provider.GetRequiredService<AppDbContext>());
        services.AddSingleton<IPasswordHasherService, IdentityPasswordHasher>();
        services.TryAddSingleton(TimeProvider.System);
        services.AddHealthChecks().AddCheck<DatabaseHealthCheck>("database", tags: [HealthTags.Ready]);
        return services;
    }

    /// <summary>
    /// Signing a member in and out with the session cookie, keeping each session on the server, and
    /// reading the signed-in member back. Only the API, which configures the cookie scheme, adds
    /// these (ADR 0007, ADR 0009).
    /// </summary>
    public static IServiceCollection AddSessions(this IServiceCollection services)
    {
        services.AddHttpContextAccessor();
        services.AddSingleton<ITicketStore, DatabaseTicketStore>();
        services.AddOptions<CookieAuthenticationOptions>(CookieAuthenticationDefaults.AuthenticationScheme)
            .Configure<ITicketStore>((options, store) => options.SessionStore = store);
        services.AddScoped<ISessionSignIn, CookieSessionSignIn>();
        services.AddScoped<ICurrentMember, HttpCurrentMember>();
        return services;
    }
}
