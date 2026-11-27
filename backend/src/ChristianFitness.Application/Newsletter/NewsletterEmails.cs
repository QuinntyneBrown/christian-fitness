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

    /// <summary>
    /// One subscriber's copy of an issue (L2-070 AC7, AC10): greeted by <paramref name="firstName"/>
    /// or "Hi there", with every link straight to the member app, no tracking image and no redirect,
    /// and a new Unsubscribe token added to the store for the caller's save.
    /// </summary>
    public EmailMessage Issue(NewsletterSubscription subscription, string? firstName, IssueEmailContent content, DateTimeOffset now)
    {
        ArgumentNullException.ThrowIfNull(subscription);
        ArgumentNullException.ThrowIfNull(content);
        return WithFooter(subscription, content.Subject, Body(firstName, content), now);
    }

    /// <summary>The issue as it stands, to one address, with no Unsubscribe token: a test is not a subscription (L2-070 AC9).</summary>
    public EmailMessage Test(string to, string? firstName, IssueEmailContent content)
    {
        ArgumentNullException.ThrowIfNull(content);
        return new EmailMessage(to, content.Subject, Body(firstName, content));
    }

    private string Body(string? firstName, IssueEmailContent content)
    {
        var text = new System.Text.StringBuilder();
        text.Append("Hi ").Append(string.IsNullOrWhiteSpace(firstName) ? "there" : firstName).Append(",\n\n");
        text.Append(content.EditorsNote).Append('\n');
        if (content.Lead is { } lead)
        {
            text.Append("\nTHE BIG STORY\n\n");
            AppendStory(text, lead);
        }

        if (content.Also.Count > 0)
        {
            text.Append("\nALSO THIS WEEK\n\n");
            foreach (var story in content.Also)
            {
                AppendStory(text, story);
            }
        }

        if (content.Events.Count > 0)
        {
            text.Append("\nEVENTS THIS WEEK\n\n");
            foreach (var featured in content.Events)
            {
                text.Append(featured.Title).Append('\n').Append(featured.When).Append(" · ").Append(featured.Place).Append('\n')
                    .Append(Link("e/" + featured.Id.ToString("D"))).Append("\n\n");
            }
        }

        if (content.Verse.Length > 0)
        {
            text.Append("\nA VERSE TO CARRY\n\n").Append(content.Verse).Append('\n');
            if (content.VerseReference.Length > 0)
            {
                text.Append(content.VerseReference).Append('\n');
            }
        }

        return text.ToString().TrimEnd('\n');
    }

    private void AppendStory(System.Text.StringBuilder text, IssueEmailStory story)
    {
        text.Append(story.Headline).Append('\n').Append(Link("stories/" + story.Slug)).Append('\n');
        if (story.Summary.Length > 0)
        {
            text.Append(story.Summary).Append('\n');
        }

        text.Append('\n');
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

/// <summary>What an issue's email says: the same for every recipient but the greeting and the footer.</summary>
public sealed record IssueEmailContent(
    string Subject,
    string EditorsNote,
    IssueEmailStory? Lead,
    IReadOnlyList<IssueEmailStory> Also,
    IReadOnlyList<IssueEmailEvent> Events,
    string Verse,
    string VerseReference);

public sealed record IssueEmailStory(string Headline, string Summary, string Slug);

/// <summary>A featured event, with its day and time in Toronto already in words.</summary>
public sealed record IssueEmailEvent(Guid Id, string Title, string When, string Place);
