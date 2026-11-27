using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Email;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Newsletter;

/// <summary>
/// "Send me a test" (L2-070 AC9): the issue as the desk holds it now, saved or not, complete or
/// not, sent only to the signed-in staff member's own address. Nothing is saved and no Unsubscribe
/// token is issued: a test is not a subscription.
/// </summary>
public sealed class SendTestIssueCommand : IssueFields, IRequest<TestSentDto>;

/// <summary>The address the test went to, for "Test sent to &lt;address&gt;".</summary>
public sealed record TestSentDto(string SentTo);

internal sealed class SendTestIssueValidator : IssueFieldsValidator<SendTestIssueCommand>;

internal sealed class SendTestIssueHandler(IAppDbContext db, ICurrentMember current, IEmailSender sender, NewsletterEmails emails)
    : IRequestHandler<SendTestIssueCommand, TestSentDto>
{
    public async Task<TestSentDto> Handle(SendTestIssueCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        await Issues.FindAsync(db, request.Number, cancellationToken).ConfigureAwait(false);
        var staff = await db.Members.AsNoTracking()
            .Where(m => m.Id == current.Id)
            .Select(m => new { m.Email, m.Name })
            .SingleAsync(cancellationToken).ConfigureAwait(false);
        var content = await IssueContents.OfAsync(db, request.ToContent(), cancellationToken).ConfigureAwait(false);
        await sender.SendAsync(emails.Test(staff.Email, IssueContents.FirstNameOf(staff.Name), content), cancellationToken).ConfigureAwait(false);
        return new TestSentDto(staff.Email);
    }
}
