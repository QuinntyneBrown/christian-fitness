using System.Net.Http.Json;
using System.Text.RegularExpressions;
using ChristianFitness.Application.Email;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Time.Testing;

namespace ChristianFitness.Api.Tests.Newsletter;

/// <summary>
/// The API with a clock the newsletter tests move (AGENTS.md: never sleep). It starts on Thursday
/// 26 November 2026 at 14:00 UTC (9 AM in Toronto). It keeps its Data Protection keys in a folder of
/// its own, so a test that revokes every key revokes only these, never the user profile's key ring
/// that other fixtures and processes share.
/// </summary>
public sealed class NewsletterFactory : ApiFactory
{
    private readonly DirectoryInfo keys = Directory.CreateTempSubdirectory("cf-newsletter-keys-");

    public FakeTimeProvider Time { get; } = new(new DateTimeOffset(2026, 11, 26, 14, 0, 0, TimeSpan.Zero));

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        base.ConfigureWebHost(builder);
        builder.UseSetting("DataProtection:KeysPath", keys.FullName);
    }

    protected override void ConfigureServices(IServiceCollection services)
    {
        services.RemoveAll<TimeProvider>();
        services.AddSingleton<TimeProvider>(Time);
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing)
        {
            keys.Delete(recursive: true);
        }
    }
}

/// <summary>Requests and readings the newsletter tests share.</summary>
internal static partial class Newsletter
{
    public const string SubscriptionsPath = "/api/public/newsletter/subscriptions";
    public const string ConfirmationsPath = "/api/public/newsletter/confirmations";
    public const string UnsubscriptionsPath = "/api/public/newsletter/unsubscriptions";
    public const string OneClickPath = "/api/public/newsletter/unsubscribe";

    public static Task<HttpResponseMessage> SubscribeAsync(HttpClient client, string email) =>
        client.PostAsJsonAsync(new Uri(SubscriptionsPath, UriKind.Relative), new { email }, TestContext.Current.CancellationToken);

    public static Task<HttpResponseMessage> ConfirmAsync(HttpClient client, string token) =>
        client.PostAsJsonAsync(new Uri(ConfirmationsPath, UriKind.Relative), new { token }, TestContext.Current.CancellationToken);

    public static Task<HttpResponseMessage> UnsubscribeAsync(HttpClient client, string token) =>
        client.PostAsJsonAsync(new Uri(UnsubscriptionsPath, UriKind.Relative), new { token }, TestContext.Current.CancellationToken);

    /// <summary>A client from its own network, so no test's submissions count against another's.</summary>
    public static HttpClient ClientFrom(ApiFactory factory, string address)
    {
        var client = Browser.CreateClient(factory);
        client.DefaultRequestHeaders.Add(ApiFactory.ClientAddressHeader, address);
        return client;
    }

    /// <summary>The emails sent to <paramref name="to"/> since <paramref name="before"/> were recorded.</summary>
    public static EmailMessage[] SentTo(ApiFactory factory, string to, int before) =>
        [.. factory.Emails.Sent().Skip(before).Where(m => m.To == to)];

    public static string ConfirmTokenOf(EmailMessage email) => ConfirmLink().Match(email.Text).Groups["token"].Value;

    public static string UnsubscribeTokenOf(EmailMessage email) => UnsubscribeLink().Match(email.Text).Groups["token"].Value;

    [GeneratedRegex(@"https://members\.example\.test/subscribe#confirm=(?<token>[A-Za-z0-9_-]{43})")]
    public static partial Regex ConfirmLink();

    [GeneratedRegex(@"https://members\.example\.test/subscribe#unsubscribe=(?<token>[A-Za-z0-9_-]{43})")]
    public static partial Regex UnsubscribeLink();
}
