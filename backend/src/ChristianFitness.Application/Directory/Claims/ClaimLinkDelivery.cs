using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Chat;
using ChristianFitness.Application.Directory.Review;
using ChristianFitness.Application.Email;
using ChristianFitness.Application.Services;
using ChristianFitness.Domain.Directory;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Directory.Claims;

/// <summary>
/// How a claim link reaches the listed party (ADR 0090, ADR 0091), shared by approval and by Send a
/// new link: by email to the suggestion's contact address, else by direct message to a sender who
/// suggested themselves, else not at all (the listing is staff-managed).
/// </summary>
internal static class ClaimLinkDelivery
{
    public const string ByEmail = "email";
    public const string ByMessage = "message";

    /// <summary><see cref="ByEmail"/>, <see cref="ByMessage"/>, or none when there is nobody to send a link to.</summary>
    public static string? ChannelOf(ListingSuggestion suggestion) =>
        suggestion.ContactEmail is not null ? ByEmail
        : suggestion.Relation == SuggestionRelation.Myself ? ByMessage
        : null;

    /// <summary>
    /// Adds a new claim of <paramref name="listingId"/> issued at <paramref name="now"/> and, for a self-submitter,
    /// the direct message that carries it. For an email the message to send after the save is answered.
    /// </summary>
    public static async Task<EmailMessage?> IssueAsync(
        IAppDbContext db,
        SystemMessages messages,
        MemberAppAddress app,
        ListingSuggestion suggestion,
        Guid listingId,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        var (claim, token) = ListingClaim.Issue(listingId, now);
        db.ListingClaims.Add(claim);
        var link = app.ClaimLink(token);
        if (suggestion.ContactEmail is not null)
        {
            return new EmailMessage(suggestion.ContactEmail, SuggestionOutcome.ClaimSubject, SuggestionOutcome.ClaimEmail(suggestion.Name, link));
        }

        await messages.AddAsync(suggestion.SuggestedById, SuggestionOutcome.ClaimMessage(suggestion.Name, link), cancellationToken).ConfigureAwait(false);
        return null;
    }

    /// <summary>
    /// Where the claim of an approved suggestion stands for staff (ADR 0091): <c>staff-managed</c> with
    /// no link, <c>claimed</c> or <c>declined</c> once answered, else <c>sent</c> while a link is open and
    /// <c>expired</c> when none is. None before approval.
    /// </summary>
    public static async Task<string?> StateOfAsync(IAppDbContext db, ListingSuggestion suggestion, DateTimeOffset now, CancellationToken cancellationToken)
    {
        if (suggestion.Status != SuggestionStatus.Approved || suggestion.ListingId is not Guid listingId)
        {
            return null;
        }

        var claims = await db.ListingClaims.AsNoTracking().Where(c => c.ListingId == listingId).ToListAsync(cancellationToken).ConfigureAwait(false);
        if (claims.Count == 0)
        {
            return "staff-managed";
        }

        if (claims.Any(c => c.UsedAt is not null))
        {
            var status = await db.DirectoryListings.AsNoTracking().Where(l => l.Id == listingId).Select(l => l.Status).SingleAsync(cancellationToken).ConfigureAwait(false);
            return status == ListingStatus.Declined ? "declined" : "claimed";
        }

        return claims.Any(c => c.StateAt(now) == ClaimLinkState.Open) ? "sent" : "expired";
    }
}
