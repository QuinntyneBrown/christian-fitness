using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Chat;
using ChristianFitness.Application.Errors;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Services;

/// <summary>The member the direct conversation is with: the key Messages opens it by (ADR 0043, 0000).</summary>
public sealed record ProfessionalConversationDto(Guid MemberId);

/// <summary>The professional's published contact link: an absolute http or https address (ADR 0053).</summary>
public sealed record ContactLinkDto(string Url);

/// <summary>
/// A member chooses Message on a listing (L2-014 AC1; ADR 0053): the answer names the professional the
/// listing was published for, whose direct conversation with the caller Messages opens. An unknown
/// listing is 404 <c>service_not_found</c>, a listing that publishes a contact link 409
/// <c>professional_not_linked</c>, and a suspended professional or the caller's own listing 403
/// <c>recipient_unavailable</c> as for any direct message. Nothing is stored: a conversation is the pair.
/// </summary>
public sealed record StartProfessionalConversationCommand(Guid ListingId) : IRequest<ProfessionalConversationDto>;

/// <summary>A member chooses Contact on a listing (L2-014 AC2; ADR 0053): 404 <c>service_not_found</c> or <c>contact_link_not_found</c> when there is none.</summary>
public sealed record GetContactLinkQuery(Guid ListingId) : IRequest<ContactLinkDto>;

internal sealed class StartProfessionalConversationHandler(IAppDbContext db, ICurrentMember current)
    : IRequestHandler<StartProfessionalConversationCommand, ProfessionalConversationDto>
{
    public async Task<ProfessionalConversationDto> Handle(StartProfessionalConversationCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var listing = await db.ServiceListings.AsNoTracking()
            .Where(l => l.Id == request.ListingId)
            .Select(l => new { l.MemberId, Linked = l.ContactUrl == null })
            .SingleOrDefaultAsync(cancellationToken)
            .ConfigureAwait(false)
            ?? throw new RefusalException(RefusalCodes.ServiceNotFound, RefusalKind.NotFound);
        if (!listing.Linked)
        {
            throw new RefusalException(RefusalCodes.ProfessionalNotLinked, RefusalKind.Conflict);
        }

        if (await DirectChat.OtherNameAsync(db, current.Id, listing.MemberId, cancellationToken).ConfigureAwait(false) is null)
        {
            throw DirectChat.Unavailable();
        }

        return new ProfessionalConversationDto(listing.MemberId);
    }
}

internal sealed class GetContactLinkHandler(IAppDbContext db) : IRequestHandler<GetContactLinkQuery, ContactLinkDto>
{
    public async Task<ContactLinkDto> Handle(GetContactLinkQuery request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var found = await db.ServiceListings.AsNoTracking()
            .Where(l => l.Id == request.ListingId)
            .Select(l => new { l.ContactUrl })
            .SingleOrDefaultAsync(cancellationToken)
            .ConfigureAwait(false)
            ?? throw new RefusalException(RefusalCodes.ServiceNotFound, RefusalKind.NotFound);
        return found.ContactUrl is { } url
            ? new ContactLinkDto(url)
            : throw new RefusalException(RefusalCodes.ContactLinkNotFound, RefusalKind.NotFound);
    }
}
