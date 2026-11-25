using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Tests.Account;
using ChristianFitness.Api.Tests.Profiles;
using ChristianFitness.Domain.Directory;
using ChristianFitness.Domain.Members;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Time.Testing;

namespace ChristianFitness.Api.Tests.DirectoryListings;

/// <summary>The API on a clock the suggestion tests hold, with a way to suspend a member.</summary>
public sealed class SuggestListingFactory : ApiFactory
{
    public static readonly DateTimeOffset Now = new(2026, 11, 25, 15, 0, 0, TimeSpan.Zero);

    public FakeTimeProvider Time { get; } = new(Now);

    protected override void ConfigureServices(IServiceCollection services)
    {
        services.RemoveAll<TimeProvider>();
        services.AddSingleton<TimeProvider>(Time);
    }

    public async Task SuspendAsync(string email)
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var normalized = Member.NormalizeEmail(email);
        var member = await db.Members.SingleAsync(m => m.NormalizedEmail == normalized, TestContext.Current.CancellationToken);
        db.Entry(member).Property(m => m.Status).CurrentValue = MemberStatus.Suspended;
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
    }

    /// <summary>The suggestions stored for the member with <paramref name="email"/>, oldest first.</summary>
    public async Task<List<ListingSuggestion>> SuggestionsOfAsync(string email)
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var normalized = Member.NormalizeEmail(email);
        var id = await db.Members.Where(m => m.NormalizedEmail == normalized).Select(m => m.Id).SingleAsync(TestContext.Current.CancellationToken);
        return await db.ListingSuggestions.AsNoTracking().Where(s => s.SuggestedById == id).OrderBy(s => s.SubmittedAt).ThenBy(s => s.Id)
            .ToListAsync(TestContext.Current.CancellationToken);
    }
}

/// <summary>
/// L2-062 AC5 (journey 17; ADR 0086): a signed-in member suggests a listing at
/// <c>POST /api/directory/suggestions</c>. It is stored Waiting with the member who sent it and the
/// time, every text trimmed and a blank optional one as none, the website read with
/// <c>https://</c> in front, and answered 201 with its id and name only. For Myself no contact
/// email and no permission are stored. A visitor is refused 401.
/// </summary>
public sealed class SuggestListingTests(SuggestListingFactory factory) : IClassFixture<SuggestListingFactory>
{
    internal const string Path = "/api/directory/suggestions";

    internal static Dictionary<string, object?> Valid(string relation = "someone-i-know") => new(StringComparer.Ordinal)
    {
        ["relation"] = relation,
        ["kind"] = "church-ministry",
        ["name"] = "  Eastside Ladies Who Lift ",
        ["where"] = " Danforth & Pape, Toronto",
        ["website"] = " instagram.com/eastsideladieslift ",
        ["churchConnection"] = "  ",
        ["reason"] = "Saturday strength group. ",
        ["email"] = " lead@eastside.example ",
        ["mayTellWhoSuggested"] = false,
    };

    internal static async Task<(HttpClient Client, string Cookie)> MemberAsync(ApiFactory factory, string email)
    {
        var client = Browser.CreateClient(factory);
        var cookie = await OwnProfileTests.JoinedAsync(client, JoinTests.Details(email));
        return (client, cookie);
    }

    internal static async Task<HttpResponseMessage> PostAsync(HttpClient client, string? cookie, object body)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, new Uri(Path, UriKind.Relative)) { Content = JsonContent.Create(body) };
        if (cookie is not null)
        {
            request.Headers.Add("Cookie", cookie);
        }

        return await client.SendAsync(request, TestContext.Current.CancellationToken).ConfigureAwait(false);
    }

    internal static async Task<JsonElement> BodyAsync(HttpResponseMessage response) =>
        await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);

    [Fact]
    public async Task Given_a_signed_in_member_When_they_suggest_a_listing_Then_it_is_stored_waiting_with_them_and_the_time()
    {
        const string email = "grace.suggest1@example.org";
        var (client, cookie) = await MemberAsync(factory, email);
        using var _ = client;

        using var response = await PostAsync(client, cookie, Valid());

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await BodyAsync(response);
        Assert.Equal(["id", "name"], created.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.Equal("Eastside Ladies Who Lift", created.GetProperty("name").GetString());
        var stored = Assert.Single(await factory.SuggestionsOfAsync(email));
        Assert.Equal(created.GetProperty("id").GetGuid(), stored.Id);
        Assert.Equal(SuggestionRelation.SomeoneIKnow, stored.Relation);
        Assert.Equal(ListingKind.ChurchMinistry, stored.Kind);
        Assert.Equal("Eastside Ladies Who Lift", stored.Name);
        Assert.Equal("Danforth & Pape, Toronto", stored.Where);
        Assert.Equal("https://instagram.com/eastsideladieslift", stored.Website);
        Assert.Null(stored.ChurchConnection);
        Assert.Equal("Saturday strength group.", stored.Reason);
        Assert.Equal("lead@eastside.example", stored.ContactEmail);
        Assert.False(stored.MayTellWhoSuggested);
        Assert.Equal(SuggestListingFactory.Now, stored.SubmittedAt);
        Assert.Equal(SuggestionStatus.Waiting, stored.Status);
    }

    [Fact]
    public async Task Given_only_the_required_fields_When_suggested_Then_the_optional_ones_are_stored_as_none()
    {
        const string email = "grace.suggest2@example.org";
        var (client, cookie) = await MemberAsync(factory, email);
        using var _ = client;

        using var response = await PostAsync(client, cookie, new { relation = "somewhere-ive-been", kind = "organization", name = "Lakeshore Runners", where = "Etobicoke" });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var stored = Assert.Single(await factory.SuggestionsOfAsync(email));
        Assert.Equal(SuggestionRelation.SomewhereIveBeen, stored.Relation);
        Assert.Equal(ListingKind.Organization, stored.Kind);
        Assert.Null(stored.Website);
        Assert.Null(stored.ChurchConnection);
        Assert.Null(stored.Reason);
        Assert.Null(stored.ContactEmail);
        Assert.False(stored.MayTellWhoSuggested);
    }

    [Fact]
    public async Task Given_Myself_When_suggested_with_an_email_and_permission_Then_neither_is_stored()
    {
        const string email = "marcus.suggest3@example.org";
        var (client, cookie) = await MemberAsync(factory, email);
        using var _ = client;
        var body = Valid("myself");
        body["mayTellWhoSuggested"] = true;

        using var response = await PostAsync(client, cookie, body);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var stored = Assert.Single(await factory.SuggestionsOfAsync(email));
        Assert.Equal(SuggestionRelation.Myself, stored.Relation);
        Assert.Null(stored.ContactEmail);
        Assert.False(stored.MayTellWhoSuggested);
    }

    [Fact]
    public async Task Given_a_visitor_When_they_suggest_a_listing_Then_it_is_refused_401()
    {
        using var client = Browser.CreateClient(factory);

        using var response = await PostAsync(client, null, Valid());

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
