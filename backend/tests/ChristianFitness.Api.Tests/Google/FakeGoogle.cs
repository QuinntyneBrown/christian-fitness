using System.Collections.Concurrent;
using System.Net;
using System.Net.Http.Json;
using System.Security.Cryptography;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;

namespace ChristianFitness.Api.Tests.Google;

/// <summary>
/// Google, faked for the API tests (ADR 0099): its OpenID configuration and signing key, handed to
/// the OpenID Connect handler instead of the discovery document, and its token endpoint, answered
/// through the handler's backchannel. Nothing leaves the process. A test says what Google answers
/// for a code with <see cref="Answer"/>; the token endpoint then signs an ID token for it with the
/// nonce the attempt sent, and records every exchange it was asked for.
/// </summary>
public sealed class FakeGoogle : IConfigurationManager<OpenIdConnectConfiguration>, IDisposable
{
    public const string ClientId = "test-client.apps.googleusercontent.com";
    public const string ClientSecret = "test-client-secret";
    public const string StaffDomain = "christian.fitness";
    public const string Issuer = "https://accounts.google.com";
    public const string AuthorizationEndpoint = "https://accounts.google.com/o/oauth2/v2/auth";
    public const string TokenEndpoint = "https://oauth2.googleapis.com/token";

    private readonly RSA _rsa = RSA.Create(2048);
    private readonly RSA _foreignRsa = RSA.Create(2048);
    private readonly RsaSecurityKey _key;
    private readonly RsaSecurityKey _foreignKey;
    private readonly OpenIdConnectConfiguration _configuration;
    private readonly ConcurrentDictionary<string, GoogleAccount> _answers = new(StringComparer.Ordinal);
    private readonly ConcurrentQueue<IReadOnlyDictionary<string, string>> _exchanges = new();
    private readonly ConcurrentDictionary<string, int> _photoFetches = new(StringComparer.Ordinal);

    public FakeGoogle()
    {
        _key = new RsaSecurityKey(_rsa) { KeyId = "fake-google-key" };
        // Same key id, another key: a token Google did not sign.
        _foreignKey = new RsaSecurityKey(_foreignRsa) { KeyId = "fake-google-key" };
        _configuration = new OpenIdConnectConfiguration
        {
            Issuer = Issuer,
            AuthorizationEndpoint = AuthorizationEndpoint,
            TokenEndpoint = TokenEndpoint,
        };
        _configuration.SigningKeys.Add(_key);
        Backchannel = new HttpClient(new TokenEndpointHandler(this));
    }

    /// <summary>While true, Google cannot be reached: its configuration cannot be read.</summary>
    public bool Down { get; set; }

    /// <summary>While true, the token endpoint refuses every code (<c>invalid_grant</c>).</summary>
    public bool RefusesExchange { get; set; }

    /// <summary>The backchannel the OpenID Connect handler calls the token endpoint through.</summary>
    public HttpClient Backchannel { get; }

    /// <summary>The photos Google serves, by address; any other address answers 404.</summary>
    public ConcurrentDictionary<string, byte[]> Photos { get; } = new(StringComparer.Ordinal);

    /// <summary>How many times the server fetched <paramref name="url"/>.</summary>
    public int PhotoFetches(string url) => _photoFetches.TryGetValue(url, out var count) ? count : 0;

    /// <summary>A handler for the API's photo client, answering from <see cref="Photos"/>.</summary>
    public HttpMessageHandler PhotoHandler() => new PhotoEndpoint(this);

    /// <summary>Every form the token endpoint was sent, oldest first.</summary>
    public IReadOnlyList<IReadOnlyDictionary<string, string>> Exchanges => [.. _exchanges];

    /// <summary>Google answers <paramref name="code"/> with an ID token for <paramref name="account"/>.</summary>
    public void Answer(string code, GoogleAccount account) => _answers[code] = account;

    public Task<OpenIdConnectConfiguration> GetConfigurationAsync(CancellationToken cancel) =>
        Down
            ? throw new InvalidOperationException("IDX20803: Unable to obtain configuration from the fake Google.")
            : Task.FromResult(_configuration);

    public void RequestRefresh()
    {
    }

