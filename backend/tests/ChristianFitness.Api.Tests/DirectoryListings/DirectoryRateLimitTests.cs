using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Tests.Account;
using ChristianFitness.Api.Tests.Profiles;

namespace ChristianFitness.Api.Tests.DirectoryListings;

/// <summary>
/// L2-034 AC4 and AC5 (journey 5; ADR 0072, ADR 0082): the <c>public-reads</c> limit counts
/// requests without a session per client address, 120 a minute, and refuses the next with 429
/// <c>too_many_requests</c> and <c>Retry-After</c>; another address and a signed-in member are not
/// held by it. Each test asks from its own address, named in <see cref="ApiFactory.ClientAddressHeader"/>.
/// </summary>
[Collection(DirectoryFixture.Name)]
public sealed class DirectoryRateLimitTests(DirectoryFactory factory)
{
    private const int Limit = 120;

    private HttpClient ClientFrom(string address)
    {
        var client = Browser.CreateClient(factory);
        client.DefaultRequestHeaders.Add(ApiFactory.ClientAddressHeader, address);
        return client;
    }

    private static async Task<HttpStatusCode[]> ReadTimesAsync(HttpClient client, int times, string? cookie = null)
    {
        var statuses = new HttpStatusCode[times];
        for (var i = 0; i < times; i++)
        {
            using var response = await Browser.SendAsync(client, HttpMethod.Get, BrowseDirectoryTests.Path, cookie);
            statuses[i] = response.StatusCode;
        }

        return statuses;
    }

    [Fact]
    public async Task Given_120_anonymous_reads_from_one_address_When_it_reads_again_Then_it_is_refused_with_too_many_requests_and_Retry_After()
    {
        using var client = ClientFrom("203.0.113.71");

        var statuses = await ReadTimesAsync(client, Limit);
        using var refused = await Browser.SendAsync(client, HttpMethod.Get, $"{BrowseDirectoryTests.Path}?q=run", null);

        Assert.All(statuses, status => Assert.Equal(HttpStatusCode.OK, status));
        Assert.Equal(HttpStatusCode.TooManyRequests, refused.StatusCode);
        var problem = await refused.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("too_many_requests", problem.GetProperty("code").GetString());
        Assert.Equal(429, problem.GetProperty("status").GetInt32());
        var retryAfter = Assert.Single(refused.Headers.GetValues("Retry-After"));
        Assert.InRange(int.Parse(retryAfter, System.Globalization.CultureInfo.InvariantCulture), 1, 60);
    }

    [Fact]
    public async Task Given_one_address_at_its_limit_When_another_address_reads_Then_it_is_answered()
    {
        using var held = ClientFrom("203.0.113.72");
        using var other = ClientFrom("203.0.113.73");
        await ReadTimesAsync(held, Limit + 1);

        using var response = await Browser.SendAsync(other, HttpMethod.Get, BrowseDirectoryTests.Path, null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Given_a_signed_in_member_When_they_read_more_than_120_times_Then_every_read_is_answered()
    {
        using var client = Browser.CreateClient(factory);
        var cookie = await OwnProfileTests.JoinedAsync(client, JoinTests.Details("grace.directory.reads@example.org"));
        client.DefaultRequestHeaders.Add(ApiFactory.ClientAddressHeader, "203.0.113.74");

        var statuses = await ReadTimesAsync(client, Limit + 5, cookie);

        Assert.All(statuses, status => Assert.Equal(HttpStatusCode.OK, status));
    }
}
