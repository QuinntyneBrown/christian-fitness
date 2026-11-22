using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ChristianFitness.Api.Tests;

/// <summary>
/// The API with a stand-in session until sign-in exists (slice 3.1): a request carrying
/// <see cref="Header"/> is signed in. The value <see cref="Fault"/> makes authentication throw,
/// which is how a test reaches the unexpected-error path before any handler can fail.
/// </summary>
public class SessionApiFactory : ApiFactory
{
    public const string Header = "X-Test-Session";
    public const string Member = "member";
    public const string Fault = "fault";
    public const string FaultDetail = "Npgsql failed for someone@example.com at Host=db.internal";

    private const string SchemeName = "TestSession";

    protected override void ConfigureServices(IServiceCollection services)
    {
        services.AddAuthentication(options => options.DefaultScheme = SchemeName)
            .AddScheme<AuthenticationSchemeOptions, TestSessionHandler>(SchemeName, null);
    }

    private sealed class TestSessionHandler(IOptionsMonitor<AuthenticationSchemeOptions> options, ILoggerFactory logger, UrlEncoder encoder)
        : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
    {
        protected override Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            var session = Request.Headers[Header].ToString();
            if (session == Fault)
            {
                throw new InvalidOperationException(FaultDetail);
            }

            if (session != Member)
            {
                return Task.FromResult(AuthenticateResult.NoResult());
            }

            var identity = new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, Guid.CreateVersion7().ToString())], SchemeName);
            return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(identity), SchemeName)));
        }
    }
}
