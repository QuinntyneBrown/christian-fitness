using ChristianFitness.Application.Email;
using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace ChristianFitness.Infrastructure.Email;

/// <summary>The mail server's settings (<c>Email:*</c>; docs/operations/settings.md).</summary>
public sealed class SmtpSettings
{
    public required string Host { get; init; }

    public int Port { get; init; } = 587;

    /// <summary>Whether to require TLS (implicit on port 465, STARTTLS otherwise). Only a local test server turns it off.</summary>
    public bool UseTls { get; init; } = true;

    public string? UserName { get; init; }

    public string? Password { get; init; }

    /// <summary>The sender, such as <c>Christian Fitness &lt;hello@example.org&gt;</c>.</summary>
    public required string From { get; init; }
}

/// <summary>Delivers one message to the mail server with MailKit (ADR 0010).</summary>
public sealed class SmtpEmailTransport(SmtpSettings settings) : IEmailSender
{
    public Task SendAsync(EmailMessage message, CancellationToken cancellationToken) => DeliverAsync(message, cancellationToken);

    public async Task DeliverAsync(EmailMessage message, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(message);
        using var mime = new MimeMessage
        {
            Subject = message.Subject,
            Body = new TextPart("plain") { Text = message.Text },
        };
        mime.From.Add(MailboxAddress.Parse(settings.From));
        mime.To.Add(MailboxAddress.Parse(message.To));
        foreach (var (name, value) in message.Headers)
        {
            mime.Headers.Add(name, value);
        }

        using var client = new SmtpClient();
        var security = !settings.UseTls
            ? SecureSocketOptions.None
            : settings.Port == 465 ? SecureSocketOptions.SslOnConnect : SecureSocketOptions.StartTls;
        await client.ConnectAsync(settings.Host, settings.Port, security, cancellationToken).ConfigureAwait(false);
        if (!string.IsNullOrEmpty(settings.UserName))
        {
            await client.AuthenticateAsync(settings.UserName, settings.Password ?? string.Empty, cancellationToken).ConfigureAwait(false);
        }

        await client.SendAsync(mime, cancellationToken).ConfigureAwait(false);
        await client.DisconnectAsync(true, cancellationToken).ConfigureAwait(false);
    }
}
