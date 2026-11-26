using ChristianFitness.Application.Members;
using ChristianFitness.Application.Account;
using ChristianFitness.Application.Audit;
using ChristianFitness.Application.Behaviors;
using ChristianFitness.Application.Notifications;
using ChristianFitness.Application.Sessions;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Application;

public static class ApplicationServiceCollectionExtensions
{
    /// <summary>
    /// MediatR handlers and FluentValidation validators of this assembly; every request is validated
    /// before its handler runs (<see cref="ValidationBehavior{TRequest, TResponse}"/>), and every
    /// staff change is audited when it succeeds (<see cref="AuditBehavior{TRequest, TResponse}"/>). The
    /// account creation limit is one per process, as its counts are (ADR 0012).
    /// </summary>
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddMediatR(configuration =>
        {
            configuration.RegisterServicesFromAssembly(typeof(ApplicationServiceCollectionExtensions).Assembly);
            configuration.AddOpenBehavior(typeof(ValidationBehavior<,>));
            configuration.AddOpenBehavior(typeof(AuditBehavior<,>));
        });
        services.AddSingleton(Domain.Legal.LegalDocuments.Published);
        services.AddScoped<AuditTrail>();
        // The audit behaviour logs each audited action; the host's logging, or none, receives it.
        services.AddLogging();
        services.AddScoped<MemberCredentials>();
        services.AddScoped<ModerationTarget>();
        services.AddScoped<INotifier, Notifier>();
        services.AddScoped<Chat.SystemMessages>();
        services.AddValidatorsFromAssembly(typeof(ApplicationServiceCollectionExtensions).Assembly, includeInternalTypes: true);
        services.AddSingleton<AccountCreationLimiter>();
        services.AddSingleton<PasswordResetRequestLimiter>();
        services.AddSingleton<Sessions.Google.GoogleSignInLimiter>();
        return services;
    }
}
