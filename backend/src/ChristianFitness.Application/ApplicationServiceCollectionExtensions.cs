using ChristianFitness.Application.Account;
using ChristianFitness.Application.Behaviors;
using ChristianFitness.Application.Sessions;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Application;

public static class ApplicationServiceCollectionExtensions
{
    /// <summary>
    /// MediatR handlers and FluentValidation validators of this assembly; every request is validated
    /// before its handler runs (<see cref="ValidationBehavior{TRequest, TResponse}"/>). The
    /// account creation limit is one per process, as its counts are (ADR 0010).
    /// </summary>
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddMediatR(configuration =>
        {
            configuration.RegisterServicesFromAssembly(typeof(ApplicationServiceCollectionExtensions).Assembly);
            configuration.AddOpenBehavior(typeof(ValidationBehavior<,>));
        });
        services.AddScoped<MemberCredentials>();
        services.AddValidatorsFromAssembly(typeof(ApplicationServiceCollectionExtensions).Assembly, includeInternalTypes: true);
        services.AddSingleton<AccountCreationLimiter>();
        return services;
    }
}
