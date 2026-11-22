namespace ChristianFitness.Api.Errors;

/// <summary>
/// The <c>code</c> extension of every ProblemDetails the API writes (L2-032 AC4). A client branches
/// on the code and shows its own generic message.
/// </summary>
public static class ProblemCodes
{
    public const string Unauthenticated = "unauthenticated";
    public const string Forbidden = "forbidden";
    public const string NotFound = "not_found";
    public const string ServerError = "server_error";
    public const string Error = "error";

    /// <summary>The code of an error that carries no more specific one.</summary>
    public static string ForStatus(int status) => status switch
    {
        StatusCodes.Status401Unauthorized => Unauthenticated,
        StatusCodes.Status403Forbidden => Forbidden,
        StatusCodes.Status404NotFound => NotFound,
        >= StatusCodes.Status500InternalServerError => ServerError,
        _ => Error,
    };
}
