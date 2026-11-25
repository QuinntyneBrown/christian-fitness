using System.Linq.Expressions;
using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Account;
using ChristianFitness.Application.Errors;
using ChristianFitness.Domain.Directory;
using ChristianFitness.Domain.Members;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Directory;

/// <summary>The stored suggestion as the API answers it: its id and whom it names (ADR 0086).</summary>
public sealed record ListingSuggestionDto(Guid Id, string Name);

/// <summary>
/// The signed-in member's suggestion for the directory (L2-062; ADR 0086), the body of
/// <c>POST /api/directory/suggestions</c>. A class, not a record, so no generated <c>ToString</c>
/// can print the values if one is logged.
/// </summary>
public sealed class SuggestListingCommand : IRequest<ListingSuggestionDto>
{
    /// <summary><c>myself</c>, <c>someone-i-know</c> or <c>somewhere-ive-been</c>.</summary>
    public string? Relation { get; init; }

    /// <summary>The ADR 0082 slug of the kind.</summary>
    public string? Kind { get; init; }

    public string? Name { get; init; }

    public string? Where { get; init; }

    public string? Website { get; init; }

    public string? ChurchConnection { get; init; }

    public string? Reason { get; init; }

    /// <summary>The suggested party's email; ignored for Myself.</summary>
    public string? Email { get; init; }

    /// <summary>Whether staff may tell them who suggested them; ignored for Myself.</summary>
    public bool MayTellWhoSuggested { get; init; }
}

/// <summary>The relation slugs and the field codes a suggestion is refused with (ADR 0086).</summary>
public static class SuggestListingRules
{
    public const string RelationInvalid = "relation_invalid";
    public const string NameRequired = "name_required";
    public const string NameTooLong = "name_too_long";
    public const string WhereRequired = "where_required";
    public const string WhereTooLong = "where_too_long";
    public const string WebsiteTooLong = "website_too_long";
    public const string WebsiteInvalid = "website_invalid";
    public const string ChurchConnectionTooLong = "church_connection_too_long";
    public const string ReasonTooLong = "reason_too_long";
    public const string EmailTooLong = "email_too_long";
    public const string EmailInvalid = "email_invalid";

    public static readonly IReadOnlySet<string> FieldCodes = new HashSet<string>(StringComparer.Ordinal)
    {
        RelationInvalid, NameRequired, NameTooLong, WhereRequired, WhereTooLong, WebsiteTooLong, WebsiteInvalid,
        ChurchConnectionTooLong, ReasonTooLong, EmailTooLong, EmailInvalid,
    };

    private static readonly Dictionary<string, SuggestionRelation> Relations = new(StringComparer.Ordinal)
    {
        ["myself"] = SuggestionRelation.Myself,
        ["someone-i-know"] = SuggestionRelation.SomeoneIKnow,
        ["somewhere-ive-been"] = SuggestionRelation.SomewhereIveBeen,
    };

    /// <summary>The relation an exact slug names, or none.</summary>
    public static SuggestionRelation? RelationOf(string? slug) =>
        slug is not null && Relations.TryGetValue(slug, out var relation) ? relation : null;
}

