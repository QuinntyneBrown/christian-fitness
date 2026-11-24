using System.Linq.Expressions;
using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Audit;
using ChristianFitness.Application.Errors;
using ChristianFitness.Domain.Members;
using ChristianFitness.Domain.Services;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Services;

/// <summary>One live listing as staff read and edit it, with the contact link itself (L2-027 AC1; ADR 0054).</summary>
public sealed record AdminListingDto(
    Guid Id, string Name, string Role, string Category, string Where, string Price, string Credentials, string About, string? ContactUrl, DateTimeOffset PublishedAt);

/// <summary>The live listings, at most <see cref="ListAdminListingsQuery.Limit"/>, and how many exist in all (ADR 0054).</summary>
public sealed record AdminListingsDto(int Total, IReadOnlyList<AdminListingDto> Listings);

/// <summary>Lists the live listings for staff in name order.</summary>
public sealed record ListAdminListingsQuery : IRequest<AdminListingsDto>
{
    public const int Limit = 50;
}

internal static class ListingMap
{
    public static AdminListingDto ToDto(ServiceListing l) =>
        new(l.Id, l.Name, l.Role, l.Category.ToString(), l.Where, l.Price, l.Credentials, l.About, l.ContactUrl, l.PublishedAt);
}

internal sealed class ListAdminListingsHandler(IAppDbContext db) : IRequestHandler<ListAdminListingsQuery, AdminListingsDto>
{
    public async Task<AdminListingsDto> Handle(ListAdminListingsQuery request, CancellationToken cancellationToken)
    {
        var listings = db.ServiceListings.AsNoTracking();
        var total = await listings.CountAsync(cancellationToken).ConfigureAwait(false);
        var rows = await listings.OrderBy(l => l.Name).ThenBy(l => l.Id).Take(ListAdminListingsQuery.Limit).ToListAsync(cancellationToken).ConfigureAwait(false);
        return new AdminListingsDto(total, [.. rows.Select(ListingMap.ToDto)]);
    }
}

/// <summary>
/// Replaces every editable field of the live listing <see cref="Id"/> (L2-027 AC1; ADR 0054). A class, not a
/// record, so no generated <c>ToString</c> can print the values. Audited as <c>listing.updated</c>; the entry
/// keeps no field value.
/// </summary>
public sealed class UpdateListingCommand : IRequest<AdminListingDto>, IAuditableCommand
{
    string IAuditableCommand.AuditAction => "listing.updated";

    public Guid Id { get; init; }

    public string Name { get; init; } = string.Empty;

    public string Role { get; init; } = string.Empty;

    public string Category { get; init; } = string.Empty;

    public string Where { get; init; } = string.Empty;

    public string Price { get; init; } = string.Empty;

    public string Credentials { get; init; } = string.Empty;

    public string About { get; init; } = string.Empty;

    public string? ContactUrl { get; init; }
}

/// <summary>The field codes a listing edit is refused with, named in the <c>fieldCodes</c> of the refusal (ADR 0054); the sentences never repeat a value.</summary>
public static class EditListingRules
{
    public const string CategoryInvalid = "category_invalid";
    public const string ContactLinkInvalid = "contact_link_invalid";

    public static readonly IReadOnlySet<string> FieldCodes = new HashSet<string>(StringComparer.Ordinal)
    {
        "name_required", "name_too_long", "role_required", "role_too_long", CategoryInvalid, "where_required", "where_too_long",
        "price_required", "price_too_long", "credentials_required", "credentials_too_long", "about_required", "about_too_long", ContactLinkInvalid,
    };
}

internal sealed class UpdateListingValidator : AbstractValidator<UpdateListingCommand>
{
    public UpdateListingValidator()
    {
        RuleLevelCascadeMode = CascadeMode.Stop;
        Text(c => c.Name, "name", "Enter the name of the professional", Member.NameMaxLength);
        Text(c => c.Role, "role", "Enter a role, such as Personal trainer", ProfessionalApplication.RoleMaxLength);
        RuleFor(c => c.Category)
            .Must(category => ListServicesRules.TryCategory(category?.Trim(), out _))
            .WithErrorCode(EditListingRules.CategoryInvalid).WithMessage("Choose a category from the list");
        Text(c => c.Where, "where", "Enter where they work, such as Mississauga", ProfessionalApplication.WhereMaxLength);
        Text(c => c.Price, "price", "Enter a price, such as $70 / session", ProfessionalApplication.PriceMaxLength);
        Text(c => c.Credentials, "credentials", "Enter their credentials", ProfessionalApplication.CredentialsMaxLength);
        Text(c => c.About, "about", "Enter a short description", ProfessionalApplication.AboutMaxLength);
        RuleFor(c => c.ContactUrl)
            .Must(url => ServiceListing.TryNormalizeContactUrl(url, out _))
            .WithErrorCode(EditListingRules.ContactLinkInvalid).WithMessage("Enter an http or https address, or leave it empty");
    }

    private void Text(Expression<Func<UpdateListingCommand, string>> property, string field, string required, int max) =>
        RuleFor(property)
            .Must(text => !string.IsNullOrWhiteSpace(text)).WithErrorCode($"{field}_required").WithMessage(required)
            .Must(text => text.Trim().Length <= max).WithErrorCode($"{field}_too_long").WithMessage($"Use {max} characters or fewer");
}

internal sealed class UpdateListingHandler(IAppDbContext db, ICurrentMember current, AuditTrail audit)
    : IRequestHandler<UpdateListingCommand, AdminListingDto>
{
    public const string RecordType = "ServiceListing";

    public async Task<AdminListingDto> Handle(UpdateListingCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var listing = await db.ServiceListings.SingleOrDefaultAsync(l => l.Id == request.Id, cancellationToken).ConfigureAwait(false)
            ?? throw new RefusalException(RefusalCodes.ServiceNotFound, RefusalKind.NotFound);
        ListServicesRules.TryCategory(request.Category.Trim(), out var category);
        listing.Update(request.Name, request.Role, category, request.Where, request.Price, request.Credentials, request.About, request.ContactUrl);
        audit.Record(current.Id, RecordType, listing.Id);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return ListingMap.ToDto(listing);
    }
}
