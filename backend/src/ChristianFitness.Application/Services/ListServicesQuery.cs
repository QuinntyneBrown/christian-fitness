using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Errors;
using ChristianFitness.Domain.Services;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Services;

/// <summary>One published listing as a member browses it (L2-013 AC1, AC3; ADR 0050).</summary>
public sealed record ServiceListingDto(
    Guid Id, string Name, string Role, string Category, string Where, string Price, string Credentials, string About, DateTimeOffset PublishedAt, bool HasContactLink);

/// <summary>The published listings, at most <see cref="ListServicesQuery.Limit"/>, and how many match in all (ADR 0050).</summary>
public sealed record ServiceListingsDto(int Total, IReadOnlyList<ServiceListingDto> Services);

/// <summary>Lists the published listings, of one category when <paramref name="Category"/> names it (L2-013 AC1, AC2; ADR 0050).</summary>
public sealed record ListServicesQuery(string? Category = null) : IRequest<ServiceListingsDto>
{
    public const int Limit = 50;
}

/// <summary>The code a category this API does not know is refused with (L2-013 AC2; ADR 0050).</summary>
public static class ListServicesRules
{
    public const string CategoryInvalid = "category_invalid";

    public static readonly IReadOnlySet<string> FieldCodes = new HashSet<string>(StringComparer.Ordinal) { CategoryInvalid };

    /// <summary>Reads a category by its exact name, as the list serves it; a number or another case is not one.</summary>
    public static bool TryCategory(string? text, out ServiceCategory category)
    {
        category = default;
        return text is not null && Enum.GetNames<ServiceCategory>().Contains(text, StringComparer.Ordinal) && Enum.TryParse(text, out category);
    }
}

/// <summary>A category this API does not know is refused with <c>category_invalid</c>.</summary>
public sealed class ListServicesValidator : AbstractValidator<ListServicesQuery>
{
    public ListServicesValidator() =>
        RuleFor(q => q.Category)
            .Must(category => category is null || ListServicesRules.TryCategory(category, out _))
            .WithMessage("Choose one of the categories")
            .WithErrorCode(ListServicesRules.CategoryInvalid);
}

internal sealed class ListServicesHandler(IAppDbContext db) : IRequestHandler<ListServicesQuery, ServiceListingsDto>
{
    public async Task<ServiceListingsDto> Handle(ListServicesQuery request, CancellationToken cancellationToken)
    {
        var listings = db.ServiceListings.AsNoTracking();
        if (ListServicesRules.TryCategory(request.Category, out var category))
        {
            listings = listings.Where(l => l.Category == category);
        }

        var total = await listings.CountAsync(cancellationToken).ConfigureAwait(false);
        var rows = await listings
            .OrderBy(l => l.Name)
            .ThenBy(l => l.Id)
            .Take(ListServicesQuery.Limit)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        return new ServiceListingsDto(
            total,
            [.. rows.Select(l => new ServiceListingDto(l.Id, l.Name, l.Role, l.Category.ToString(), l.Where, l.Price, l.Credentials, l.About, l.PublishedAt, l.ContactUrl != null))]);
    }
}

/// <summary>Opens one published listing; an unknown id is 404 <c>service_not_found</c> (L2-013 AC4; ADR 0051).</summary>
public sealed record GetServiceQuery(Guid Id) : IRequest<ServiceListingDto>;

internal sealed class GetServiceHandler(IAppDbContext db) : IRequestHandler<GetServiceQuery, ServiceListingDto>
{
    public async Task<ServiceListingDto> Handle(GetServiceQuery request, CancellationToken cancellationToken)
    {
        var l = await db.ServiceListings.AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == request.Id, cancellationToken)
            .ConfigureAwait(false)
            ?? throw new RefusalException(RefusalCodes.ServiceNotFound, RefusalKind.NotFound);
        return new ServiceListingDto(l.Id, l.Name, l.Role, l.Category.ToString(), l.Where, l.Price, l.Credentials, l.About, l.PublishedAt, l.ContactUrl != null);
    }
}
