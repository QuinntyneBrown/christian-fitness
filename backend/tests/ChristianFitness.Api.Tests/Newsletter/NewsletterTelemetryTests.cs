using System.Diagnostics;
using System.Net;
using System.Net.Http.Json;
using ChristianFitness.Api.Tests.Telemetry;

namespace ChristianFitness.Api.Tests.Newsletter;

/// <summary>
/// L2-057 AC8, L2-058 AC7 and L2-033 AC2: subscribing, confirming and unsubscribing leave no address
/// and no token in any span or log; each span records the route template, the method and the status
/// only, and the one-click route is recorded without its query string.
/// </summary>
public sealed class NewsletterTelemetryTests(TelemetryTests.Factory factory) : IClassFixture<TelemetryTests.Factory>
{
    [Fact]
    public async Task Given_an_address_When_it_is_subscribed_Then_neither_it_nor_its_tokens_are_recorded()
    {
        using var client = Browser.CreateClient(factory);
        var before = factory.Emails.Sent().Count;

        await AssertTracedAsync(client, HttpMethod.Post, Newsletter.SubscriptionsPath, new { email = "grace.telemetry.subscribe@example.org" }, HttpStatusCode.Accepted, "POST api/public/newsletter/subscriptions");

        var email = Assert.Single(Newsletter.SentTo(factory, "grace.telemetry.subscribe@example.org", before));
        AssertNotRecorded("grace.telemetry");
        AssertNotRecorded(Newsletter.ConfirmTokenOf(email));
        AssertNotRecorded(Newsletter.UnsubscribeTokenOf(email));
    }

    [Fact]
    public async Task Given_a_malformed_address_When_it_is_refused_Then_it_is_not_recorded()
    {
        using var client = Browser.CreateClient(factory);

        await AssertTracedAsync(client, HttpMethod.Post, Newsletter.SubscriptionsPath, new { email = "grace.telemetry.malformed@example" }, HttpStatusCode.BadRequest, "POST api/public/newsletter/subscriptions");

        AssertNotRecorded("grace.telemetry.malformed");
    }

    [Fact]
    public async Task Given_a_subscription_When_it_is_confirmed_and_left_by_both_links_Then_no_token_or_address_is_recorded()
    {
        using var client = Browser.CreateClient(factory);
        var before = factory.Emails.Sent().Count;
        using var subscribed = await Newsletter.SubscribeAsync(client, "grace.telemetry.links@example.org");
        var email = Assert.Single(Newsletter.SentTo(factory, "grace.telemetry.links@example.org", before));
        var confirm = Newsletter.ConfirmTokenOf(email);
        var unsubscribe = Newsletter.UnsubscribeTokenOf(email);

        await AssertTracedAsync(client, HttpMethod.Post, Newsletter.ConfirmationsPath, new { token = confirm }, HttpStatusCode.OK, "POST api/public/newsletter/confirmations");
        await AssertTracedAsync(client, HttpMethod.Post, Newsletter.UnsubscriptionsPath, new { token = unsubscribe }, HttpStatusCode.OK, "POST api/public/newsletter/unsubscriptions");
        await AssertTracedAsync(client, HttpMethod.Post, $"{Newsletter.OneClickPath}?token={unsubscribe}", null, HttpStatusCode.OK, "POST api/public/newsletter/unsubscribe");

        AssertNotRecorded("grace.telemetry");
        AssertNotRecorded(confirm);
        AssertNotRecorded(unsubscribe);
        AssertNotRecorded("token=");
    }

    private async Task AssertTracedAsync(HttpClient client, HttpMethod method, string path, object? body, HttpStatusCode status, string spanName)
    {
        var traceId = ActivityTraceId.CreateRandom();
        using var request = new HttpRequestMessage(method, new Uri(path, UriKind.Relative))
        {
            Content = body is null ? null : JsonContent.Create(body),
        };
        request.Headers.Add("traceparent", $"00-{traceId}-{ActivitySpanId.CreateRandom()}-01");

        using var response = await client.SendAsync(request, TestContext.Current.CancellationToken);
        Assert.Equal(status, response.StatusCode);

        // The span ends after the response is written: await it, never sleep.
        var span = await factory.Spans.WaitForAsync(
            s => s.Kind == ActivityKind.Server && s.TraceId == traceId,
            s => $"{s.DisplayName} {{{string.Join(", ", s.TagObjects.Select(t => t.Key))}}}",
            $"the server span of {spanName}");

        Assert.Equal(spanName, span.DisplayName);
        Assert.Equal(["http.request.method", "http.response.status_code", "http.route"], span.TagObjects.Select(t => t.Key).Order(StringComparer.Ordinal));
    }

    private void AssertNotRecorded(string value)
    {
        Assert.False(string.IsNullOrEmpty(value));
        var recorded = factory.Spans.Snapshot()
            .SelectMany(s => s.TagObjects.Select(t => $"{t.Value}").Append(s.DisplayName).Append(s.StatusDescription ?? string.Empty).Concat(s.Events.Select(e => e.Name)))
            .Concat(factory.Logs.Snapshot().Select(log => string.Join(" | ", [log.CategoryName, log.FormattedMessage, log.Body, .. (log.Attributes ?? []).Select(a => $"{a.Key}={a.Value}")])))
            .ToArray();
        Assert.DoesNotContain(recorded, recordedValue => recordedValue.Contains(value, StringComparison.OrdinalIgnoreCase));
    }
}
