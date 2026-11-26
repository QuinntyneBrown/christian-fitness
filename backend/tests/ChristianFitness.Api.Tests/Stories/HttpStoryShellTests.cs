using System.Net;
using ChristianFitness.Infrastructure.News;
using Microsoft.Extensions.Configuration;

namespace ChristianFitness.Api.Tests.Stories;

/// <summary>
/// ADR 0105: the API reads the member app's shell from <c>StoryShell:Url</c> the first time it
/// needs it and keeps it; with no address, or while the address cannot be read, there is none and
/// the next request tries again.
/// </summary>
public sealed class HttpStoryShellTests
{
    private const string Url = "http://127.0.0.1:8080/index.html";

    private sealed class StaticHost : HttpMessageHandler, IHttpClientFactory
    {
        public List<Uri> Asked { get; } = [];

        public HttpStatusCode Status { get; set; } = HttpStatusCode.OK;

        public HttpClient CreateClient(string name) => new(this, disposeHandler: false);

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Asked.Add(request.RequestUri!);
            return Status == HttpStatusCode.ServiceUnavailable && request.RequestUri!.AbsolutePath == "/throw"
                ? throw new HttpRequestException("Connection refused")
                : Task.FromResult(new HttpResponseMessage(Status) { Content = new StringContent("<html>shell</html>") });
        }
    }

    private static HttpStoryShell Shell(StaticHost host, string? url) =>
        new(host, new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> { ["StoryShell:Url"] = url }).Build());

    [Fact]
    public async Task Given_the_shell_address_When_the_shell_is_wanted_twice_Then_it_is_read_once_and_kept()
    {
        using var host = new StaticHost();
        var shell = Shell(host, Url);

        var first = await shell.GetAsync(TestContext.Current.CancellationToken);
        var second = await shell.GetAsync(TestContext.Current.CancellationToken);

        Assert.Equal(("<html>shell</html>", "<html>shell</html>", Url), (first, second, Assert.Single(host.Asked).AbsoluteUri));
    }

    [Fact]
    public async Task Given_the_static_host_fails_When_the_shell_is_wanted_Then_there_is_none_and_the_next_request_reads_it_again()
    {
        using var host = new StaticHost { Status = HttpStatusCode.BadGateway };
        var shell = Shell(host, Url);

        var failed = await shell.GetAsync(TestContext.Current.CancellationToken);
        host.Status = HttpStatusCode.OK;
        var read = await shell.GetAsync(TestContext.Current.CancellationToken);

        Assert.Equal((null, "<html>shell</html>", 2), (failed, read, host.Asked.Count));
    }

    [Fact]
    public async Task Given_the_static_host_refuses_the_connection_When_the_shell_is_wanted_Then_there_is_none()
    {
        using var host = new StaticHost { Status = HttpStatusCode.ServiceUnavailable };

        var shell = await Shell(host, "http://127.0.0.1:8080/throw").GetAsync(TestContext.Current.CancellationToken);

        Assert.Null(shell);
    }

    [Fact]
    public async Task Given_no_shell_address_When_the_shell_is_wanted_Then_there_is_none_and_nothing_is_asked()
    {
        using var host = new StaticHost();

        var shell = await Shell(host, null).GetAsync(TestContext.Current.CancellationToken);

        Assert.Equal((null, 0), (shell, host.Asked.Count));
    }
}
