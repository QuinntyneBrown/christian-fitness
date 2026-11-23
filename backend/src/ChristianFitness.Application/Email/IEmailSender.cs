namespace ChristianFitness.Application.Email;

/// <summary>
/// Sends an email (ADR 0010). In production the message is queued and delivered by SMTP after the
/// request is answered; in development and tests it is recorded and never sent.
/// </summary>
public interface IEmailSender
{
    Task SendAsync(EmailMessage message, CancellationToken cancellationToken);
}

/// <summary>
/// A plain-text email. A class, not a record: a record's generated <c>ToString</c> would print the
/// address and the text, which may hold a reset link, if it were ever logged (L2-033 AC2).
/// </summary>
public sealed class EmailMessage(string to, string subject, string text)
{
    public string To { get; } = to;

    public string Subject { get; } = subject;

    public string Text { get; } = text;
}
