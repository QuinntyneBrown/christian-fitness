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
/// Sends the newsletter's issues (ADR 0070): each email is handed to the relay before the call
/// returns, never through the bounded queue of transactional mail, and a failure is thrown so the
/// caller can try that recipient again.
/// </summary>
public interface IBulkEmailSender
{
    Task SendAsync(EmailMessage message, CancellationToken cancellationToken);
}

/// <summary>
/// The relay's sending limits (<c>Email:MaxPerMinute</c>, <c>Email:MaxPerDay</c>; ADR 0070). While
/// either is not set, no issue email is sent: the operator supplies the relay's limits.
/// </summary>
public sealed record BulkEmailLimits(int? MaxPerMinute, int? MaxPerDay);

/// <summary>
/// A plain-text email, with optional headers from <see cref="AllowedHeaders"/> (ADR 0070, ADR 0110).
/// A class, not a record: a record's generated <c>ToString</c> would print the address and the text,
/// which may hold a reset or unsubscribe link, if it were ever logged (L2-033 AC2).
/// </summary>
public sealed class EmailMessage
{
    /// <summary>The headers a message may carry: one-click unsubscribe (RFC 8058; ADR 0070). Any other is refused.</summary>
    public static readonly IReadOnlySet<string> AllowedHeaders =
        new HashSet<string>(["List-Unsubscribe", "List-Unsubscribe-Post"], StringComparer.Ordinal);

    public EmailMessage(string to, string subject, string text, IReadOnlyDictionary<string, string>? headers = null)
    {
        headers ??= new Dictionary<string, string>(StringComparer.Ordinal);
        var refused = headers.Keys.FirstOrDefault(name => !AllowedHeaders.Contains(name));
        if (refused is not null)
        {
            throw new ArgumentException($"The header {refused} is not allowed in an email.", nameof(headers));
        }

        To = to;
        Subject = subject;
        Text = text;
        Headers = headers;
    }

    public string To { get; }

    public string Subject { get; }

    public string Text { get; }

    /// <summary>The message's own headers, each from <see cref="AllowedHeaders"/>; empty for most mail.</summary>
    public IReadOnlyDictionary<string, string> Headers { get; }
}
