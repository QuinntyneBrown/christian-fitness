using ChristianFitness.Application.Abstractions;
using Microsoft.AspNetCore.Http;

namespace ChristianFitness.Infrastructure.Security;

/// <summary>
/// The request's remote address as a rate-limit key (ADR 0012). Behind the reverse proxy it is the
/// address the proxy appended to <c>X-Forwarded-For</c> when
/// <c>ASPNETCORE_FORWARDEDHEADERS_ENABLED</c> is set (docs/operations/settings.md).
/// </summary>
internal sealed class HttpClientAddress(IHttpContextAccessor accessor) : IClientAddress
{
    public string PartitionKey => ClientAddressPartition.Of(accessor.HttpContext?.Connection.RemoteIpAddress);
}
