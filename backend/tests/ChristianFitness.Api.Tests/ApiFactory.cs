using ChristianFitness.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace ChristianFitness.Api.Tests;

/// <summary>
/// The API in memory: no real database, no network. Each fixture gets its own factory and so its
/// own InMemory store.
/// </summary>
public class ApiFactory : WebApplicationFactory<Program>
{
    private readonly string _store = $"api-tests-{Guid.NewGuid():N}";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Production");
        builder.UseSetting("ConnectionStrings:Default", "Host=unused.invalid;Database=unused");
        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<DbContextOptions<AppDbContext>>();
            services.RemoveAll<IDbContextOptionsConfiguration<AppDbContext>>();
            services.AddDbContext<AppDbContext>(options => options.UseInMemoryDatabase(_store));
            ConfigureServices(services);
        });
    }

    /// <summary>Where a derived fixture swaps or adds services (fault injection, exporters).</summary>
    protected virtual void ConfigureServices(IServiceCollection services)
    {
    }
}
