using ChristianFitness.Application.Errors;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace ChristianFitness.Api.Errors;

/// <summary>
/// Turns an exception into a ProblemDetails with a <c>code</c> (L2-032 AC4). A handler's refusal
/// answers its kind's status and code (L2-003 AC2). Anything else is a 500 with code
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
            RefusalException refusal => Refused(refusal),
            _ => Unexpected(exception),
        };
        httpContext.Response.StatusCode = problem.Status ?? StatusCodes.Status500InternalServerError;
        return problemDetails.TryWriteAsync(new ProblemDetailsContext { HttpContext = httpContext, ProblemDetails = problem });
    }

    private static ProblemDetails Refused(RefusalException refusal) => new()
    {
        Status = refusal.Kind switch
        {
            RefusalKind.Conflict => StatusCodes.Status409Conflict,
            _ => StatusCodes.Status400BadRequest,
        },
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
