using ChristianFitness.Api.Errors;
using ChristianFitness.Application.Errors;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authorization.Policy;

namespace ChristianFitness.Api.Security;

/// <summary>
/// Gives a staff policy's 403 the code its area handler failed with, <c>not_staff</c> or
/// <c>forbidden_role</c> (L2-019 AC1, AC4; ADR 0017), then lets the default handler forbid, so the
/// status-code page writes the usual ProblemDetails with that code and nothing else.
/// </summary>
internal sealed class StaffRefusalResultHandler : IAuthorizationMiddlewareResultHandler
{
    private static readonly string[] Codes = [RefusalCodes.NotStaff, RefusalCodes.ForbiddenRole];

    private readonly AuthorizationMiddlewareResultHandler _default = new();

    public Task HandleAsync(RequestDelegate next, HttpContext context, AuthorizationPolicy policy, PolicyAuthorizationResult authorizeResult)
    {
        ArgumentNullException.ThrowIfNull(context);
        ArgumentNullException.ThrowIfNull(authorizeResult);
        if (authorizeResult.Forbidden
            && authorizeResult.AuthorizationFailure?.FailureReasons
                .Select(reason => reason.Message)
                .FirstOrDefault(message => Codes.Contains(message, StringComparer.Ordinal)) is { } code)
        {
            ProblemCodes.Override(context, code);
        }

        return _default.HandleAsync(next, context, policy, authorizeResult);
    }
}
