namespace ChristianFitness.Application.Errors;

/// <summary>What kind of refusal a handler made; the API answers each with its status.</summary>
public enum RefusalKind
{
    /// <summary>The request clashes with what is already stored (409).</summary>
    Conflict,

    /// <summary>The caller could not be identified, such as by a wrong password (401).</summary>
    Unauthenticated,
}

/// <summary>
/// A handler refuses a request it cannot carry out, with a <see cref="Code"/> a client branches on
/// (L2-032 AC4). The message is the code: it never carries the request's values.
/// </summary>
public sealed class RefusalException : Exception
{
    public RefusalException(string code, RefusalKind kind)
        : this(code, kind, null)
    {
    }

    public RefusalException(string code, RefusalKind kind, Exception? innerException)
        : base(code, innerException)
    {
        Code = code;
        Kind = kind;
    }

    public RefusalException()
        : this("error", RefusalKind.Conflict)
    {
    }

    public RefusalException(string message, Exception innerException)
        : this(message, RefusalKind.Conflict, innerException)
    {
    }

    public string Code { get; }

    public RefusalKind Kind { get; }
}
