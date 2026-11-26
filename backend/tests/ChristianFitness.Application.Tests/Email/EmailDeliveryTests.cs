using ChristianFitness.Application.Email;
using ChristianFitness.Infrastructure.Email;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;

namespace ChristianFitness.Application.Tests.Email;

/// <summary>
/// ADR 0010: a queued email is delivered by SMTP after the sender returns; without a mail server the
/// development sender records it; outside development the API will not start without the settings
/// it needs to send mail and build links.
/// </summary>
public sealed class EmailDeliveryTests
{
    private static readonly TimeSpan Timeout = TimeSpan.FromSeconds(10);

    [Fact]
    public async Task Given_a_mail_server_When_a_message_is_delivered_Then_it_carries_the_sender_recipient_subject_and_text()
    {
        await using var server = new FakeSmtpServer();
        var transport = new SmtpEmailTransport(Settings(server.Port));

        await transport.DeliverAsync(new EmailMessage("grace@example.org", "Reset your Christian Fitness password", "Hi Grace,\n\nThe link."), TestContext.Current.CancellationToken);

        var received = await server.NextMessageAsync(Timeout);
        Assert.Contains("MAIL FROM:<hello@example.test>", received, StringComparison.Ordinal);
        Assert.Contains("RCPT TO:<grace@example.org>", received, StringComparison.Ordinal);
        Assert.Contains("Subject: Reset your Christian Fitness password", received, StringComparison.Ordinal);
        Assert.Contains("Hi Grace,", received, StringComparison.Ordinal);
    }

