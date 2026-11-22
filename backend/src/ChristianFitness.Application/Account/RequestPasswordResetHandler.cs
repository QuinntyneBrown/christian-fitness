using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Email;
using ChristianFitness.Domain.Members;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Account;

/// <summary>
/// Sends a reset link to a registered member (L2-044 AC2; ADR 0010). The caller learns nothing:
/// whether the email has an account or not, the request completes the same way and the API answers
/// 202 (L2-044 AC3). Only the hash of the link's token is stored.
/// </summary>
internal sealed class RequestPasswordResetHandler(IAppDbContext db, IEmailSender email, MemberAppAddress app, TimeProvider time)
    : IRequestHandler<RequestPasswordResetCommand>
{
    public const string Subject = "Reset your Christian Fitness password";

    public async Task Handle(RequestPasswordResetCommand request, CancellationToken cancellationToken)
    {
        var normalizedEmail = Member.NormalizeEmail(request.Email ?? string.Empty);
        var member = await db.Members
            .SingleOrDefaultAsync(m => m.NormalizedEmail == normalizedEmail, cancellationToken)
            .ConfigureAwait(false);
        if (member is null)
        {
            return;
        }

        var now = time.GetUtcNow();
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