    /// <summary>An ID token signed with Google's key; <paramref name="tamper"/> may change any claim first.</summary>
    public string IdTokenFor(GoogleAccount account, string nonce, Action<Dictionary<string, object>>? tamper = null, bool signedElsewhere = false)
    {
        ArgumentNullException.ThrowIfNull(account);
        var now = DateTimeOffset.UtcNow;
        var claims = new Dictionary<string, object>(StringComparer.Ordinal)
        {
            ["iss"] = Issuer,
            ["aud"] = ClientId,
            ["sub"] = account.Subject,
            ["email"] = account.Email,
            ["email_verified"] = account.EmailVerified,
            ["name"] = account.Name,
            // Google sends these too; sign-in uses none of them (L2-049 AC2).
            ["given_name"] = account.Name.Split(' ')[0],
            ["family_name"] = account.Name.Split(' ')[^1],
            ["locale"] = "en",
            ["azp"] = ClientId,
            ["nonce"] = nonce,
            ["iat"] = now.ToUnixTimeSeconds(),
            ["exp"] = now.AddMinutes(60).ToUnixTimeSeconds(),
        };
        if (account.Picture is not null)
        {
            claims["picture"] = account.Picture;
        }

        if (account.HostedDomain is not null)
        {
            claims["hd"] = account.HostedDomain;
        }

        tamper?.Invoke(claims);
        return new JsonWebTokenHandler().CreateToken(new SecurityTokenDescriptor
        {
            Claims = claims,
            SigningCredentials = new SigningCredentials(signedElsewhere ? _foreignKey : _key, SecurityAlgorithms.RsaSha256),
        });
    }

    public void Dispose()
    {
        Backchannel.Dispose();
        _rsa.Dispose();
        _foreignRsa.Dispose();
    }

    private sealed class PhotoEndpoint(FakeGoogle google) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            var url = request.RequestUri!.OriginalString;
            google._photoFetches.AddOrUpdate(url, 1, (_, count) => count + 1);
            return Task.FromResult(google.Photos.TryGetValue(url, out var photo)
                ? new HttpResponseMessage(HttpStatusCode.OK) { Content = new ByteArrayContent(photo) }
                : new HttpResponseMessage(HttpStatusCode.NotFound));
        }
    }

    private sealed class TokenEndpointHandler(FakeGoogle google) : HttpMessageHandler
    {
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            if (request.RequestUri?.AbsoluteUri != TokenEndpoint || request.Content is null)
            {
                return new HttpResponseMessage(HttpStatusCode.NotFound);
            }

            var form = (await request.Content.ReadAsStringAsync(cancellationToken).ConfigureAwait(false))
                .Split('&', StringSplitOptions.RemoveEmptyEntries)
                .Select(pair => pair.Split('=', 2))
                .ToDictionary(pair => Uri.UnescapeDataString(pair[0]), pair => Uri.UnescapeDataString(pair[1].Replace('+', ' ')), StringComparer.Ordinal);
            google._exchanges.Enqueue(form);
            if (google.RefusesExchange
                || !form.TryGetValue("code", out var code)
                || !google._answers.TryRemove(code, out var account))
            {
                return new HttpResponseMessage(HttpStatusCode.BadRequest) { Content = JsonContent.Create(new { error = "invalid_grant" }) };
            }

            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = JsonContent.Create(new Dictionary<string, object>
                {
                    ["access_token"] = "fake-access-token",
                    ["id_token"] = google.IdTokenFor(account, account.Nonce ?? string.Empty, account.Tamper, account.SignedElsewhere),
                    ["token_type"] = "Bearer",
                    ["expires_in"] = 3599,
                    ["scope"] = "openid email profile",
                }),
            };
        }
    }
}

/// <summary>
/// The Google account a test signs in with. A class, not a record, as everything that holds an
/// email is (L2-033 AC2).
/// </summary>
public sealed class GoogleAccount
{
    public string Subject { get; init; } = "1000" + Random.Shared.NextInt64(1_000_000_000L, 9_999_999_999L);

    public string Email { get; init; } = string.Empty;

    public bool EmailVerified { get; init; } = true;

    public string Name { get; init; } = "Grace Thompson";

    public string? Picture { get; init; }

    public string? HostedDomain { get; init; }

    /// <summary>The nonce the ID token carries; the helper sets the attempt's own.</summary>
    public string? Nonce { get; set; }

    /// <summary>A change to the ID token's claims before it is signed, such as another audience.</summary>
    public Action<Dictionary<string, object>>? Tamper { get; init; }

    /// <summary>The ID token is signed with a key that is not Google's.</summary>
    public bool SignedElsewhere { get; init; }
}
