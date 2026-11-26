using System.Net;
using ChristianFitness.Application.News;
using ChristianFitness.Domain.News;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace ChristianFitness.Api.Tests.Stories;

/// <summary>
/// L2-061 AC8, AC11 (journey 24; ADR 0105): <c>GET /stories/{slug}</c>, which the static host
/// proxies, answers the member app's shell with a Published story's headline, summary, Open Graph
/// and Twitter tags and canonical link, HTML-encoded; a former link is 301 to the current one; any
/// other slug is the shell unchanged with 404; with no shell to read it is 503 so the static host
/// serves its own. Nothing is kept by a cache.
/// </summary>
public sealed class StoryShellTests(StoryShellTests.Factory factory) : IClassFixture<StoryShellTests.Factory>
{
    /// <summary>The build's shell, as the static host serves it: hashed assets under <c>&lt;base href="/"&gt;</c>.</summary>
    internal const string Shell =
        "<!doctype html>\n<html lang=\"en\">\n  <head>\n    <meta charset=\"utf-8\" />\n    <title>Christian Fitness</title>\n    <base href=\"/\" />\n" +
        "  <link rel=\"stylesheet\" href=\"styles-ABC123.css\"></head>\n  <body>\n    <cf-root></cf-root>\n  <script src=\"main-DEF456.js\" type=\"module\"></script></body>\n</html>\n";

    private const string Base = ApiFactory.MemberAppBaseUrl;

    public sealed class Factory : StoriesFactory
    {
        public FakeStoryShell Shell { get; } = new();

        protected override void ConfigureServices(IServiceCollection services)
        {
            base.ConfigureServices(services);
            services.RemoveAll<IStoryShell>();
            services.AddSingleton<IStoryShell>(Shell);
        }
    }

    /// <summary>The shell the test gives, or none (the static host could not be read).</summary>
    public sealed class FakeStoryShell : IStoryShell
    {
        public string? Html { get; set; } = StoryShellTests.Shell;

        public Task<string?> GetAsync(CancellationToken cancellationToken) => Task.FromResult(Html);
    }

