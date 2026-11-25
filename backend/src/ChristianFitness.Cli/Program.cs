using System.Globalization;
using ChristianFitness.Application.Email;
using ChristianFitness.Application.Legal;
using ChristianFitness.Domain.Legal;
using ChristianFitness.Infrastructure.Email;
using ChristianFitness.Application.Admin;
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

      announce-legal-change <privacy|terms> <yyyy-mm-dd>  Deliver a service notice to every member.
      migrate           Apply the pending database migrations.
      seed              Insert the seed data that is missing; a second run changes nothing.
      two-step <email>  Give a staff account a new authenticator secret and print its
                        otpauth:// link once, for the staff member's app (ADR 0013).

    Settings (environment variables): ConnectionStrings__Default; for seed also
    Seed__StaffEmail, Seed__StaffPassword and Seed__StaffName; Seed__DirectorySamples=true
    adds the sample directory listings.
    """;

var command = args.FirstOrDefault();
var announce = command == "announce-legal-change";
var version = default(DateOnly);
if ((announce && (args.Length != 3 || args[1] is not ("privacy" or "terms") ||
    !DateOnly.TryParseExact(args[2], "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out version))) ||
    command is not ("migrate" or "seed" or "two-step" or "announce-legal-change") || (command == "two-step" && (args.Length < 2 || string.IsNullOrWhiteSpace(args[1]))))
{
    await Console.Error.WriteLineAsync(Usage).ConfigureAwait(false);
    return 1;
}

var commandArguments = announce ? 3 : command == "two-step" ? 2 : 1;
var builder = Host.CreateApplicationBuilder(args[commandArguments..]);
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

    // The team listing always; the mocks' sample listings and their connections only on a
    // demonstration system (ADR 0082, ADR 0087).
    var samples = builder.Configuration.GetValue<bool>("Seed:DirectorySamples");
    var listings = samples
        ? [DirectoryListingSeed.Team, .. DirectoryListingSeed.Samples]
        : new[] { DirectoryListingSeed.Team };
    foreach (var listing in listings)
    {
        builder.Services.AddScoped<ISeed>(services => new DirectoryListingSeed(listing, services.GetRequiredService<TimeProvider>()));
    }

    foreach (var connection in samples ? ListingConnectionSeed.Samples : [])
    {
        builder.Services.AddScoped<ISeed>(_ => new ListingConnectionSeed(connection));
    }

    builder.Services.AddScoped<SeedRunner>();
}

if (command == "two-step")
{
    builder.Services.AddScoped<StaffTwoStepSetUp>();
}

if (announce)
{
    builder.Services.AddEmail(builder.Configuration, isDevelopment: false);
    // A short-lived command must await SMTP delivery, not leave messages in the API's queue.
    builder.Services.AddSingleton<IEmailSender>(sp => sp.GetRequiredService<SmtpEmailTransport>());
    builder.Services.AddSingleton(TimeProvider.System);
    builder.Services.AddSingleton(LegalDocuments.Published);
    builder.Services.AddScoped<LegalAnnouncement>();
}

using var host = builder.Build();
await using var scope = host.Services.CreateAsyncScope();

if (announce)
{
    try
    {
        var sent = await scope.ServiceProvider.GetRequiredService<LegalAnnouncement>()
            .SendAsync(args[1], version, CancellationToken.None).ConfigureAwait(false);
        Console.WriteLine($"Service notices sent: {sent}.");
    }
    catch (Exception failure) when (failure is not OperationCanceledException)
    {
        // Mail exceptions can include a recipient or SMTP credentials.
        await Console.Error.WriteLineAsync("Legal announcement failed. Check the schedule and mail configuration.").ConfigureAwait(false);
        return 3;
    }
}
else if (command == "migrate")
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var pending = (await db.Database.GetPendingMigrationsAsync().ConfigureAwait(false)).ToList();
    await db.Database.MigrateAsync().ConfigureAwait(false);
    Console.WriteLine($"Migrated: {pending.Count} migration(s) applied.");
}
else if (command == "two-step")
{
    // The link is the secret: it goes to the operator's terminal once and nowhere else.
    var link = await scope.ServiceProvider.GetRequiredService<StaffTwoStepSetUp>().SetUpAsync(args[1], CancellationToken.None).ConfigureAwait(false);
    if (link is null)
    {
        await Console.Error.WriteLineAsync("No staff account has that email; nothing was changed.").ConfigureAwait(false);
        return 3;
    }

    Console.WriteLine("Two-step verification set up. Add this link to the staff member's authenticator app (as a QR code or by hand); it is not shown again:");
    Console.WriteLine(link);
}
else
{
    var applied = await scope.ServiceProvider.GetRequiredService<SeedRunner>().RunAsync(CancellationToken.None).ConfigureAwait(false);
    Console.WriteLine($"Seeded: {applied} change(s).");
}

return 0;
