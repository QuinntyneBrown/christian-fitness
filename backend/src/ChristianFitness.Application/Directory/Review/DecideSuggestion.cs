using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Audit;
using ChristianFitness.Application.Chat;
using ChristianFitness.Application.Email;
using ChristianFitness.Application.Errors;
using ChristianFitness.Application.Services;
using ChristianFitness.Domain.Directory;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Directory.Review;

/// <summary>
/// What a decision answers (ADR 0087): the status, the draft listing approval made, and how the
/// claim went (<c>email</c>, <c>message</c> or <c>staff-managed</c>); none for a decline.
/// </summary>
public sealed record SuggestionDecisionDto(string Status, Guid? ListingId, string? Claim);

/// <summary>Staff approve the suggestion <see cref="SuggestionId"/> (L2-073 AC6). Audited <c>suggestion.approved</c>.</summary>
public sealed record ApproveSuggestionCommand(Guid SuggestionId) : IRequest<SuggestionDecisionDto>, IAuditableCommand
{
    string IAuditableCommand.AuditAction => "suggestion.approved";
}

/// <summary>
/// Staff decline the suggestion <see cref="SuggestionId"/> with an optional <see cref="Reason"/> of at
/// most 500 characters kept for staff (L2-073 AC8). Audited <c>suggestion.declined</c>.
/// </summary>
public sealed record DeclineSuggestionCommand(Guid SuggestionId, string? Reason) : IRequest<SuggestionDecisionDto>, IAuditableCommand
{
    string IAuditableCommand.AuditAction => "suggestion.declined";
}

/// <summary>A reason over 500 characters is <c>reason_too_long</c>, named in <c>fieldCodes</c>; the sentence never repeats it.</summary>
internal sealed class DeclineSuggestionValidator : AbstractValidator<DeclineSuggestionCommand>
{
    public DeclineSuggestionValidator() =>
        RuleFor(c => c.Reason)
            .Must(reason => reason is null || reason.Trim().Length <= ListingSuggestion.DeclineReasonMaxLength)
            .WithErrorCode(DecideApplicationRules.ReasonTooLong).WithMessage("Use 500 characters or fewer");
}

/// <summary>The texts the Christian Fitness account and the claim email send (ADR 0065, ADR 0087).</summary>
public static class SuggestionOutcome
{
    public const string ClaimSubject = "Claim your listing on Christian Fitness";

    public static string Approved(string listing) => $"Thanks for suggesting {listing}. It's now in the directory.";

    public static string Declined(string listing) => $"Thanks for suggesting {listing}. We won't be adding it this time.";

    public static string ClaimMessage(string listing, string link) =>
        $"{listing} was suggested for the Christian Fitness directory. Claim and publish it here: {link}. The link works for {(int)ListingClaim.Lifetime.TotalDays} days.";

    public static string ClaimEmail(string listing, string link) => $"""
        Hello,

        {listing} was suggested for the Christian Fitness directory, and our team has checked it. Claim and publish your listing with this link:

        {link}

        The link works once, for {(int)ListingClaim.Lifetime.TotalDays} days. Nothing is published until you say yes. If this isn't you, ignore this email.

        Christian Fitness
        """;
}

/// <summary>
/// Approves a waiting suggestion whose four checks passed, in one unit of work: the draft listing,
/// the sender's message and the claim (L2-078 AC1 to AC3); the claim email and the messages go out
/// after the save. Fewer than four checks is 409 <c>checks_incomplete</c>; a decided suggestion 409
/// <c>suggestion_decided</c>. Logs nothing (L2-073 AC12).
/// </summary>
internal sealed class ApproveSuggestionHandler(
    IAppDbContext db,
    ICurrentMember current,
    AuditTrail audit,
    SystemMessages messages,
    IEmailSender email,
    MemberAppAddress app,
    TimeProvider time)
    : IRequestHandler<ApproveSuggestionCommand, SuggestionDecisionDto>
{
    public async Task<SuggestionDecisionDto> Handle(ApproveSuggestionCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var suggestion = await SuggestionReview.FindAsync(db, request.SuggestionId, cancellationToken).ConfigureAwait(false);
        if (suggestion.Status != SuggestionStatus.Waiting)
        {
            throw SuggestionReview.Decided();
        }

        var passed = await db.SuggestionChecks.CountAsync(c => c.SuggestionId == suggestion.Id && c.Passed, cancellationToken).ConfigureAwait(false);
        if (passed < Enum.GetValues<ListingCheck>().Length)
        {
            throw new RefusalException(RefusalCodes.ChecksIncomplete, RefusalKind.Conflict);
        }

        var now = time.GetUtcNow();
        var listing = DirectoryListing.CreateDraft(Guid.CreateVersion7(now), suggestion.Kind, suggestion.Name, string.Empty, suggestion.Where, [], now, websiteUrl: suggestion.Website);
        listing.MadeFrom(suggestion.Id);
        suggestion.TryApprove(current.Id, now, listing.Id);
        db.DirectoryListings.Add(listing);
        await messages.AddAsync(suggestion.SuggestedById, SuggestionOutcome.Approved(suggestion.Name), cancellationToken).ConfigureAwait(false);

        string claim;
        string? emailLink = null;
        if (suggestion.ContactEmail is not null || suggestion.Relation == SuggestionRelation.Myself)
        {
            var (issued, token) = ListingClaim.Issue(listing.Id, now);
            db.ListingClaims.Add(issued);
            var link = app.ClaimLink(token);
            if (suggestion.ContactEmail is not null)
            {
                claim = "email";
                emailLink = link;
            }
            else
            {
                claim = "message";
                await messages.AddAsync(suggestion.SuggestedById, SuggestionOutcome.ClaimMessage(suggestion.Name, link), cancellationToken).ConfigureAwait(false);
            }
        }
        else
        {
            claim = "staff-managed";
            listing.Publish(now);
        }

        audit.Record(current.Id, SuggestionReview.RecordType, suggestion.Id);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        await messages.PushAsync(cancellationToken).ConfigureAwait(false);
        if (emailLink is not null)
        {
            await email.SendAsync(new EmailMessage(suggestion.ContactEmail!, SuggestionOutcome.ClaimSubject, SuggestionOutcome.ClaimEmail(suggestion.Name, emailLink)), cancellationToken)
                .ConfigureAwait(false);
        }

        return new SuggestionDecisionDto("approved", listing.Id, claim);
    }
}

/// <summary>
/// Declines a waiting suggestion and tells the sender (L2-073 AC8); the suggested party is not
/// contacted. A decided suggestion is 409 <c>suggestion_decided</c>. Logs nothing (L2-073 AC12).
/// </summary>
internal sealed class DeclineSuggestionHandler(IAppDbContext db, ICurrentMember current, AuditTrail audit, SystemMessages messages, TimeProvider time)
    : IRequestHandler<DeclineSuggestionCommand, SuggestionDecisionDto>
{
    public async Task<SuggestionDecisionDto> Handle(DeclineSuggestionCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var suggestion = await SuggestionReview.FindAsync(db, request.SuggestionId, cancellationToken).ConfigureAwait(false);
        if (!suggestion.TryDecline(current.Id, time.GetUtcNow(), request.Reason))
        {
            throw SuggestionReview.Decided();
        }

        await messages.AddAsync(suggestion.SuggestedById, SuggestionOutcome.Declined(suggestion.Name), cancellationToken).ConfigureAwait(false);
        audit.Record(current.Id, SuggestionReview.RecordType, suggestion.Id);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        await messages.PushAsync(cancellationToken).ConfigureAwait(false);
        return new SuggestionDecisionDto("declined", null, null);
    }
}
