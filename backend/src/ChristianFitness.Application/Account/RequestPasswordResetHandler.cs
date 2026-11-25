using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Email;
using ChristianFitness.Application.Errors;
using ChristianFitness.Domain.Members;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Account;

/// <summary>
/// Sends a reset link to a registered member (L2-044 AC2; ADR 0010). The caller learns nothing:
/// whether the email has an account or not, the request completes the same way and the API answers
/// 202 (L2-044 AC3). Only the hash of the link's token is stored, and one account is sent at most
/// 3 links an hour (L2-044 AC6); the body was validated before this runs. One client address makes
/// at most 10 requests an hour, whatever emails they name: the next is refused <c>rate_limited</c>
/// before any lookup, so the refusal says nothing of accounts (L2-034 AC3; ADR 0014).
/// </summary>
internal sealed class RequestPasswordResetHandler(
    IAppDbContext db,
    IEmailSender email,
    MemberAppAddress app,
    TimeProvider time,
    PasswordResetRequestLimiter limiter,
    IClientAddress clientAddress)
    : IRequestHandler<RequestPasswordResetCommand>
{
    public const string Subject = "Reset your Christian Fitness password";

    public async Task Handle(RequestPasswordResetCommand request, CancellationToken cancellationToken)
    {
        // Every request counts and none is given back (ADR 0014).
        _ = limiter.TryAcquire(clientAddress.PartitionKey)
            ?? throw new RefusalException(RefusalCodes.RateLimited, RefusalKind.TooManyRequests);
        var normalizedEmail = Member.NormalizeEmail(request.Email ?? string.Empty);
        var member = await db.Members
            .SingleOrDefaultAsync(m => m.NormalizedEmail == normalizedEmail, cancellationToken)
            .ConfigureAwait(false);
        // The Christian Fitness account has no password to reset: answered as for no account (ADR 0065).
        if (member is null || member.IsSystem)
        {
            return;
        }

        // At most 3 emails an hour to one account (L2-044 AC6); over it, the same answer and no mail.
        var now = time.GetUtcNow();
        var since = PasswordReset.RequestWindow.Since(now);
        var recent = await db.PasswordResets
            .CountAsync(r => r.MemberId == member.Id && r.RequestedAt > since, cancellationToken)
            .ConfigureAwait(false);
        if (PasswordReset.RequestWindow.IsFull(recent))
        {
            return;
        }

        var (reset, token) = PasswordReset.Issue(member.Id, now);
        db.PasswordResets.Add(reset);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        await email.SendAsync(new EmailMessage(member.Email, Subject, TextOf(member, app.ResetPasswordLink(token))), cancellationToken)
            .ConfigureAwait(false);
    }

    private static string TextOf(Member member, string link) => $"""
        Hi {member.Name.Split(' ', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault() ?? member.Name},

        Someone asked to reset the password of your Christian Fitness account. Choose a new password with this link:

        {link}

        The link expires in {(int)PasswordReset.Lifetime.TotalMinutes} minutes and works once. If you did not ask, ignore this email: your password stays as it is.

        Christian Fitness
        """;
}
