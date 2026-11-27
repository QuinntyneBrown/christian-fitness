using ChristianFitness.Application.Email;

namespace ChristianFitness.Infrastructure.Email;

/// <summary>
/// The development and test <see cref="IEmailSender"/> (ADR 0010): it keeps the latest
/// <see cref="Capacity"/> messages in memory and sends none. Older messages are dropped, so it never
/// grows without bound.
/// </summary>
public sealed class RecordingEmailSender : IEmailSender, IBulkEmailSender
{
    public const int Capacity = 50;

    private readonly Lock _gate = new();
    private readonly Queue<EmailMessage> _sent = new();

    public Task SendAsync(EmailMessage message, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(message);
        lock (_gate)
        {
            _sent.Enqueue(message);
            while (_sent.Count > Capacity)
            {
                _sent.Dequeue();
            }
        }

        return Task.CompletedTask;
    }

    /// <summary>The recorded messages, oldest first.</summary>
    public IReadOnlyList<EmailMessage> Sent()
    {
        lock (_gate)
        {
            return [.. _sent];
        }
    }
}
