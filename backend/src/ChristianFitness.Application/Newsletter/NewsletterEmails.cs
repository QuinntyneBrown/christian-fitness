using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Email;
using ChristianFitness.Domain.Newsletter;

namespace ChristianFitness.Application.Newsletter;

/// <summary>
/// Writes the newsletter's emails (L2-058 AC1, AC4; ADR 0070, ADR 0110). Every one ends with the
/// footer the newsletter's emails share: Christian Fitness, its postal address and an Unsubscribe
/// link whose token is issued for that email alone, and carries the one-click headers of RFC 8058
/// pointing at the same token. Links start with <c>MemberApp:BaseUrl</c>, never a request's host.
/// </summary>
public sealed class NewsletterEmails(IAppDbContext db, MemberAppAddress app, Organisation organisation)
{
    public const string NewsletterName = "The Abundant Weekly";

    public const string ConfirmationSubject = "Confirm your subscription to " + NewsletterName;

    /// <summary>
    /// The confirmation email for <paramref name="subscription"/> holding <paramref name="confirmToken"/>,
    /// with a new Unsubscribe token added to the store for the caller's save.
    /// </summary>
    public EmailMessage Confirmation(NewsletterSubscription subscription, string confirmToken, DateTimeOffset now)
    {
        ArgumentNullException.ThrowIfNull(subscription);
        var text = $"""
            Someone, hopefully you, asked to send {NewsletterName} to this address. It is the weekly email of {Organisation.Name}: the week's stories, the events worth showing up for and one verse, every Saturday at 7 AM.

            Confirm your subscription with this link:

            {Link("subscribe#confirm=" + confirmToken)}

            The link works once and lasts {SubscriptionConfirmation.Lifetime.Days} days.

            If you did not ask, ignore this email: nobody is subscribed until the link is followed.
            """;
        return WithFooter(subscription, ConfirmationSubject, text, now);
    }

    private EmailMessage WithFooter(NewsletterSubscription subscription, string subject, string text, DateTimeOffset now)
    {
        var (stored, token) = NewsletterUnsubscribeToken.Issue(subscription.Id, now);
        db.NewsletterUnsubscribeTokens.Add(stored);
        var footer = $"""


            --
            {Organisation.Name}
            {organisation.PostalAddress}
            Unsubscribe: {Link("subscribe#unsubscribe=" + token)}
            """;
        var headers = new Dictionary<string, string>(StringComparer.Ordinal)
        {
            ["List-Unsubscribe"] = $"<{Link("api/public/newsletter/unsubscribe?token=" + token)}>",
            ["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click",
        };
        return new EmailMessage(subscription.Email, subject, text + footer, headers);
    }

    private string Link(string path) =>
        $"{app.BaseUrl.GetLeftPart(UriPartial.Authority)}{app.BaseUrl.AbsolutePath.TrimEnd('/')}/{path}";
}
