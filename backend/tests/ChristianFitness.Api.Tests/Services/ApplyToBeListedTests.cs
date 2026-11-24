using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Tests.Account;
using ChristianFitness.Api.Tests.Events;
using ChristianFitness.Api.Tests.Profiles;
using ChristianFitness.Domain.Services;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Services;

/// <summary>
/// L2-026 (slice 22.1; ADR 0047): a signed-in member applies to be listed at
/// <c>POST /api/professional-applications</c>. The application is created Pending; a second one while
/// one is Pending is refused 409 <c>application_pending</c>; a suspended member is refused 403
/// <c>member_suspended</c>; a field that is blank, over its limit or not a category is refused 400
/// naming the field. Nothing is stored for a refusal.
/// </summary>
public sealed class ApplyToBeListedTests(RegisterForEventFactory factory) : IClassFixture<RegisterForEventFactory>
{
    private const string Path = "/api/professional-applications";

    private static object Valid(string role = "Personal trainer") => new
    {
        role,
        category = "Training",
        credentials = "NSCA-CPT, 8 years coaching",
        where = "Mississauga",
        price = "$70 / session",
        about = "I help busy parents build strength without burning out.",
    };

    private async Task<(HttpClient Client, string Cookie)> MemberAsync(string email)
    {
        var client = Browser.CreateClient(factory);
        var cookie = await OwnProfileTests.JoinedAsync(client, JoinTests.Details(email));
        return (client, cookie);
    }

