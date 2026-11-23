using ChristianFitness.Application.Errors;
using ChristianFitness.Application.Events;
using ChristianFitness.Application.Members;
using FluentValidation.Results;
using Microsoft.AspNetCore.Mvc;

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

    /// <summary>The staff cookie named a session that had expired (L2-018 AC5; ADR 0016).</summary>
    public const string SessionExpired = "session_expired";

    private static readonly object OverrideKey = new();

    /// <summary>
    /// Gives the ProblemDetails the status-code page writes for this request <paramref name="code"/>
    /// instead of the status's own (<see cref="ForStatus"/>), as when a challenge knows why it refused.
    /// </summary>
    public static void Override(HttpContext context, string code)
    {
        ArgumentNullException.ThrowIfNull(context);
        context.Items[OverrideKey] = code;
    }

    /// <summary>The code of this request's ProblemDetails: an override, or the status's own.</summary>
    public static string For(HttpContext context, int status)
    {
        ArgumentNullException.ThrowIfNull(context);
        return context.Items.TryGetValue(OverrideKey, out var code) && code is string text ? text : ForStatus(status);
    }

    /// <summary>The code of an error that carries no more specific one.</summary>
    public static string ForStatus(int status) => status switch
    {
        StatusCodes.Status401Unauthorized => Unauthenticated,
        StatusCodes.Status403Forbidden => Forbidden,
        StatusCodes.Status404NotFound => NotFound,
        >= StatusCodes.Status500InternalServerError => ServerError,
        _ => Error,
    };

    /// <summary>
    /// The 400 answer to a body that failed validation (L2-032 AC1): the field errors keyed by the
    /// camel-case field name, each with its fixed sentence, and the code <c>field_too_long</c> when
    /// any field is over its limit (L2-003 AC6), else <c>validation_failed</c>. A failure whose code
    /// is a field's own code, such as an event's <c>title_required</c> (L2-022 AC2; ADR 0021) or a
    /// moderation's <c>note_required</c> (L2-029 AC5; ADR 0023), is also
    /// named in a <c>fieldCodes</c> extension: the field's camel-case name and its first code. A body
    /// with no such failure, such as Join's, has no <c>fieldCodes</c>.
    /// </summary>
    public static ValidationProblemDetails Invalid(IEnumerable<ValidationFailure> failures)
    {
        var list = failures.ToList();
        var errors = list
            .GroupBy(failure => CamelCase(failure.PropertyName), StringComparer.Ordinal)
            .ToDictionary(group => group.Key, group => group.Select(failure => failure.ErrorMessage).Distinct(StringComparer.Ordinal).ToArray(), StringComparer.Ordinal);
        var problem = new ValidationProblemDetails(errors)
        {
            Status = StatusCodes.Status400BadRequest,
            Extensions = { ["code"] = CodeFor(list.Select(failure => failure.ErrorCode)) },
        };
        var fieldCodes = list
            .Where(failure => CreateEventValidator.FieldCodes.Contains(failure.ErrorCode) || ModerationRules.FieldCodes.Contains(failure.ErrorCode))
            .GroupBy(failure => CamelCase(failure.PropertyName), StringComparer.Ordinal)
            .ToDictionary(group => group.Key, group => group.First().ErrorCode, StringComparer.Ordinal);
        if (fieldCodes.Count > 0)
        {
            problem.Extensions["fieldCodes"] = fieldCodes;
        }

        return problem;
    }

    /// <summary>The code of a refused body, from the error codes of its failures.</summary>
    public static string CodeFor(IEnumerable<string> failureCodes) =>
        failureCodes.Contains(RefusalCodes.FieldTooLong, StringComparer.Ordinal) ? RefusalCodes.FieldTooLong : RefusalCodes.ValidationFailed;

    /// <summary>A body that could not be read at all: no field to name, nothing of it repeated.</summary>
    public static ValidationProblemDetails Unreadable() =>
        new(new Dictionary<string, string[]>(StringComparer.Ordinal) { ["body"] = ["The request body could not be read"] })
        {
            Status = StatusCodes.Status400BadRequest,
            Extensions = { ["code"] = RefusalCodes.ValidationFailed },
        };

    private static string CamelCase(string name) =>
        string.IsNullOrEmpty(name) ? name : string.Concat(name[..1].ToLowerInvariant(), name[1..]);
}
