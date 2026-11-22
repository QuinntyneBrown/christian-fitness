using ChristianFitness.Application.Seeding;
using ChristianFitness.Infrastructure;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

// cf: the Christian Fitness CLI. The API never migrates on startup (L2-041 AC1); a release runs
// `cf migrate`, then `cf seed`, then starts the API. Settings: docs/operations/settings.md.
const string Usage = """
    Usage: cf <command>

      migrate   Apply the pending database migrations.
      seed      Insert the seed data that is missing; a second run changes nothing.

    Settings (environment variables): ConnectionStrings__Default; for seed also
    Seed__StaffEmail, Seed__StaffPassword and Seed__StaffName.
    """;

var command = args.FirstOrDefault();
if (command is not ("migrate" or "seed"))
{
    await Console.Error.WriteLineAsync(Usage).ConfigureAwait(false);
    return 1;
}

var builder = Host.CreateApplicationBuilder(args[1..]);
builder.Logging.AddFilter("Microsoft.EntityFrameworkCore", LogLevel.Warning);

if (string.IsNullOrWhiteSpace(builder.Configuration.GetConnectionString("Default")))
{
    await Console.Error.WriteLineAsync("Missing setting: ConnectionStrings__Default").ConfigureAwait(false);
    return 2;
}

builder.Services.AddInfrastructure(builder.Configuration);

if (command == "seed")
{
    var seed = builder.Configuration.GetSection("Seed");
    var staff = new StaffSeedOptions(seed["StaffEmail"]!, seed["StaffPassword"]!, seed["StaffName"]!);
    var missing = staff.MissingSettings().ToList();
    if (missing.Count > 0)
    {
        await Console.Error.WriteLineAsync($"Missing setting: {string.Join(", ", missing)}").ConfigureAwait(false);
        return 2;
    }

    builder.Services.AddSingleton(staff);
    builder.Services.AddScoped<ISeed, StaffAccountSeed>();
    builder.Services.AddScoped<SeedRunner>();
}

using var host = builder.Build();
await using var scope = host.Services.CreateAsyncScope();

if (command == "migrate")
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var pending = (await db.Database.GetPendingMigrationsAsync().ConfigureAwait(false)).ToList();
    await db.Database.MigrateAsync().ConfigureAwait(false);
    Console.WriteLine($"Migrated: {pending.Count} migration(s) applied.");
}
else
{
    var applied = await scope.ServiceProvider.GetRequiredService<SeedRunner>().RunAsync(CancellationToken.None).ConfigureAwait(false);
    Console.WriteLine($"Seeded: {applied} change(s).");
}

return 0;
