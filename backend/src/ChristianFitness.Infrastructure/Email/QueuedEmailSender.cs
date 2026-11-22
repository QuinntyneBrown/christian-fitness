using System.Threading.Channels;
using ChristianFitness.Application.Email;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace ChristianFitness.Infrastructure.Email;

/// <summary>
/// The production <see cref="IEmailSender"/> (ADR 0010): it queues the message and returns, so a
/// request never waits for the mail server and takes as long whether or not it sent a mail.
/// <see cref="EmailDispatcher"/> delivers the queue. The queue is bounded; when it is full the new
/// message is dropped and a warning logged, with nothing of the message in it.
/// </summary>
public sealed partial class QueuedEmailSender(ILogger<QueuedEmailSender> logger) : IEmailSender
{
    public const int Capacity = 500;

    private readonly Channel<EmailMessage> _queue = Channel.CreateBounded<EmailMessage>(
        new BoundedChannelOptions(Capacity) { SingleReader = true, FullMode = BoundedChannelFullMode.Wait });

    internal ChannelReader<EmailMessage> Reader => _queue.Reader;

    public Task SendAsync(EmailMessage message, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(message);
        if (!_queue.Writer.TryWrite(message))
        {
            LogQueueFull(logger, Capacity);
        }

        return Task.CompletedTask;
    }

    [LoggerMessage(Level = LogLevel.Warning, Message = "The email queue is full ({Capacity}); a message was dropped")]
    private static partial void LogQueueFull(ILogger logger, int capacity);
}

/// <summary>
/// Delivers the messages <see cref="QueuedEmailSender"/> queued, one at a time, through
/// <see cref="SmtpEmailTransport"/>. A failed delivery is logged by the exception's type only, since
/// a message can carry an address or a link (L2-033 AC2); the member can ask again.
/// </summary>
public sealed partial class EmailDispatcher(QueuedEmailSender queue, SmtpEmailTransport transport, ILogger<EmailDispatcher> logger)
    : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var message in queue.Reader.ReadAllAsync(stoppingToken).ConfigureAwait(false))
        {
            try
            {
                await transport.DeliverAsync(message, stoppingToken).ConfigureAwait(false);
            }
#pragma warning disable CA1031 // One failed delivery must not stop the ones after it.
            catch (Exception exception) when (exception is not OperationCanceledException || !stoppingToken.IsCancellationRequested)
#pragma warning restore CA1031
            {
                LogDeliveryFailed(logger, exception.GetType().FullName);
            }
        }
    }

    [LoggerMessage(Level = LogLevel.Error, Message = "An email could not be delivered: {ExceptionType}")]
    private static partial void LogDeliveryFailed(ILogger logger, string? exceptionType);
}
