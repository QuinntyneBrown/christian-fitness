using ChristianFitness.Application.Abstractions;
using ChristianFitness.Domain.Directory;
using ChristianFitness.Domain.Events;
using FluentValidation;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Events;

/// <summary>
/// Every code a field of an event can fail with (L2-022 AC2, AC4; ADR 0021, ADR 0025): only these
/// appear in a refusal's <c>fieldCodes</c>.
/// </summary>
public static class EventFieldCodes
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
    public const string ImageInvalid = "image_invalid";
    public const string CursorInvalid = "cursor_invalid";
    public const string CategoryInvalid = "category_invalid";
    public const string HostRequired = "host_required";
    public const string HostNotListed = "host_not_listed";

    /// <summary>Every code a field of an event can fail with.</summary>
    public static readonly IReadOnlySet<string> All = new HashSet<string>(StringComparer.Ordinal)
    {
        TitleRequired, TitleTooLong, CategoryRequired, DateRequired, StartTimeRequired, StartInPast, PlaceRequired,
        PlaceTooLong, AreaRequired, AreaTooLong, PriceInvalid, CapacityRequired, CapacityOutOfRange,
        SummaryRequired, SummaryTooLong, ImageInvalid, CursorInvalid, CategoryInvalid, HostRequired, HostNotListed,
    };
}

/// <summary>
/// The event editor's rules (L2-022 AC2; ADR 0021, ADR 0025). Every field but the image is required;
/// each failure carries its field's own code, which the API names in the refusal's
/// <c>fieldCodes</c>, and a fixed sentence that never repeats the value. One failure per field: the
/// first rule that fails. A start in the past is refused when <paramref name="refusePastStart"/>;
/// editing leaves that to its handler, which knows the stored start.
/// </summary>
public abstract class EventFieldsValidator<T> : AbstractValidator<T>
    where T : EventFields
{
    protected EventFieldsValidator(TimeProvider time, IImageStore images, IAppDbContext db, bool refusePastStart)
    {
        ArgumentNullException.ThrowIfNull(time);
        ArgumentNullException.ThrowIfNull(images);
        ArgumentNullException.ThrowIfNull(db);
        RuleLevelCascadeMode = CascadeMode.Stop;

        RuleFor(c => c.Title)
            .Must(Present).WithErrorCode(EventFieldCodes.TitleRequired).WithMessage("Give the event a title")
            .Must(title => title.Trim().Length <= Event.TitleMaxLength).WithErrorCode(EventFieldCodes.TitleTooLong).WithMessage("Use 120 characters or fewer");

        RuleFor(c => c.Category)
            .Must(category => EventNames.CategoryOf(category) is not null).WithErrorCode(EventFieldCodes.CategoryRequired).WithMessage("Choose a category from the list");

        RuleFor(c => c.Date)
            .Must((command, _) => command.ParsedDate() is not null).WithErrorCode(EventFieldCodes.DateRequired).WithMessage("Pick a date")
            .Must((command, _) => !refusePastStart
                || command.ParsedStartTime() is not { } startTime
                || EventSchedule.StartOf(command.ParsedDate()!.Value, startTime) > time.GetUtcNow())
            .WithErrorCode(EventFieldCodes.StartInPast).WithMessage("Pick a start after now");

        RuleFor(c => c.StartTime)
            .Must((command, _) => command.ParsedStartTime() is not null).WithErrorCode(EventFieldCodes.StartTimeRequired).WithMessage("Pick a start time");

        RuleFor(c => c.Place)
            .Must(Present).WithErrorCode(EventFieldCodes.PlaceRequired).WithMessage("Say where it happens")
            .Must(place => place.Trim().Length <= Event.PlaceMaxLength).WithErrorCode(EventFieldCodes.PlaceTooLong).WithMessage("Use 200 characters or fewer");

        RuleFor(c => c.Area)
            .Must(Present).WithErrorCode(EventFieldCodes.AreaRequired).WithMessage("Give the neighbourhood and city")
            .Must(area => area.Trim().Length <= Event.AreaMaxLength).WithErrorCode(EventFieldCodes.AreaTooLong).WithMessage("Use 100 characters or fewer");

        RuleFor(c => c.PriceCents)
            .Must(price => price is >= 0 and <= Event.PriceCentsMax).WithErrorCode(EventFieldCodes.PriceInvalid).WithMessage("Use a price from $0 to $10,000");

        RuleFor(c => c.Capacity)
            .Must(capacity => capacity is not null).WithErrorCode(EventFieldCodes.CapacityRequired).WithMessage("Give a capacity")
            .Must(capacity => capacity is >= Event.CapacityMin and <= Event.CapacityMax).WithErrorCode(EventFieldCodes.CapacityOutOfRange).WithMessage("Use a capacity from 1 to 10,000");

        RuleFor(c => c.Summary)
            .Must(Present).WithErrorCode(EventFieldCodes.SummaryRequired).WithMessage("Give a summary")
            .Must(summary => summary.Trim().Length <= Event.SummaryMaxLength).WithErrorCode(EventFieldCodes.SummaryTooLong).WithMessage("Use 1,000 characters or fewer");

        // A host is a Listed directory listing (L2-022 AC12; ADR 0067, ADR 0089).
        RuleFor(c => c.HostListingId)
            .Must(host => host is not null).WithErrorCode(EventFieldCodes.HostRequired).WithMessage("Choose a Listed host")
            .MustAsync((host, cancellationToken) => db.DirectoryListings.AnyAsync(l => l.Id == host && l.Status == ListingStatus.Published, cancellationToken))
            .WithErrorCode(EventFieldCodes.HostNotListed).WithMessage("Choose a Listed host");

        RuleFor(c => c.ImageKey)
            .MustAsync((key, cancellationToken) => images.ExistsAsync(key!, cancellationToken))
            .When(c => c.ImageKey is not null)
            .WithErrorCode(EventFieldCodes.ImageInvalid).WithMessage("Use a JPEG, PNG or WebP image up to 5 MB");
    }

    private static bool Present(string? value) => !string.IsNullOrWhiteSpace(value);
}

/// <summary>A new event's rules (L2-022 AC2); the start must be after now.</summary>
public sealed class CreateEventValidator(TimeProvider time, IImageStore images, IAppDbContext db) : EventFieldsValidator<CreateEventCommand>(time, images, db, refusePastStart: true)
{
}
