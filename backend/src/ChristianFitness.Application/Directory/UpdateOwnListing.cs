using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Account;
using ChristianFitness.Application.Audit;
using ChristianFitness.Application.Directory.Review;
using ChristianFitness.Application.Errors;
using ChristianFitness.Application.Events;
using ChristianFitness.Domain.Directory;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Directory;

/// <summary>
/// What the owner's save answers (L2-079 AC4, AC5; ADR 0093): the listing as now saved, and whether
/// a new name or kind waits for staff after it.
/// </summary>
public sealed record OwnListingSavedDto(bool NameChangePending, ListingProfileDto Listing);

/// <summary>
/// The owner saves their listing (L2-079; ADR 0093): about, website, photo, focus tags and contact
/// go live at once; a new name or kind waits for staff. A class, so no generated <c>ToString</c>
/// prints the contact email, the about or the website. Audited <c>listing.edited</c>.
/// </summary>
public sealed class UpdateOwnListingCommand(
    Guid id, string? name, string? kind, string? about, string? website, string? photoKey, IReadOnlyList<string>? focus, string? contactEmail)
    : IRequest<OwnListingSavedDto>, IAuditableCommand
{
    string IAuditableCommand.AuditAction => "listing.edited";

    public Guid Id { get; } = id;

    public string? Name { get; } = name;

    public string? Kind { get; } = kind;

    public string? About { get; } = about;

    public string? Website { get; } = website;

    public string? PhotoKey { get; } = photoKey;

    public IReadOnlyList<string>? Focus { get; } = focus;

    public string? ContactEmail { get; } = contactEmail;
}

/// <summary>The owner's editor's limits and field codes beyond the staff editor's (ADR 0093).</summary>
public static class OwnListingRules
{
    public const int FocusMaxCount = 6;
    public const string FocusTooMany = "focus_too_many";
    public const string FocusTooLong = "focus_too_long";
    public const string ContactInvalid = "contact_invalid";
    public const string ContactTooLong = "contact_too_long";

    public static readonly IReadOnlySet<string> FieldCodes = new HashSet<string>(StringComparer.Ordinal)
    {
        FocusTooMany, FocusTooLong, ContactInvalid, ContactTooLong,
    };

    /// <summary>The tags as stored: trimmed, blanks dropped.</summary>
    public static IReadOnlyList<string> TagsOf(IEnumerable<string?>? focus) =>
        [.. (focus ?? []).Select(tag => (tag ?? string.Empty).Trim()).Where(tag => tag.Length > 0)];
}

/// <summary>Each field's rule; the sentences never repeat a value (ADR 0093).</summary>
internal sealed class UpdateOwnListingValidator : AbstractValidator<UpdateOwnListingCommand>
{
    public UpdateOwnListingValidator(IImageStore images)
    {
        RuleLevelCascadeMode = CascadeMode.Stop;
        RuleFor(c => c.Name)
            .Must(name => !string.IsNullOrWhiteSpace(name)).WithErrorCode("name_required").WithMessage("Give the listing a name members will recognize")
            .Must(name => name!.Trim().Length <= DirectoryListing.NameMaxLength).WithErrorCode("name_too_long").WithMessage("Use 120 characters or fewer");
        RuleFor(c => c.Kind)
            .Must(kind => ListingKinds.KindOf(kind) is not null).WithErrorCode(DirectoryListingRules.KindInvalid).WithMessage("Choose a kind from the list");
        RuleFor(c => c.About)
            .Must(about => (about ?? string.Empty).Trim().Length <= DirectoryListingRules.AboutMaxLength)
            .WithErrorCode("about_too_long").WithMessage("Use 1,000 characters or fewer");
        RuleFor(c => c.Website)
            .Must(website => !ListingSuggestion.IsWebsiteTooLong(website)).WithErrorCode(DirectoryListingRules.WebsiteTooLong).WithMessage("Use 200 characters or fewer")
            .Must(website => ListingSuggestion.TryReadWebsite(website, out _)).WithErrorCode(DirectoryListingRules.WebsiteInvalid).WithMessage("Enter a web address like eastsideladies.ca");
        RuleFor(c => c.PhotoKey)
            .MustAsync(async (key, cancellationToken) => ImageKeys.IsKey(key) && await images.ExistsAsync(key!, cancellationToken).ConfigureAwait(false))
            .When(c => c.PhotoKey is not null)
            .WithErrorCode(DirectoryListingRules.PhotoInvalid).WithMessage("Choose the photo again");
        RuleFor(c => c.Focus)
            .Must(focus => OwnListingRules.TagsOf(focus).Count <= OwnListingRules.FocusMaxCount)
            .WithErrorCode(OwnListingRules.FocusTooMany).WithMessage("Use 6 tags or fewer")
            .Must(focus => OwnListingRules.TagsOf(focus).All(tag => tag.Length <= DirectoryListing.FocusTagMaxLength))
            .WithErrorCode(OwnListingRules.FocusTooLong).WithMessage("Keep each tag to 40 characters or fewer");
        RuleFor(c => c.ContactEmail)
            .Must(email => (email ?? string.Empty).Trim().Length <= DirectoryListing.ContactEmailMaxLength)
            .WithErrorCode(OwnListingRules.ContactTooLong).WithMessage("Use 254 characters or fewer")
            .Must(email => string.IsNullOrWhiteSpace(email) || CreateAccountValidator.EmailPattern().IsMatch(email.Trim()))
            .WithErrorCode(OwnListingRules.ContactInvalid).WithMessage(CreateAccountValidator.EmailInvalid);
    }
}

/// <summary>
/// Saves the owner's changes. Anything but a published listing is 404 <c>listing_not_found</c>; a
/// caller who does not own it is 403 <c>not_listing_owner</c>. Logs nothing.
/// </summary>
internal sealed class UpdateOwnListingHandler(IAppDbContext db, ICurrentMember current, AuditTrail audit, TimeProvider time)
    : IRequestHandler<UpdateOwnListingCommand, OwnListingSavedDto>
{
    public async Task<OwnListingSavedDto> Handle(UpdateOwnListingCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var listing = await db.DirectoryListings
            .SingleOrDefaultAsync(l => l.Id == request.Id && l.Status == ListingStatus.Published, cancellationToken)
            .ConfigureAwait(false)
            ?? throw new RefusalException(RefusalCodes.ListingNotFound, RefusalKind.NotFound);
        if (listing.MemberId != current.Id)
        {
            throw new RefusalException(RefusalCodes.NotListingOwner, RefusalKind.Forbidden);
        }

        ListingSuggestion.TryReadWebsite(request.Website, out var website);
        listing.EditByOwner(request.About ?? string.Empty, website, OwnListingRules.TagsOf(request.Focus), request.ContactEmail);
        listing.ShowPhoto(request.PhotoKey);
        audit.Record(current.Id, ListedListing.RecordType, listing.Id);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        var saved = await ListingProfile.OfAsync(db, current.Id, time.GetUtcNow(), listing, cancellationToken).ConfigureAwait(false);
        return new OwnListingSavedDto(listing.PendingName is not null || listing.PendingKind is not null, saved);
    }
}
