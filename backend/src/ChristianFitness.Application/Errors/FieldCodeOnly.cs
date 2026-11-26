namespace ChristianFitness.Application.Errors;

/// <summary>
/// The custom state of a validation failure whose code names its field and not the body (ADR 0109):
/// the answer carries the code in <c>fieldCodes</c> and keeps the top-level code
/// <c>validation_failed</c>, even for a code such as <c>field_too_long</c> that would otherwise
/// become the top-level code (L2-063 AC8).
/// </summary>
public static class FieldCodeOnly
{
    public static readonly object State = new();
}