/// <summary>The suggestion's field rules (L2-062 AC7; ADR 0086); the sentences never repeat a value.</summary>
internal sealed class SuggestListingValidator : AbstractValidator<SuggestListingCommand>
{
    public SuggestListingValidator()
    {
        RuleLevelCascadeMode = CascadeMode.Stop;
        RuleFor(c => c.Relation)
            .Must(relation => SuggestListingRules.RelationOf(relation) is not null)
            .WithErrorCode(SuggestListingRules.RelationInvalid).WithMessage("Choose who you are suggesting");
        RuleFor(c => c.Kind)
            .Must(kind => ListingKinds.KindOf(kind) is not null)
            .WithErrorCode(ListDirectoryRules.KindInvalid).WithMessage("Choose a kind of listing");
        Required(c => c.Name, SuggestListingRules.NameRequired, "Add a name so we know who to look up.", SuggestListingRules.NameTooLong, ListingSuggestion.NameMaxLength);
        Required(c => c.Where, SuggestListingRules.WhereRequired, "Add where they meet or work.", SuggestListingRules.WhereTooLong, ListingSuggestion.WhereMaxLength);
        RuleFor(c => c.Website)
            .Must(website => !ListingSuggestion.IsWebsiteTooLong(website))
            .WithErrorCode(SuggestListingRules.WebsiteTooLong).WithMessage($"Use {ListingSuggestion.WebsiteMaxLength} characters or fewer")
            .Must(website => ListingSuggestion.TryReadWebsite(website, out _))
            .WithErrorCode(SuggestListingRules.WebsiteInvalid).WithMessage("Enter a web address that starts with https://, or leave it empty");
        Optional(c => c.ChurchConnection, SuggestListingRules.ChurchConnectionTooLong, ListingSuggestion.ChurchConnectionMaxLength);
        Optional(c => c.Reason, SuggestListingRules.ReasonTooLong, ListingSuggestion.ReasonMaxLength);
        RuleFor(c => c.Email)
            .Must(email => email is null || email.Trim().Length <= ListingSuggestion.ContactEmailMaxLength)
            .WithErrorCode(SuggestListingRules.EmailTooLong).WithMessage($"Use {ListingSuggestion.ContactEmailMaxLength} characters or fewer")
            .Must(email => string.IsNullOrWhiteSpace(email) || CreateAccountValidator.EmailPattern().IsMatch(email.Trim()))
            .WithErrorCode(SuggestListingRules.EmailInvalid).WithMessage(CreateAccountValidator.EmailInvalid)
            .When(c => SuggestListingRules.RelationOf(c.Relation) != SuggestionRelation.Myself);
    }

    private void Required(Expression<Func<SuggestListingCommand, string?>> property, string requiredCode, string required, string tooLongCode, int max) =>
        RuleFor(property)
            .Must(text => !string.IsNullOrWhiteSpace(text)).WithErrorCode(requiredCode).WithMessage(required)
            .Must(text => text!.Trim().Length <= max).WithErrorCode(tooLongCode).WithMessage($"Use {max} characters or fewer");

    private void Optional(Expression<Func<SuggestListingCommand, string?>> property, string tooLongCode, int max) =>
        RuleFor(property)
            .Must(text => text is null || text.Trim().Length <= max).WithErrorCode(tooLongCode).WithMessage($"Use {max:N0} characters or fewer");
}

/// <summary>
/// Stores a Waiting suggestion with the signed-in member and the time (L2-062 AC5; ADR 0086). A
/// suspended member is refused 403 <c>account_suspended</c> (AC11); a sixth suggestion within a
/// rolling 24 hours is refused 429 <c>too_many_attempts</c> (AC8). It logs nothing (AC10, L2-033).
/// </summary>
internal sealed class SuggestListingHandler(IAppDbContext db, ICurrentMember current, TimeProvider time)
    : IRequestHandler<SuggestListingCommand, ListingSuggestionDto>
{
    public async Task<ListingSuggestionDto> Handle(SuggestListingCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var id = current.Id;
        var status = await db.Members.AsNoTracking().Where(m => m.Id == id).Select(m => m.Status).SingleAsync(cancellationToken).ConfigureAwait(false);
        if (status == MemberStatus.Suspended)
        {
            throw new RefusalException(RefusalCodes.AccountSuspended, RefusalKind.Forbidden);
        }

        var now = time.GetUtcNow();
        var since = ListingSuggestion.DailyWindow.Since(now);
        var sent = await db.ListingSuggestions.CountAsync(s => s.SuggestedById == id && s.SubmittedAt > since, cancellationToken).ConfigureAwait(false);
        if (ListingSuggestion.DailyWindow.IsFull(sent))
        {
            throw new RefusalException(RefusalCodes.TooManyAttempts, RefusalKind.TooManyRequests);
        }

        var suggestion = ListingSuggestion.Submit(
            id,
            SuggestListingRules.RelationOf(request.Relation)!.Value,
            ListingKinds.KindOf(request.Kind)!.Value,
            request.Name!,
            request.Where!,
            request.Website,
            request.ChurchConnection,
            request.Reason,
            request.Email,
            request.MayTellWhoSuggested,
            now);
        db.ListingSuggestions.Add(suggestion);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return new ListingSuggestionDto(suggestion.Id, suggestion.Name);
    }
}
