namespace ChristianFitness.Application.Errors;

/// <summary>The codes a handler or a validator refuses with; clients branch on them (L2-032).</summary>
public static class RefusalCodes
{
    /// <summary>A suspended member gave the right password (L2-004 AC4).</summary>
    public const string AccountSuspended = "account_suspended";

    /// <summary>An account already has this email (L2-003 AC2).</summary>
    public const string EmailTaken = "email_taken";

    /// <summary>A field is longer than its limit (L2-003 AC6).</summary>
    public const string FieldTooLong = "field_too_long";

    /// <summary>No account has this email and password (L2-004 AC2): one code for both.</summary>
    public const string InvalidCredentials = "invalid_credentials";

    /// <summary>The credentials are right but the account holds no staff role (L2-018 AC2).</summary>
    public const string NotStaff = "not_staff";

    /// <summary>Too many accounts were created from one address in an hour (L2-034 AC2).</summary>
    public const string RateLimited = "rate_limited";

    /// <summary>5 sign-ins for one email failed in the last 15 minutes (L2-004 AC3).</summary>
    public const string TooManyAttempts = "too_many_attempts";

    /// <summary>A body failed validation for any other reason (L2-032 AC1).</summary>
    public const string ValidationFailed = "validation_failed";
}