    private static async Task<(HttpResponseMessage Response, string Body)> OpenAsync(HttpClient client, string slug)
    {
        var response = await client.GetAsync(new Uri($"/stories/{slug}", UriKind.Relative), TestContext.Current.CancellationToken);
        return (response, await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task Given_a_Published_story_When_its_address_is_requested_without_JavaScript_Then_the_shell_carries_its_title_description_previews_and_canonical_link()
    {
        await factory.PutStoryAsync(
            "Rest is a discipline",
            StoryStatus.Published,
            slug: "rest-is-a-discipline",
            content: c => c with
            {
                Summary = "Why the seventh day belongs in a training plan.",
                ImageKey = "0193a9c00000700080000000000000c3.jpg",
                ImageCrop = new StoryCrop(0, 0, 1600, 900),
            });
        using var client = factory.CreateClient();

        var (response, body) = await OpenAsync(client, "rest-is-a-discipline");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/html", response.Content.Headers.ContentType?.MediaType);
        Assert.True(response.Headers.CacheControl?.NoStore);
        var canonical = $"{Base}/stories/rest-is-a-discipline";
        var image = $"{Base}/api/stories/images/0193a9c00000700080000000000000c3.jpg";
        var description = "Why the seventh day belongs in a training plan.";
        Assert.Equal(
            Shell
                .Replace("<title>Christian Fitness</title>", "<title>Rest is a discipline</title>", StringComparison.Ordinal)
                .Replace(
                    "</head>",
                    $"<meta name=\"description\" content=\"{description}\" />\n" +
                    "<meta property=\"og:type\" content=\"article\" />\n" +
                    "<meta property=\"og:title\" content=\"Rest is a discipline\" />\n" +
                    $"<meta property=\"og:description\" content=\"{description}\" />\n" +
                    $"<meta property=\"og:url\" content=\"{canonical}\" />\n" +
                    $"<meta property=\"og:image\" content=\"{image}\" />\n" +
                    "<meta name=\"twitter:card\" content=\"summary_large_image\" />\n" +
                    "<meta name=\"twitter:title\" content=\"Rest is a discipline\" />\n" +
                    $"<meta name=\"twitter:description\" content=\"{description}\" />\n" +
                    $"<meta name=\"twitter:image\" content=\"{image}\" />\n" +
                    $"<link rel=\"canonical\" href=\"{canonical}\" />\n</head>",
                    StringComparison.Ordinal),
            body);
    }

    [Fact]
    public async Task Given_a_story_whose_words_hold_markup_and_no_summary_or_image_When_its_shell_is_served_Then_every_value_is_encoded_and_the_description_is_empty()
    {
        await factory.PutStoryAsync("Fasting & \"training\" <script>alert(1)</script>", StoryStatus.Published, slug: "fasting-and-training");
        using var client = factory.CreateClient();

        var (_, body) = await OpenAsync(client, "fasting-and-training");

        Assert.Contains("<title>Fasting &amp; &quot;training&quot; &lt;script&gt;alert(1)&lt;/script&gt;</title>", body, StringComparison.Ordinal);
        Assert.Contains("<meta property=\"og:title\" content=\"Fasting &amp; &quot;training&quot; &lt;script&gt;alert(1)&lt;/script&gt;\" />", body, StringComparison.Ordinal);
        Assert.DoesNotContain("<script>alert", body, StringComparison.Ordinal);
        Assert.Contains("<meta name=\"description\" content=\"\" />", body, StringComparison.Ordinal);
        Assert.Contains("<meta name=\"twitter:card\" content=\"summary\" />", body, StringComparison.Ordinal);
        Assert.DoesNotContain("og:image", body, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Given_a_story_whose_link_changed_When_its_former_address_is_requested_Then_it_moves_permanently_to_the_current_one()
    {
        await factory.PutStoryAsync("Moved story", StoryStatus.Published, slug: "moved-now", formerSlug: "moved-before");
        using var client = factory.CreateClient(new() { AllowAutoRedirect = false });

        var (response, _) = await OpenAsync(client, "moved-before");

        Assert.Equal(HttpStatusCode.MovedPermanently, response.StatusCode);
        Assert.Equal(new Uri($"{Base}/stories/moved-now"), response.Headers.Location);
        Assert.True(response.Headers.CacheControl?.NoStore);
    }

    [Theory]
    [InlineData("no-story-here", StoryStatus.Published, false, false)]
    [InlineData("shell-draft", StoryStatus.Draft, false, true)]
    [InlineData("shell-unpublished", StoryStatus.Published, true, true)]
    [InlineData("shell-unpublished-former", StoryStatus.Published, true, true)]
    public async Task Given_a_slug_that_is_no_Published_story_When_its_address_is_requested_Then_the_shell_answers_unchanged_with_404(string slug, StoryStatus status, bool unpublished, bool put)
    {
        if (put)
        {
            var former = slug.EndsWith("-former", StringComparison.Ordinal);
            await factory.PutStoryAsync($"Secret {slug}", status, unpublished: unpublished, slug: former ? $"{slug}-now" : slug, formerSlug: former ? slug : null);
        }

        using var client = factory.CreateClient(new() { AllowAutoRedirect = false });

        var (response, body) = await OpenAsync(client, slug);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("text/html", response.Content.Headers.ContentType?.MediaType);
        Assert.Equal(Shell, body);
    }

    [Fact]
    public async Task Given_the_shell_cannot_be_read_When_a_story_address_is_requested_Then_it_is_503_so_the_static_host_serves_its_own()
    {
        await factory.PutStoryAsync("Unshelled", StoryStatus.Published, slug: "unshelled");
        factory.Shell.Html = null;
        try
        {
            using var client = factory.CreateClient();

            var (response, _) = await OpenAsync(client, "unshelled");

            Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        }
        finally
        {
            factory.Shell.Html = Shell;
        }
    }
}
