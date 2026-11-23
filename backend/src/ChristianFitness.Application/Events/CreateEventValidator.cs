using ChristianFitness.Domain.Events;
using FluentValidation;

namespace ChristianFitness.Application.Events;

/// <summary>
/// The event editor's rules (L2-022 AC2; ADR 0021). Every field is required; each failure carries
/// its field's own code, which the API names in the refusal's <c>fieldCodes</c>, and a fixed
/// sentence that never repeats the value. One failure per field: the first rule that fails.
/// </summary>
public sealed class CreateEventValidator : AbstractValidator<CreateEventCommand>
{
    public const string TitleRequired = "title_required";
    public const string TitleTooLong = "title_too_long";
    public const string CategoryRequired = "category_required";
    public const string DateRequired = "date_required";
    public const string StartTimeRequired = "start_time_required";
    public const string StartInPast = "start_in_past";
    public const string PlaceRequired = "place_required";
    public const string PlaceTooLong = "place_too_long";
    public const string AreaRequired = "area_required";
    public const string AreaTooLong = "area_too_long";
    public const string PriceInvalid = "price_invalid";
    public const string CapacityRequired = "capacity_required";
    public const string CapacityOutOfRange = "capacity_out_of_range";
    public const string SummaryRequired = "summary_required";
    public const string SummaryTooLong = "summary_too_long";

    /// <summary>Every code a field of an event can fail with: only these appear in <c>fieldCodes</c>.</summary>
    public static readonly IReadOnlySet<string> FieldCodes = new HashSet<string>(StringComparer.Ordinal)
    {
        TitleRequired, TitleTooLong, CategoryRequired, DateRequired, StartTimeRequired, StartInPast, PlaceRequired,
        PlaceTooLong, AreaRequired, AreaTooLong, PriceInvalid, CapacityRequired, CapacityOutOfRange, SummaryRequired,
        SummaryTooLong,
    };

    public CreateEventValidator(TimeProvider time)
    {
        ArgumentNullException.ThrowIfNull(time);
        RuleLevelCascadeMode = CascadeMode.Stop;

        RuleFor(c => c.Title)
            .Must(Present).WithErrorCode(TitleRequired).WithMessage("Give the event a title")
            .Must(title => title.Trim().Length <= Event.TitleMaxLength).WithErrorCode(TitleTooLong).WithMessage("Use 120 characters or fewer");

        RuleFor(c => c.Category)
            .Must(category => EventNames.CategoryOf(category) is not null).WithErrorCode(CategoryRequired).WithMessage("Choose a category from the list");

        RuleFor(c => c.Date)
            .Must((command, _) => command.ParsedDate() is not null).WithErrorCode(DateRequired).WithMessage("Pick a date")
            .Must((command, _) => command.ParsedStartTime() is not { } startTime
                || EventSchedule.StartOf(command.ParsedDate()!.Value, startTime) > time.GetUtcNow())
            .WithErrorCode(StartInPast).WithMessage("Pick a start after now");

        RuleFor(c => c.StartTime)
            .Must((command, _) => command.ParsedStartTime() is not null).WithErrorCode(StartTimeRequired).WithMessage("Pick a start time");

        RuleFor(c => c.Place)
            .Must(Present).WithErrorCode(PlaceRequired).WithMessage("Say where it happens")
            .Must(place => place.Trim().Length <= Event.PlaceMaxLength).WithErrorCode(PlaceTooLong).WithMessage("Use 200 characters or fewer");

        RuleFor(c => c.Area)
            .Must(Present).WithErrorCode(AreaRequired).WithMessage("Give the neighbourhood and city")
            .Must(area => area.Trim().Length <= Event.AreaMaxLength).WithErrorCode(AreaTooLong).WithMessage("Use 100 characters or fewer");

        RuleFor(c => c.PriceCents)
            .Must(price => price is >= 0 and <= Event.PriceCentsMax).WithErrorCode(PriceInvalid).WithMessage("Use a price from $0 to $10,000");

        RuleFor(c => c.Capacity)
            .Must(capacity => capacity is not null).WithErrorCode(CapacityRequired).WithMessage("Give a capacity")
            .Must(capacity => capacity is >= Event.CapacityMin and <= Event.CapacityMax).WithErrorCode(CapacityOutOfRange).WithMessage("Use a capacity from 1 to 10,000");

        RuleFor(c => c.Summary)
            .Must(Present).WithErrorCode(SummaryRequired).WithMessage("Give a summary")
            .Must(summary => summary.Trim().Length <= Event.SummaryMaxLength).WithErrorCode(SummaryTooLong).WithMessage("Use 1,000 characters or fewer");
    }

    private static bool Present(string? value) => !string.IsNullOrWhiteSpace(value);
}
