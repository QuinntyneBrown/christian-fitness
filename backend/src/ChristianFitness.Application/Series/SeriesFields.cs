using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Events;
using ChristianFitness.Domain.Directory;
using ChristianFitness.Domain.Events;
using FluentValidation;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Series;

/// <summary>
/// The series editor's fields, as the admin app sends them (L2-071 AC12; ADR 0091): the category by
/// its lower-case name, the prices in cents (the series price 0 is free; no drop-in price is no
/// drop-in), the image by its key and the host by its listing. Creating and saving a series send the
/// same body.
/// </summary>
public abstract class SeriesFields
{
    public string Title { get; init; } = string.Empty;

    public string Category { get; init; } = string.Empty;

    /// <summary>The description members read.</summary>
    public string Summary { get; init; } = string.Empty;

    /// <summary>The stored image's key (<c>POST /api/admin/series/images</c>), or none.</summary>
    public string? ImageKey { get; init; }

    /// <summary>The Listed directory listing that hosts the series (L2-071 AC10; ADR 0089).</summary>
    public Guid? HostListingId { get; init; }

    public int? PriceCents { get; init; }

    /// <summary>The price of one date; none when a member cannot drop in.</summary>
    public int? DropInPriceCents { get; init; }

    public int? Capacity { get; init; }

    public string Place { get; init; } = string.Empty;

    /// <summary>The suggestion area: the neighbourhood and city where members are told about it.</summary>
    public string Area { get; init; } = string.Empty;
}

/// <summary>
/// The series editor's rules (L2-071 AC11, AC12; ADR 0091), with the event editor's codes for the
/// fields they share (ADR 0021, ADR 0025, ADR 0089): each failure carries its field's own code, named
/// in the refusal's <c>fieldCodes</c>, and a fixed sentence that never repeats the value. One failure
/// per field: the first rule that fails. The drop-in price may be missing; when given it is a price.
/// </summary>
public abstract class SeriesFieldsValidator<T> : AbstractValidator<T>
    where T : SeriesFields
{
    protected SeriesFieldsValidator(IImageStore images, IAppDbContext db)
    {
        ArgumentNullException.ThrowIfNull(images);
        ArgumentNullException.ThrowIfNull(db);
        RuleLevelCascadeMode = CascadeMode.Stop;

        RuleFor(c => c.Title)
            .Must(Present).WithErrorCode(EventFieldCodes.TitleRequired).WithMessage("Give the series a title")
            .Must(title => title.Trim().Length <= Event.TitleMaxLength).WithErrorCode(EventFieldCodes.TitleTooLong).WithMessage("Use 120 characters or fewer");

        RuleFor(c => c.Category)
            .Must(category => EventNames.CategoryOf(category) is not null).WithErrorCode(EventFieldCodes.CategoryRequired).WithMessage("Choose a category from the list");

        RuleFor(c => c.HostListingId)
            .Must(host => host is not null).WithErrorCode(EventFieldCodes.HostRequired).WithMessage("Choose a Listed host")
            .MustAsync((host, cancellationToken) => db.DirectoryListings.AnyAsync(l => l.Id == host && l.Status == ListingStatus.Published, cancellationToken))
            .WithErrorCode(EventFieldCodes.HostNotListed).WithMessage("Choose a Listed host");

        RuleFor(c => c.Summary)
            .Must(Present).WithErrorCode(EventFieldCodes.SummaryRequired).WithMessage("Give a description")
            .Must(summary => summary.Trim().Length <= Event.SummaryMaxLength).WithErrorCode(EventFieldCodes.SummaryTooLong).WithMessage("Use 1,000 characters or fewer");

        RuleFor(c => c.ImageKey)
            .MustAsync((key, cancellationToken) => images.ExistsAsync(key!, cancellationToken))
            .When(c => c.ImageKey is not null)
            .WithErrorCode(EventFieldCodes.ImageInvalid).WithMessage("Use a JPEG, PNG or WebP image up to 5 MB");

        RuleFor(c => c.PriceCents)
            .Must(price => price is >= 0 and <= Event.PriceCentsMax).WithErrorCode(EventFieldCodes.PriceInvalid).WithMessage("Use a price from $0 to $10,000");

        RuleFor(c => c.DropInPriceCents)
            .Must(price => price is null or (>= 0 and <= Event.PriceCentsMax)).WithErrorCode(EventFieldCodes.PriceInvalid).WithMessage("Use a price from $0 to $10,000");

        RuleFor(c => c.Capacity)
            .Must(capacity => capacity is not null).WithErrorCode(EventFieldCodes.CapacityRequired).WithMessage("Give a capacity")
            .Must(capacity => capacity is >= Event.CapacityMin and <= Event.CapacityMax).WithErrorCode(EventFieldCodes.CapacityOutOfRange).WithMessage("Use a capacity from 1 to 10,000");

        RuleFor(c => c.Place)
            .Must(Present).WithErrorCode(EventFieldCodes.PlaceRequired).WithMessage("Say where it happens")
            .Must(place => place.Trim().Length <= Event.PlaceMaxLength).WithErrorCode(EventFieldCodes.PlaceTooLong).WithMessage("Use 200 characters or fewer");

        RuleFor(c => c.Area)
            .Must(Present).WithErrorCode(EventFieldCodes.AreaRequired).WithMessage("Give the neighbourhood and city")
            .Must(area => area.Trim().Length <= Event.AreaMaxLength).WithErrorCode(EventFieldCodes.AreaTooLong).WithMessage("Use 100 characters or fewer");
    }

    private static bool Present(string? value) => !string.IsNullOrWhiteSpace(value);
}
