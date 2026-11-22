using ChristianFitness.Application.Behaviors;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Application;

public static class ApplicationServiceCollectionExtensions
{
    /// <summary>
    /// MediatR handlers and FluentValidation validators of this assembly; every request is validated
    /// before its handler runs (<see cref="ValidationBehavior{TRequest, TResponse}"/>).
    /// </summary>
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddMediatR(configuration =>
        {
            configuration.RegisterServicesFromAssembly(typeof(ApplicationServiceCollectionExtensions).Assembly);
            configuration.AddOpenBehavior(typeof(ValidationBehavior<,>));
        });
        services.AddValidatorsFromAssembly(typeof(ApplicationServiceCollectionExtensions).Assembly, includeInternalTypes: true);
        return services;
    }
}
