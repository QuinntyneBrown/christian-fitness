using ChristianFitness.Application.Email;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Infrastructure.Email;

public static class EmailServiceCollectionExtensions
{
    /// <summary>The member app's address in development, when <c>MemberApp:BaseUrl</c> is not set.</summary>
    public const string DevelopmentMemberAppBaseUrl = "http://localhost:4200";

    /// <summary>The postal address in development, when <c>Organisation:PostalAddress</c> is not set.</summary>
    public const string DevelopmentPostalAddress = "Postal address not set (development)";

    /// <summary>
    /// Email and the member app's address (ADR 0010; docs/operations/settings.md). With
    /// <c>Email:Smtp:Host</c> set, mail is queued and delivered by SMTP after the answer; without it,
    /// <see cref="RecordingEmailSender"/> keeps it in memory and sends none. Outside development a
    /// missing host, sender or member-app address stops the API at start-up, naming the settings,
    /// so production never drops mail silently.
    /// </summary>
    public static IServiceCollection AddEmail(this IServiceCollection services, IConfiguration configuration, bool isDevelopment)
    {
        ArgumentNullException.ThrowIfNull(configuration);
        var host = configuration["Email:Smtp:Host"];
        var from = configuration["Email:From"];
        var baseUrl = configuration["MemberApp:BaseUrl"];
        var postalAddress = configuration["Organisation:PostalAddress"];
        if (!isDevelopment)
        {
            var missing = new[] { ("Email__Smtp__Host", host), ("Email__From", from), ("MemberApp__BaseUrl", baseUrl), ("Organisation__PostalAddress", postalAddress) }
                .Where(setting => string.IsNullOrWhiteSpace(setting.Item2))
                .Select(setting => setting.Item1)
                .ToList();
            if (missing.Count > 0)
            {
                throw new InvalidOperationException($"Missing setting: {string.Join(", ", missing)}");
            }
        }

        // Every newsletter email's footer names it (L2-058 AC4; ADR 0110).
        services.AddSingleton(new Organisation(string.IsNullOrWhiteSpace(postalAddress) ? DevelopmentPostalAddress : postalAddress));
        services.AddSingleton(new MemberAppAddress(new Uri(string.IsNullOrWhiteSpace(baseUrl) ? DevelopmentMemberAppBaseUrl : baseUrl, UriKind.Absolute)));
        // The relay's limits for the newsletter's issues (ADR 0070): unset, no issue email is sent.
        services.AddSingleton(new BulkEmailLimits(Limit(configuration, "Email:MaxPerMinute"), Limit(configuration, "Email:MaxPerDay")));
        if (string.IsNullOrWhiteSpace(host))
        {
            services.AddSingleton<RecordingEmailSender>();
            services.AddSingleton<IEmailSender>(provider => provider.GetRequiredService<RecordingEmailSender>());
            services.AddSingleton<IBulkEmailSender>(provider => provider.GetRequiredService<RecordingEmailSender>());
            return services;
        }

        services.AddSingleton(new SmtpSettings
        {
            Host = host,
            Port = configuration.GetValue("Email:Smtp:Port", 587),
            UseTls = configuration.GetValue("Email:Smtp:UseTls", true),
            UserName = configuration["Email:Smtp:UserName"],
            Password = configuration["Email:Smtp:Password"],
            From = string.IsNullOrWhiteSpace(from) ? "Christian Fitness <hello@localhost>" : from,
        });
        services.AddSingleton<SmtpEmailTransport>();
        services.AddSingleton<IBulkEmailSender>(provider => provider.GetRequiredService<SmtpEmailTransport>());
        services.AddSingleton<QueuedEmailSender>();
        services.AddSingleton<IEmailSender>(provider => provider.GetRequiredService<QueuedEmailSender>());
        services.AddHostedService<EmailDispatcher>();
        return services;
    }

    /// <summary>A limit above zero, or none when the setting is missing or not such a number.</summary>
    private static int? Limit(IConfiguration configuration, string key) =>
        int.TryParse(configuration[key], System.Globalization.NumberStyles.None, System.Globalization.CultureInfo.InvariantCulture, out var limit) && limit > 0 ? limit : null;
}