    private static async Task<HttpResponseMessage> PostAsync(HttpClient client, string path, string? cookie, object body)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, new Uri(path, UriKind.Relative)) { Content = JsonContent.Create(body) };
        if (cookie is not null)
        {
            request.Headers.Add("Cookie", cookie);
        }

        return await client.SendAsync(request, TestContext.Current.CancellationToken).ConfigureAwait(false);
    }

    private static async Task<JsonElement> BodyAsync(HttpResponseMessage response) =>
        await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);

    [Fact]
    public async Task Given_a_signed_in_member_When_they_apply_Then_a_pending_application_is_created_with_their_values()
    {
        var (client, cookie) = await MemberAsync("grace.apply1@example.org");
        using var _ = client;

        using var response = await PostAsync(client, Path, cookie, Valid("  Personal trainer "));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await BodyAsync(response);
        Assert.Equal(
            ["about", "category", "credentials", "id", "price", "role", "status", "submittedAt", "where"],
            created.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.NotEqual(Guid.Empty, created.GetProperty("id").GetGuid());
        Assert.Equal("pending", created.GetProperty("status").GetString());
        Assert.Equal("Personal trainer", created.GetProperty("role").GetString());
        Assert.Equal("Training", created.GetProperty("category").GetString());
        Assert.Equal("NSCA-CPT, 8 years coaching", created.GetProperty("credentials").GetString());
        Assert.Equal("Mississauga", created.GetProperty("where").GetString());
        Assert.Equal("$70 / session", created.GetProperty("price").GetString());
        Assert.Equal("I help busy parents build strength without burning out.", created.GetProperty("about").GetString());
        Assert.Equal(RegisterForEventFactory.Now, created.GetProperty("submittedAt").GetDateTimeOffset());
    }

    [Fact]
    public async Task Given_a_visitor_When_they_apply_Then_it_is_refused_401()
    {
        using var client = Browser.CreateClient(factory);

        using var response = await PostAsync(client, Path, null, Valid());

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Given_a_member_with_a_pending_application_When_they_apply_again_Then_it_is_refused_application_pending()
    {
        var (client, cookie) = await MemberAsync("grace.apply2@example.org");
        using var _ = client;
        using var first = await PostAsync(client, Path, cookie, Valid());
        Assert.Equal(HttpStatusCode.Created, first.StatusCode);

        using var second = await PostAsync(client, Path, cookie, Valid("Nutrition coach"));

        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);
        Assert.Equal("application_pending", (await BodyAsync(second)).GetProperty("code").GetString());
    }

    [Fact]
    public async Task Given_another_member_has_a_pending_application_When_a_member_applies_Then_it_is_created()
    {
        var (first, firstCookie) = await MemberAsync("grace.apply3a@example.org");
        var (second, secondCookie) = await MemberAsync("grace.apply3b@example.org");
        using var _ = first;
        using var __ = second;
        using var one = await PostAsync(first, Path, firstCookie, Valid());
        Assert.Equal(HttpStatusCode.Created, one.StatusCode);

        using var two = await PostAsync(second, Path, secondCookie, Valid());

        Assert.Equal(HttpStatusCode.Created, two.StatusCode);
    }

    [Theory]
    [InlineData(ApplicationStatus.Declined)]
    [InlineData(ApplicationStatus.Approved)]
    public async Task Given_a_member_whose_application_was_decided_When_they_apply_Then_a_new_one_is_created(ApplicationStatus decided)
    {
        var email = $"grace.apply6.{decided}@example.org";
        var (client, cookie) = await MemberAsync(email);
        using var _ = client;
        using var first = await PostAsync(client, Path, cookie, Valid());
        Assert.Equal(HttpStatusCode.Created, first.StatusCode);
        await DecideAsync((await BodyAsync(first)).GetProperty("id").GetGuid(), decided);

        using var again = await PostAsync(client, Path, cookie, Valid("Nutrition coach"));

        Assert.Equal(HttpStatusCode.Created, again.StatusCode);
        Assert.Equal("pending", (await BodyAsync(again)).GetProperty("status").GetString());
    }

    /// <summary>Staff decide applications in slice 25; until then the store stands in for them.</summary>
    private async Task DecideAsync(Guid id, ApplicationStatus status)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var application = await db.ProfessionalApplications.SingleAsync(a => a.Id == id, TestContext.Current.CancellationToken);
        db.Entry(application).Property(a => a.Status).CurrentValue = status;
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
    }

    [Fact]
    public async Task Given_a_suspended_member_When_they_apply_Then_it_is_refused_member_suspended()
    {
        var (client, cookie) = await MemberAsync("grace.apply4@example.org");
        using var _ = client;
        await factory.SuspendAsync("grace.apply4@example.org");

        using var response = await PostAsync(client, Path, cookie, Valid());

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal("member_suspended", (await BodyAsync(response)).GetProperty("code").GetString());
    }

    public static TheoryData<string, object, string, string[]> Invalid() => new()
    {
        { "blank role and credentials", new { role = " ", category = "Training", credentials = "", where = "Mississauga", price = "$70", about = "Hi" }, "validation_failed", ["credentials", "role"] },
        { "blank where, price and about", new { role = "Trainer", category = "Training", credentials = "CPT", where = "", price = " ", about = "" }, "validation_failed", ["about", "price", "where"] },
        { "a category that is not offered", new { role = "Trainer", category = "Plumbing", credentials = "CPT", where = "Here", price = "$1", about = "Hi" }, "validation_failed", ["category"] },
        { "role 81", new { role = new string('r', 81), category = "Training", credentials = "CPT", where = "Here", price = "$1", about = "Hi" }, "field_too_long", ["role"] },
        { "credentials 201", new { role = "Trainer", category = "Training", credentials = new string('c', 201), where = "Here", price = "$1", about = "Hi" }, "field_too_long", ["credentials"] },
        { "where 81", new { role = "Trainer", category = "Training", credentials = "CPT", where = new string('w', 81), price = "$1", about = "Hi" }, "field_too_long", ["where"] },
        { "price 61", new { role = "Trainer", category = "Training", credentials = "CPT", where = "Here", price = new string('p', 61), about = "Hi" }, "field_too_long", ["price"] },
        { "about 301", new { role = "Trainer", category = "Training", credentials = "CPT", where = "Here", price = "$1", about = new string('a', 301) }, "field_too_long", ["about"] },
    };

    [Theory]
    [MemberData(nameof(Invalid))]
    public async Task Given_an_invalid_application_When_it_is_sent_Then_it_is_refused_400_naming_the_fields_and_nothing_is_stored(
        string why, object body, string code, string[] fields)
    {
        var (client, cookie) = await MemberAsync($"grace.apply5.{Math.Abs(why.GetHashCode(StringComparison.Ordinal))}@example.org");
        using var _ = client;

        using var response = await PostAsync(client, Path, cookie, body);

        Assert.True(response.StatusCode == HttpStatusCode.BadRequest, why);
        var problem = await BodyAsync(response);
        Assert.Equal(code, problem.GetProperty("code").GetString());
        Assert.Equal(fields, problem.GetProperty("errors").EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        // Nothing was stored: a valid application is not met by a pending one.
        using var retry = await PostAsync(client, Path, cookie, Valid());
        Assert.Equal(HttpStatusCode.Created, retry.StatusCode);
    }
}
