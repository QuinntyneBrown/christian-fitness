using ChristianFitness.Application.Errors;
using FluentValidation;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace ChristianFitness.Api.Errors;

/// <summary>
/// Turns an exception into a ProblemDetails with a <c>code</c> (L2-032 AC4). A body that failed
/// validation answers 400 with its field errors (L2-032 AC1); a handler's refusal answers its
/// kind's status and code (L2-003 AC2). Anything else is a 500 with code
/// <c>server_error</c> and nothing more (L2-032 AC2): no message, type or stack trace, in any
/// environment. Only the 500 is logged, by the exception's type alone, since a message can carry
/// personal data (L2-033 AC2); a refusal is the client's, not an incident.
/// </summary>
internal sealed partial class ProblemDetailsExceptionHandler(IProblemDetailsService problemDetails, ILogger<ProblemDetailsExceptionHandler> logger)
    : IExceptionHandler
{
    public ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        var problem = exception switch
        {
            ValidationException invalid => ProblemCodes.Invalid(invalid.Errors),
            RefusalException refusal => Refused(refusal),
            _ => Unexpected(exception),
        };
        httpContext.Response.StatusCode = problem.Status ?? StatusCodes.Status500InternalServerError;
        return problemDetails.TryWriteAsync(new ProblemDetailsContext { HttpContext = httpContext, ProblemDetails = problem });
    }

    private static ProblemDetails Refused(RefusalException refusal)
    {
        var problem = Problem(refusal);
        foreach (var (name, value) in refusal.Extensions)
        {
            problem.Extensions[name] = value;
        }

        return problem;
    }

    private static ProblemDetails Problem(RefusalException refusal) => new()
    {
        Status = refusal.Kind switch
        {
            RefusalKind.Conflict => StatusCodes.Status409Conflict,
            RefusalKind.Unauthenticated => StatusCodes.Status401Unauthorized,
            RefusalKind.Forbidden => StatusCodes.Status403Forbidden,
            RefusalKind.TooManyRequests => StatusCodes.Status429TooManyRequests,
            RefusalKind.BadRequest => StatusCodes.Status400BadRequest,
            RefusalKind.Gone => StatusCodes.Status410Gone,
            RefusalKind.NotFound => StatusCodes.Status404NotFound,
            RefusalKind.Unavailable => StatusCodes.Status503ServiceUnavailable,
            _ => StatusCodes.Status400BadRequest,
        },
        // ASP.NET Core has no default type for 429; RFC 6585 defines it.
        Type = refusal.Kind == RefusalKind.TooManyRequests ? "https://tools.ietf.org/html/rfc6585#section-4" : null,
        Extensions = { ["code"] = refusal.Code },
    };

    private ProblemDetails Unexpected(Exception exception)
    {
        LogUnhandled(logger, exception.GetType().FullName);
        return new ProblemDetails
        {
            Status = StatusCodes.Status500InternalServerError,
            Title = "An unexpected error occurred.",
            Extensions = { ["code"] = ProblemCodes.ServerError },
        };
    }

    [LoggerMessage(Level = LogLevel.Error, Message = "Unhandled exception of type {ExceptionType}")]
    private static partial void LogUnhandled(ILogger logger, string? exceptionType);
}
