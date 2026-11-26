using ChristianFitness.Application.Abstractions;
using Microsoft.AspNetCore.Http;
using Microsoft.Net.Http.Headers;

namespace ChristianFitness.Infrastructure.Security;

/// <summary>The request's OS and browser families, read from its <c>User-Agent</c> (ADR 0109). The header itself is kept nowhere.</summary>
internal sealed class HttpClientDevice(IHttpContextAccessor accessor) : IClientDevice
{
    private string? UserAgent => accessor.HttpContext?.Request.Headers[HeaderNames.UserAgent].ToString();

    public string Os => ClientDevices.OsOf(UserAgent);

    public string Browser => ClientDevices.BrowserOf(UserAgent);
}
