using System.Net;
using System.Net.Sockets;
using System.Text;

namespace ChristianFitness.Application.Tests.Email;

/// <summary>
/// A minimal SMTP server on a free local port, enough for one client to send messages without TLS
/// or authentication. Each message's DATA is completed into <see cref="NextMessageAsync"/>; a test
/// awaits it with a timeout, never sleeps.
/// </summary>
internal sealed class FakeSmtpServer : IAsyncDisposable
{
    private readonly TcpListener _listener = new(IPAddress.Loopback, 0);
    private readonly CancellationTokenSource _stop = new();
    private readonly System.Threading.Channels.Channel<string> _messages = System.Threading.Channels.Channel.CreateUnbounded<string>();
    private readonly Task _serving;

    public FakeSmtpServer()
    {
        _listener.Start();
        _serving = ServeAsync();
    }

    public int Port => ((IPEndPoint)_listener.LocalEndpoint).Port;

    /// <summary>The next message received (envelope lines and DATA), or a timeout naming what was awaited.</summary>
    public async Task<string> NextMessageAsync(TimeSpan timeout)
    {
        using var cancel = new CancellationTokenSource(timeout);
        try
        {
            return await _messages.Reader.ReadAsync(cancel.Token).ConfigureAwait(false);
        }
        catch (OperationCanceledException)
        {
            throw new TimeoutException($"No message reached the fake SMTP server on port {Port} within {timeout}.");
        }
    }

    public async ValueTask DisposeAsync()
    {
        await _stop.CancelAsync().ConfigureAwait(false);
        _listener.Stop();
        try
        {
            await _serving.ConfigureAwait(false);
        }
        catch (OperationCanceledException)
        {
        }
        catch (SocketException)
        {
        }
        catch (ObjectDisposedException)
        {
        }

        _stop.Dispose();
    }

    private async Task ServeAsync()
    {
        while (!_stop.IsCancellationRequested)
        {
            using var client = await _listener.AcceptTcpClientAsync(_stop.Token).ConfigureAwait(false);
            await using var stream = client.GetStream();
            using var reader = new StreamReader(stream, Encoding.ASCII);
            await using var writer = new StreamWriter(stream, Encoding.ASCII) { NewLine = "\r\n", AutoFlush = true };
            await writer.WriteLineAsync("220 fake.smtp ready").ConfigureAwait(false);
            var envelope = new StringBuilder();
            while (await reader.ReadLineAsync(_stop.Token).ConfigureAwait(false) is { } line)
            {
                var verb = line.Split(' ', 2)[0].ToUpperInvariant();
                switch (verb)
                {
                    case "EHLO":
                        await writer.WriteLineAsync("250-fake.smtp").ConfigureAwait(false);
                        await writer.WriteLineAsync("250 8BITMIME").ConfigureAwait(false);
                        break;
                    case "MAIL":
                    case "RCPT":
                        envelope.AppendLine(line);
                        await writer.WriteLineAsync("250 OK").ConfigureAwait(false);
                        break;
                    case "DATA":
                        await writer.WriteLineAsync("354 End data with <CR><LF>.<CR><LF>").ConfigureAwait(false);
                        var data = new StringBuilder(envelope.ToString());
                        while (await reader.ReadLineAsync(_stop.Token).ConfigureAwait(false) is { } dataLine && dataLine != ".")
                        {
                            data.AppendLine(dataLine);
                        }

                        envelope.Clear();
                        await writer.WriteLineAsync("250 Queued").ConfigureAwait(false);
                        await _messages.Writer.WriteAsync(data.ToString(), _stop.Token).ConfigureAwait(false);
                        break;
                    case "QUIT":
                        await writer.WriteLineAsync("221 Bye").ConfigureAwait(false);
                        break;
                    default:
                        await writer.WriteLineAsync("250 OK").ConfigureAwait(false);
                        break;
                }

                if (verb == "QUIT")
                {
                    break;
                }
            }
        }
    }
}
