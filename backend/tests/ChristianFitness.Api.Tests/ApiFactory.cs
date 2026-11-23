using System.Net;
using System.Security.Cryptography;
using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Email;
using ChristianFitness.Infrastructure.Email;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace ChristianFitness.Api.Tests;

/// <summary>
/// The API in memory: no real database, no network, no mail. Each fixture gets its own factory and
/// so its own InMemory store and its own <see cref="Emails"/>, which records every email the API
/// sends instead of sending it (ADR 0010).
/// </summary>
public class ApiFactory : WebApplicationFactory<Program>
{
    /// <summary>The member app's address the API builds links with.</summary>
    public const string MemberAppBaseUrl = "https://members.example.test";

    /// <summary>
    /// The client address a request comes from, as the test names it. A request without it comes
    /// from an address of its own, so the joins of different tests never share the limit of
    /// account creations per address (L2-034 AC2; ADR 0012).
    /// </summary>
    public const string ClientAddressHeader = "X-Test-Client-Address";

    private readonly string _store = $"api-tests-{Guid.NewGuid():N}";

    /// <summary>Every email the API sent, oldest first.</summary>
    public RecordingEmailSender Emails { get; } = new();

    /// <summary>Every event image the API kept, in memory (ADR 0025).</summary>
    public InMemoryImageStore Images { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Production");
        builder.UseSetting("ConnectionStrings:Default", "Host=unused.invalid;Database=unused");
        // Production refuses to start without them; nothing is ever sent to this host.
        builder.UseSetting("Email:Smtp:Host", "smtp.unused.invalid");
        builder.UseSetting("Email:From", "Christian Fitness <hello@example.test>");
        builder.UseSetting("MemberApp:BaseUrl", MemberAppBaseUrl);
        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<DbContextOptions<AppDbContext>>();
            services.RemoveAll<IDbContextOptionsConfiguration<AppDbContext>>();
            services.AddDbContext<AppDbContext>(options => options.UseInMemoryDatabase(_store));
            services.RemoveAll<IEmailSender>();
            services.AddSingleton<IEmailSender>(Emails);
            services.RemoveAll<IImageStore>();
            services.AddSingleton<IImageStore>(Images);
            // No background service in the shared host (AGENTS.md); nothing is queued to deliver.
            services.RemoveAll<QueuedEmailSender>();
            foreach (var dispatcher in services.Where(d => d.ImplementationType == typeof(EmailDispatcher)).ToList())
            {
                services.Remove(dispatcher);
            }

            services.AddSingleton<IStartupFilter, ClientAddressStartupFilter>();
            ConfigureServices(services);
        });
    }

    /// <summary>Where a derived fixture swaps or adds services (fault injection, exporters).</summary>
    protected virtual void ConfigureServices(IServiceCollection services)
    {
    }

    /// <summary>
    /// The in-memory server gives a request no remote address; this sets the one the test named, or
    /// a random IPv6 address (its own /64) when it named none.
    /// </summary>
    private sealed class ClientAddressStartupFilter : IStartupFilter
    {
        public Action<IApplicationBuilder> Configure(Action<IApplicationBuilder> next) => app =>
        {
            app.Use((context, nextMiddleware) =>
            {
                var named = context.Request.Headers[ClientAddressHeader].ToString();
                context.Connection.RemoteIpAddress = named.Length > 0 ? IPAddress.Parse(named) : new IPAddress(RandomNumberGenerator.GetBytes(16));
                return nextMiddleware(context);
            });
            next(app);
        };
    }
}
