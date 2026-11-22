using FluentValidation;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Application;

public static class ApplicationServiceCollectionExtensions
{
    /// <summary>MediatR handlers and FluentValidation validators of this assembly.</summary>
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddMediatR(configuration => configuration.RegisterServicesFromAssembly(typeof(ApplicationServiceCollectionExtensions).Assembly));
        services.AddValidatorsFromAssembly(typeof(ApplicationServiceCollectionExtensions).Assembly, includeInternalTypes: true);
        return services;
    }
}
