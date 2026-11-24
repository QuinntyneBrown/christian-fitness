namespace ChristianFitness.Application.Errors;

/// <summary>The codes a handler or a validator refuses with; clients branch on them (L2-032).</summary>
public static class RefusalCodes
{
    /// <summary>A suspended member gave the right password, in either app (L2-004 AC4, L2-029 AC8).</summary>
    public const string AccountSuspended = "account_suspended";

    /// <summary>The event has no place left (L2-011 AC2; ADR 0032).</summary>
    public const string EventFull = "event_full";

    /// <summary>The event has started, so a place can no longer be given up (L2-012 AC2; ADR 0034).</summary>
    public const string EventStarted = "event_started";

    /// <summary>An event's capacity was set below the members going (L2-022 AC3; ADR 0025).</summary>
    public const string CapacityBelowGoing = "capacity_below_going";

    /// <summary>The event asked for does not exist or is not published (L2-010 AC2; ADR 0031).</summary>
    public const string EventNotFound = "event_not_found";

    /// <summary>Only a draft event can be published (L2-023 AC4; ADR 0026).</summary>
    public const string EventNotDraft = "event_not_draft";

    /// <summary>Only a published event can be cancelled (L2-023 AC2; ADR 0035).</summary>
    public const string EventNotPublished = "event_not_published";

    /// <summary>Staff tried to flag or suspend their own account (L2-029 AC4; ADR 0028).</summary>
    public const string CannotModerateSelf = "cannot_moderate_self";

    /// <summary>The id names no member (L2-029 AC6).</summary>
    public const string MemberNotFound = "member_not_found";

    /// <summary>The member's status does not allow the change, such as flagging a Flagged member (L2-029 AC6).</summary>
    public const string StatusConflict = "status_conflict";

    /// <summary>An account already has this email (L2-003 AC2).</summary>
    public const string EmailTaken = "email_taken";

    /// <summary>
    /// The caller may not change what the request names, such as another member's profile
    /// (L2-006 AC5): the code the authorization policies give every other 403.
    /// </summary>
    public const string Forbidden = "forbidden";

    /// <summary>The member is not registered for the event whose chat they asked for (L2-016; ADR 0039).</summary>
    public const string NotAParticipant = "not_a_participant";

    /// <summary>The event whose chat a message was sent to has been cancelled (L2-023 AC2; ADR 0041).</summary>
    public const string EventCancelled = "event_cancelled";

    /// <summary>A chat message is empty or longer than 2,000 characters (L2-016; ADR 0039).</summary>
    public const string MessageInvalid = "message_invalid";

    /// <summary>The member a direct message goes to is unknown, suspended or the sender (L2-014; ADR 0043).</summary>
    public const string RecipientUnavailable = "recipient_unavailable";

    /// <summary>A field is longer than its limit (L2-003 AC6).</summary>
    public const string FieldTooLong = "field_too_long";

    /// <summary>No account has this email and password (L2-004 AC2): one code for both.</summary>
    public const string InvalidCredentials = "invalid_credentials";

    /// <summary>A second-step code is wrong, malformed or already used (L2-046 AC3).</summary>
    public const string InvalidCode = "invalid_code";

    /// <summary>No pending sign-in, or it is older than 5 minutes (L2-046 AC5).</summary>
    public const string TwoStepExpired = "two_step_expired";

    /// <summary>A staff account without two-step verification set up (L2-046 AC6).</summary>
    public const string TwoStepNotSetUp = "two_step_not_set_up";

    /// <summary>The credentials are right but the account holds no staff role (L2-018 AC2).</summary>
    public const string NotFound = "not_found";

    public const string NotStaff = "not_staff";

    /// <summary>
    /// A staff member's role does not open this area of the admin console (L2-019 AC1; ADR 0020), or
    /// a Moderator tried to flag or suspend a staff account (L2-029 AC7; ADR 0028).
    /// </summary>
    public const string ForbiddenRole = "forbidden_role";

    /// <summary>Too many accounts were created, or reset links asked for, from one address in an hour (L2-034 AC2, AC3).</summary>
    public const string RateLimited = "rate_limited";

    /// <summary>A reset link is unknown, used or expired (L2-045 AC4): one code for all three.</summary>
    public const string ResetLinkExpired = "reset_link_expired";

    /// <summary>
    /// 5 sign-ins for one email failed in the last 15 minutes (L2-004 AC3), or 5 second-step codes
    /// for one staff account were wrong in 15 minutes (L2-046 AC4).
    /// </summary>
    public const string TooManyAttempts = "too_many_attempts";

    /// <summary>A profile names more than 5 goals (L2-006 AC3).</summary>
    public const string TooManyGoals = "too_many_goals";

    /// <summary>The member already has a Pending professional application (L2-026 AC2; ADR 0047).</summary>
    public const string ApplicationPending = "application_pending";

    /// <summary>A suspended member tried to apply to be listed (L2-026; ADR 0047).</summary>
    public const string MemberSuspended = "member_suspended";

    /// <summary>The application staff tried to decide does not exist (L2-025; ADR 0049).</summary>
    public const string ApplicationNotFound = "application_not_found";

    /// <summary>The application staff tried to decide was already approved or declined (L2-025; ADR 0049).</summary>
    public const string ApplicationDecided = "application_decided";

    /// <summary>A body failed validation for any other reason (L2-032 AC1).</summary>
    public const string ValidationFailed = "validation_failed";
}
