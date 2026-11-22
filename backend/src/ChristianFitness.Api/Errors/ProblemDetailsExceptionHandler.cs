using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace ChristianFitness.Api.Errors;

/// <summary>
/// Turns an exception no one handled into a 500 ProblemDetails with code <c>server_error</c> and
/// nothing else (L2-032 AC2): no message, type or stack trace, in any environment. The log records
/// the exception's type only, since a message can carry personal data (L2-033 AC2).
/// </summary>
internal sealed partial class ProblemDetailsExceptionHandler(IProblemDetailsService problemDetails, ILogger<ProblemDetailsExceptionHandler> logger)
    : IExceptionHandler
{
    public ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        LogUnhandled(logger, exception.GetType().FullName);
        httpContext.Response.StatusCode = StatusCodes.Status500InternalServerError;
        return problemDetails.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            ProblemDetails = new ProblemDetails
            {
                Status = StatusCodes.Status500InternalServerError,
                Title = "An unexpected error occurred.",
                Extensions = { ["code"] = ProblemCodes.ServerError },
            },
        });
    }

    [LoggerMessage(Level = LogLevel.Error, Message = "Unhandled exception of type {ExceptionType}")]
    private static partial void LogUnhandled(ILogger logger, string? exceptionType);
}
