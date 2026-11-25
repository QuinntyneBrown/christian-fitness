using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Audit;
using ChristianFitness.Application.Errors;
using ChristianFitness.Application.Events;
using ChristianFitness.Domain.Directory;
using FluentValidation;
using FluentValidation.Results;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Directory.Review;

/// <summary>
/// A published listing as Listed shows it and its editor starts from (L2-073 AC10, AC13; ADR 0087):
/// kind as ADR 0082's slug, about, website and photo key, the Verified mark and its followers (0
/// until journey 8 lets members follow).
/// </summary>
public sealed record ListedListingDto(
    Guid Id, string Kind, string Name, string Area, string Tagline, string About, string? Website, string? PhotoKey, bool Verified, int Followers);

/// <summary>A page of Listed: how many are published, up to 50 in name order, and the id to read on from, or none.</summary>
public sealed record ListedListingsDto(int Total, IReadOnlyList<ListedListingDto> Listings, Guid? Next);

/// <summary>Staff list the published listings after the one <see cref="After"/> names, or from the first (L2-073 AC10).</summary>
public sealed record ListListedListingsQuery(Guid? After) : IRequest<ListedListingsDto>;

/// <summary>
/// Staff change a listing's name, kind, area, tagline, about, website and photo, never its Verified
/// mark (L2-073 AC13, L2-079 AC8). Audited <c>listing.updated</c>.
/// </summary>
public sealed record UpdateDirectoryListingCommand(
    Guid Id, string? Name, string? Kind, string? Area, string? Tagline, string? About, string? Website, string? PhotoKey)
    : IRequest<ListedListingDto>, IAuditableCommand
{
    string IAuditableCommand.AuditAction => "listing.updated";
}

/// <summary>The key an uploaded listing photo is kept under (ADR 0087).</summary>
public sealed record ListingPhotoDto(string PhotoKey);

/// <summary>
/// Stores one listing photo, judged by its first bytes as an event image is (ADR 0025): a JPEG, PNG
/// or WebP of up to 5 MB. Audited <c>listing_photo.uploaded</c> against the key's GUID.
/// </summary>
public sealed class UploadListingPhotoCommand(Stream content, long length) : IRequest<ListingPhotoDto>, IAuditableCommand
{
    public const string RecordType = "ListingPhoto";

    string IAuditableCommand.AuditAction => "listing_photo.uploaded";

    public Stream Content { get; } = content;

    public long Length { get; } = length;
}

/// <summary>A listing's photo, for anyone. A key that names nothing is 404 <c>not_found</c>.</summary>
public sealed record GetListingPhotoQuery(string Key) : IRequest<StoredImage>;

/// <summary>The staff listing editor's limits and field codes, named in the refusal's <c>fieldCodes</c> (ADR 0087).</summary>
public static class DirectoryListingRules
{
    public const int TaglineMaxLength = 100;
    public const int AboutMaxLength = 1000;
    public const string KindInvalid = "kind_invalid";
    public const string WebsiteInvalid = "website_invalid";
    public const string WebsiteTooLong = "website_too_long";
    public const string PhotoInvalid = "photo_invalid";

    public static readonly IReadOnlySet<string> FieldCodes = new HashSet<string>(StringComparer.Ordinal)
    {
        "name_required", "name_too_long", KindInvalid, "area_required", "area_too_long", "tagline_too_long", "about_too_long",
        WebsiteInvalid, WebsiteTooLong, PhotoInvalid,
    };
}

internal sealed class ListListedListingsHandler(IAppDbContext db) : IRequestHandler<ListListedListingsQuery, ListedListingsDto>
{
    private const int PageSize = 50;

    public async Task<ListedListingsDto> Handle(ListListedListingsQuery request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var published = db.DirectoryListings.AsNoTracking().Where(l => l.Status == ListingStatus.Published);
        var total = await published.CountAsync(cancellationToken).ConfigureAwait(false);
        var shown = published;
        if (request.After is { } after
            && await published.Where(l => l.Id == after).Select(l => new { l.NameKey }).SingleOrDefaultAsync(cancellationToken).ConfigureAwait(false) is { } cut)
        {
            shown = shown.Where(l => l.NameKey.CompareTo(cut.NameKey) > 0 || (l.NameKey == cut.NameKey && l.Id.CompareTo(after) > 0));
        }

        var page = await shown
            .OrderBy(l => l.NameKey).ThenBy(l => l.Id)
            .Take(PageSize + 1)
            .ToListAsync(cancellationToken).ConfigureAwait(false);
        var rows = page.Take(PageSize).Select(ListedListing.Of).ToList();
        return new ListedListingsDto(total, rows, page.Count > PageSize ? rows[^1].Id : null);
    }
}

/// <summary>A listing as Listed shows it.</summary>
internal static class ListedListing
{
    public const string RecordType = "DirectoryListing";

    public static ListedListingDto Of(DirectoryListing listing) => new(
        listing.Id, ListingKinds.SlugOf(listing.Kind), listing.Name, listing.Area, listing.Tagline, listing.Description,
        listing.WebsiteUrl, listing.PhotoKey, listing.IsVerified, 0);
}

