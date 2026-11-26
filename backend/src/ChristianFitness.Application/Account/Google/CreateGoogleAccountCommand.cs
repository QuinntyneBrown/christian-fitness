using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Errors;
using ChristianFitness.Application.Events;
using ChristianFitness.Domain.Legal;
using ChristianFitness.Application.Sessions;
using ChristianFitness.Application.Sessions.Google;
using ChristianFitness.Domain.Members;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Account.Google;

/// <summary>
/// "Finish your profile" (L2-003 AC8, AC9): the name, the optional home church and interests and
/// the age confirmation; the email is the Google account's, kept by the server. A class, not a
/// record, so the home church never reaches a log through a generated <c>ToString</c> (L2-033 AC2).
/// </summary>
public sealed class CreateGoogleAccountCommand : IRequest<SessionDto>
{
    public bool AgeConfirmed { get; init; }

    public string FullName { get; init; } = string.Empty;

    public string? HomeChurch { get; init; }

    public IReadOnlyList<string> Interests { get; init; } = [];
}

/// <summary>The Join rules of "Finish your profile": AC3 and AC6 as for the email form (ADR 0099).</summary>
public sealed class CreateGoogleAccountValidator : AbstractValidator<CreateGoogleAccountCommand>
{
    public CreateGoogleAccountValidator()
    {
        RuleLevelCascadeMode = CascadeMode.Stop;

        RuleFor(c => c.FullName)
            .Must(name => !string.IsNullOrWhiteSpace(name)).WithMessage(CreateAccountValidator.NameRequired)
            .Must(name => name.Trim().Length <= Member.NameMaxLength).WithMessage(CreateAccountValidator.NameTooLong).WithErrorCode(RefusalCodes.FieldTooLong);

        RuleFor(c => c.HomeChurch)
            .Must(church => church is null || church.Trim().Length <= Member.HomeChurchMaxLength)
            .WithMessage(CreateAccountValidator.HomeChurchTooLong).WithErrorCode(RefusalCodes.FieldTooLong);

        RuleFor(c => c.Interests)
            .Must(interests => interests is null || interests.All(key => Interests.All.Contains(key, StringComparer.Ordinal)))
            .WithMessage(CreateAccountValidator.InterestUnknown);
    }
}

/// <summary>
/// Creates the member from the Google account the callback kept, and signs them in (L2-003 AC9). In
/// order: the limit of account creations per network (<c>rate_limited</c>, 429, as the email form);
/// no Google account, or an unverified one, is refused <c>google_email_unverified</c> (401) and an
/// unverified one forgotten (L2-049 AC3); no age confirmation is refused <c>age_not_confirmed</c>
/// (L2-003 AC12); an email or Google account that already has a member account is refused
/// <c>email_taken</c> (409); otherwise the Google photo is copied once into the image store
/// (L2-049 AC14), the account created with no password, the Google account forgotten, and the
/// member signed in. A join that creates nothing gives its place back (ADR 0012).
/// </summary>
internal sealed class CreateGoogleAccountHandler(
    IAppDbContext db,
    IGoogleIdentityReader identities,
    IGooglePhotos photos,
    IImageStore images,
    ISessionSignIn session,
    LegalDocuments documents,
    TimeProvider time,
    AccountCreationLimiter limiter,
    IClientAddress clientAddress)
    : IRequestHandler<CreateGoogleAccountCommand, SessionDto>
{
    public async Task<SessionDto> Handle(CreateGoogleAccountCommand request, CancellationToken cancellationToken)
    {
        var lease = limiter.TryAcquire(clientAddress.PartitionKey)
            ?? throw new RefusalException(RefusalCodes.RateLimited, RefusalKind.TooManyRequests);
        Member member;
        try
        {
            member = await CreateAsync(request, cancellationToken).ConfigureAwait(false);
        }
        catch
        {
            limiter.Release(lease);
            throw;
        }

        await identities.ForgetAsync().ConfigureAwait(false);
        await session.SignInAsync(member).ConfigureAwait(false);
        return new SessionDto(member.Id, member.Name);
    }

    private async Task<Member> CreateAsync(CreateGoogleAccountCommand request, CancellationToken cancellationToken)
    {
        var identity = await PendingGoogleAccount.ReadAsync(identities).ConfigureAwait(false);
        if (!request.AgeConfirmed)
        {
            throw new RefusalException(RefusalCodes.AgeNotConfirmed, RefusalKind.BadRequest);
        }

        var normalizedEmail = Member.NormalizeEmail(identity.Email);
        if (await IsTakenAsync(normalizedEmail, identity.Subject, cancellationToken).ConfigureAwait(false))
        {
            throw new RefusalException(RefusalCodes.EmailTaken, RefusalKind.Conflict);
        }

        var photoKey = await CopyPhotoAsync(identity.PictureUrl, cancellationToken).ConfigureAwait(false);
        var now = time.GetUtcNow();
        var today = DateOnly.FromDateTime(now.UtcDateTime);
        var member = Member.JoinWithGoogle(request.FullName, identity.Email, identity.Subject, now, request.HomeChurch, request.Interests, photoKey);
        member.AcceptLegal(documents.InForce("terms", today) ?? throw new InvalidOperationException("Missing effective Terms"),
            documents.InForce("privacy", today) ?? throw new InvalidOperationException("Missing effective Privacy Policy"), now);
        db.Members.Add(member);
        try
        {
            await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        }
        catch (DbUpdateException exception)
        {
            // Two joins at once both pass the lookup; the unique indexes refuse the second.
            db.Members.Remove(member);
            if (await IsTakenAsync(normalizedEmail, identity.Subject, cancellationToken).ConfigureAwait(false))
            {
                throw new RefusalException(RefusalCodes.EmailTaken, RefusalKind.Conflict, exception);
            }

            throw;
        }

        return member;
    }

    /// <summary>The photo's key once kept, or none: no address, not Google's, or not an image (L2-049 AC14).</summary>
    private async Task<string?> CopyPhotoAsync(string? url, CancellationToken cancellationToken)
    {
        if (url is null)
        {
            return null;
        }

        var photo = await photos.FetchAsync(url, cancellationToken).ConfigureAwait(false);
        if (photo is not { } content || ImageKeys.Detect(content.Span) is not { } kind)
        {
            return null;
        }

        var key = ImageKeys.NewKey(kind.Extension);
        await images.SaveAsync(key, content, cancellationToken).ConfigureAwait(false);
        return key;
    }

    private Task<bool> IsTakenAsync(string normalizedEmail, string subject, CancellationToken cancellationToken) =>
        db.Members.AnyAsync(m => m.NormalizedEmail == normalizedEmail || m.GoogleSubject == subject, cancellationToken);
}