    // ADR 0070, ADR 0110: the one-click unsubscribe headers reach the mail server as written.
    [Fact]
    public async Task Given_a_message_with_unsubscribe_headers_When_it_is_delivered_Then_the_server_receives_both_headers()
    {
        await using var server = new FakeSmtpServer();
        var transport = new SmtpEmailTransport(Settings(server.Port));
        var headers = new Dictionary<string, string>(StringComparer.Ordinal)
        {
            ["List-Unsubscribe"] = "<https://members.example.test/api/public/newsletter/unsubscribe?token=abc>",
            ["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click",
        };

        await transport.DeliverAsync(new EmailMessage("grace@example.org", "Confirm", "Text", headers), TestContext.Current.CancellationToken);

        // A long header is folded onto continuation lines (RFC 5322 §2.2.3); unfold it to read it.
        var received = (await server.NextMessageAsync(Timeout)).Replace("\r\n ", " ", StringComparison.Ordinal).Replace("\r\n\t", " ", StringComparison.Ordinal);
        Assert.Contains("List-Unsubscribe: <https://members.example.test/api/public/newsletter/unsubscribe?token=abc>", received, StringComparison.Ordinal);
        Assert.Contains("List-Unsubscribe-Post: List-Unsubscribe=One-Click", received, StringComparison.Ordinal);
    }

    // ADR 0070: any header outside the allow-list is refused before anything is sent.
    [Theory]
    [InlineData("Reply-To")]
    [InlineData("Bcc")]
    [InlineData("list-unsubscribe")]
    public void Given_a_header_outside_the_allow_list_When_a_message_is_made_Then_it_is_refused(string name)
    {
        var headers = new Dictionary<string, string>(StringComparer.Ordinal) { [name] = "value" };

        Assert.Throws<ArgumentException>(() => new EmailMessage("grace@example.org", "Subject", "Text", headers));
    }

    [Fact]
    public async Task Given_the_queued_sender_When_a_message_is_sent_Then_it_returns_at_once_and_the_dispatcher_delivers_it()
    {
        await using var server = new FakeSmtpServer();
        var queue = new QueuedEmailSender(NullLogger<QueuedEmailSender>.Instance);
        using var dispatcher = new EmailDispatcher(queue, new SmtpEmailTransport(Settings(server.Port)), NullLogger<EmailDispatcher>.Instance);
        await dispatcher.StartAsync(TestContext.Current.CancellationToken);

        var sending = queue.SendAsync(new EmailMessage("grace@example.org", "Subject one", "Text one"), TestContext.Current.CancellationToken);

        Assert.True(sending.IsCompletedSuccessfully);
        Assert.Contains("RCPT TO:<grace@example.org>", await server.NextMessageAsync(Timeout), StringComparison.Ordinal);
        await dispatcher.StopAsync(TestContext.Current.CancellationToken);
    }

    [Fact]
    public async Task Given_a_delivery_that_fails_When_the_next_message_is_queued_Then_it_is_still_delivered()
    {
        await using var server = new FakeSmtpServer();
        var queue = new QueuedEmailSender(NullLogger<QueuedEmailSender>.Instance);
        using var dispatcher = new EmailDispatcher(queue, new SmtpEmailTransport(Settings(server.Port)), NullLogger<EmailDispatcher>.Instance);
        await dispatcher.StartAsync(TestContext.Current.CancellationToken);

        // An address MailKit cannot parse fails before it reaches the server.
        await queue.SendAsync(new EmailMessage("not an address", "Subject one", "Text one"), TestContext.Current.CancellationToken);
        await queue.SendAsync(new EmailMessage("grace@example.org", "Subject two", "Text two"), TestContext.Current.CancellationToken);

        Assert.Contains("Subject: Subject two", await server.NextMessageAsync(Timeout), StringComparison.Ordinal);
        await dispatcher.StopAsync(TestContext.Current.CancellationToken);
    }

    [Fact]
    public async Task Given_more_messages_than_the_recorder_keeps_When_they_are_sent_Then_only_the_latest_50_are_kept()
    {
        var recorder = new RecordingEmailSender();

        for (var i = 1; i <= 60; i++)
        {
            await recorder.SendAsync(new EmailMessage("grace@example.org", $"Message {i}", "Text"), TestContext.Current.CancellationToken);
        }

        var sent = recorder.Sent();
        Assert.Equal(50, sent.Count);
        Assert.Equal("Message 11", sent[0].Subject);
        Assert.Equal("Message 60", sent[^1].Subject);
    }

    [Fact]
    public void Given_development_and_no_mail_server_When_email_is_added_Then_the_recording_sender_is_used_with_the_local_member_app()
    {
        using var provider = Provider(new Dictionary<string, string?>(), isDevelopment: true);

        Assert.IsType<RecordingEmailSender>(provider.GetRequiredService<IEmailSender>());
        Assert.Empty(provider.GetServices<IHostedService>());
        Assert.Equal("http://localhost:4200/reset-password#token=abc", provider.GetRequiredService<MemberAppAddress>().ResetPasswordLink("abc"));
    }

    [Fact]
    public void Given_a_mail_server_When_email_is_added_Then_mail_is_queued_and_dispatched_and_links_use_the_configured_address()
    {
        using var provider = Provider(
            new Dictionary<string, string?>
            {
                ["Email:Smtp:Host"] = "smtp.example.test",
                ["Email:From"] = "Christian Fitness <hello@example.test>",
                ["MemberApp:BaseUrl"] = "https://members.example.test/",
                ["Organisation:PostalAddress"] = "1 Example Street, Toronto, Ontario, M5V 0A1",
            },
            isDevelopment: false);

        Assert.IsType<QueuedEmailSender>(provider.GetRequiredService<IEmailSender>());
        Assert.IsType<EmailDispatcher>(Assert.Single(provider.GetServices<IHostedService>()));
        Assert.Equal("https://members.example.test/reset-password#token=abc", provider.GetRequiredService<MemberAppAddress>().ResetPasswordLink("abc"));
    }

    [Fact]
    public void Given_production_without_mail_settings_When_email_is_added_Then_start_up_stops_naming_each_missing_setting()
    {
        var refused = Assert.Throws<InvalidOperationException>(() => Provider(new Dictionary<string, string?>(), isDevelopment: false).Dispose());

        Assert.Equal("Missing setting: Email__Smtp__Host, Email__From, MemberApp__BaseUrl, Organisation__PostalAddress", refused.Message);
    }

    private static SmtpSettings Settings(int port) => new()
    {
        Host = "127.0.0.1",
        Port = port,
        UseTls = false,
        From = "Christian Fitness <hello@example.test>",
    };

    private static ServiceProvider Provider(Dictionary<string, string?> settings, bool isDevelopment)
    {
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(settings).Build();
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddEmail(configuration, isDevelopment);
        return services.BuildServiceProvider();
    }
}