/// <summary>Each field's rule; the sentences never repeat a value (ADR 0087).</summary>
internal sealed class UpdateDirectoryListingValidator : AbstractValidator<UpdateDirectoryListingCommand>
{
    public UpdateDirectoryListingValidator(IImageStore images)
    {
        RuleLevelCascadeMode = CascadeMode.Stop;
        RuleFor(c => c.Name)
            .Must(name => !string.IsNullOrWhiteSpace(name)).WithErrorCode("name_required").WithMessage("Give the listing a name members will recognize")
            .Must(name => name!.Trim().Length <= DirectoryListing.NameMaxLength).WithErrorCode("name_too_long").WithMessage("Use 120 characters or fewer");
        RuleFor(c => c.Kind)
            .Must(kind => ListingKinds.KindOf(kind) is not null).WithErrorCode(DirectoryListingRules.KindInvalid).WithMessage("Choose a kind from the list");
        RuleFor(c => c.Area)
            .Must(area => !string.IsNullOrWhiteSpace(area)).WithErrorCode("area_required").WithMessage("Enter a neighbourhood or city")
            .Must(area => area!.Trim().Length <= DirectoryListing.AreaMaxLength).WithErrorCode("area_too_long").WithMessage("Use 120 characters or fewer");
        RuleFor(c => c.Tagline)
            .Must(tagline => (tagline ?? string.Empty).Trim().Length <= DirectoryListingRules.TaglineMaxLength)
            .WithErrorCode("tagline_too_long").WithMessage("Use 100 characters or fewer");
        RuleFor(c => c.About)
            .Must(about => (about ?? string.Empty).Trim().Length <= DirectoryListingRules.AboutMaxLength)
            .WithErrorCode("about_too_long").WithMessage("Use 1,000 characters or fewer");
        RuleFor(c => c.Website)
            .Must(website => !ListingSuggestion.IsWebsiteTooLong(website)).WithErrorCode(DirectoryListingRules.WebsiteTooLong).WithMessage("Use 200 characters or fewer")
            .Must(website => ListingSuggestion.TryReadWebsite(website, out _)).WithErrorCode(DirectoryListingRules.WebsiteInvalid).WithMessage("Enter a web address like lakeshorerunners.ca");
        RuleFor(c => c.PhotoKey)
            .MustAsync(async (key, cancellationToken) => ImageKeys.IsKey(key) && await images.ExistsAsync(key!, cancellationToken).ConfigureAwait(false))
            .When(c => c.PhotoKey is not null)
            .WithErrorCode(DirectoryListingRules.PhotoInvalid).WithMessage("Choose the image again");
    }
}

/// <summary>Saves the staff editor's fields; an unknown listing is 404 <c>not_found</c>. Logs nothing.</summary>
internal sealed class UpdateDirectoryListingHandler(IAppDbContext db, ICurrentMember current, AuditTrail audit)
    : IRequestHandler<UpdateDirectoryListingCommand, ListedListingDto>
{
    public async Task<ListedListingDto> Handle(UpdateDirectoryListingCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var listing = await db.DirectoryListings.SingleOrDefaultAsync(l => l.Id == request.Id, cancellationToken).ConfigureAwait(false)
            ?? throw new RefusalException(RefusalCodes.NotFound, RefusalKind.NotFound);
        ListingSuggestion.TryReadWebsite(request.Website, out var website);
        listing.Describe(
            ListingKinds.KindOf(request.Kind)!.Value, request.Name!, request.Tagline ?? string.Empty, request.Area!, listing.Focus,
            request.About ?? string.Empty, website);
        listing.ShowPhoto(request.PhotoKey);
        audit.Record(current.Id, ListedListing.RecordType, listing.Id);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return ListedListing.Of(listing);
    }
}

internal sealed class UploadListingPhotoHandler(IImageStore store, ICurrentMember current, AuditTrail audit)
    : IRequestHandler<UploadListingPhotoCommand, ListingPhotoDto>
{
    public async Task<ListingPhotoDto> Handle(UploadListingPhotoCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        if (request.Length is <= 0 or > ImageKeys.MaxBytes)
        {
            throw Refused();
        }

        var content = new byte[request.Length];
        await request.Content.ReadExactlyAsync(content, cancellationToken).ConfigureAwait(false);
        var kind = ImageKeys.Detect(content) ?? throw Refused();
        var key = ImageKeys.NewKey(kind.Extension);
        await store.SaveAsync(key, content, cancellationToken).ConfigureAwait(false);
        audit.Record(current.Id, UploadListingPhotoCommand.RecordType, Guid.ParseExact(key[..32], "N"));
        return new ListingPhotoDto(key);
    }

    private static ValidationException Refused() =>
        new([new ValidationFailure("Photo", "Use a JPEG, PNG or WebP image up to 5 MB") { ErrorCode = DirectoryListingRules.PhotoInvalid }]);
}

internal sealed class GetListingPhotoHandler(IImageStore store) : IRequestHandler<GetListingPhotoQuery, StoredImage>
{
    public async Task<StoredImage> Handle(GetListingPhotoQuery request, CancellationToken cancellationToken) =>
        (ImageKeys.IsKey(request.Key) ? await store.OpenAsync(request.Key, cancellationToken).ConfigureAwait(false) : null)
            ?? throw new RefusalException(RefusalCodes.NotFound, RefusalKind.NotFound);
}
