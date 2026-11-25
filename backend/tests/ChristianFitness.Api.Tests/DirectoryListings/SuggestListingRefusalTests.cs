using System.Net;
using static ChristianFitness.Api.Tests.DirectoryListings.SuggestListingTests;

namespace ChristianFitness.Api.Tests.DirectoryListings;

/// <summary>
/// L2-062 AC4, AC7, AC8 and AC11 (journey 17; ADR 0085): a field the rules refuse answers 400
/// <c>validation_failed</c> with the field's own code in <c>fieldCodes</c>; a suspended member is
/// refused 403 <c>account_suspended</c>; a sixth suggestion within a rolling 24 hours is refused 429
/// <c>too_many_attempts</c>, and one again once the oldest is a day old. Nothing is stored for a
/// refusal.
/// </summary>
public sealed class SuggestListingRefusalTests(SuggestListingFactory factory) : IClassFixture<SuggestListingFactory>
{
    private static Dictionary<string, object?> With(string field, object? value, string relation = "someone-i-know")
    {
        var body = Valid(relation);
        body[field] = value;
        return body;
    }

    /// <summary>ADR 0085's table, one case per row: the field, the value sent and its code.</summary>
    public static TheoryData<string, string, object?, string> Invalid() => new()
    {
        { "relation unknown", "relation", "a-friend", "relation_invalid" },
        { "relation missing", "relation", null, "relation_invalid" },
        { "kind unknown", "kind", "Church Ministry", "kind_invalid" },
        { "name blank", "name", "  ", "name_required" },
        { "name missing", "name", null, "name_required" },
        { "name 121", "name", new string('n', 121), "name_too_long" },
        { "place blank", "where", "", "where_required" },
        { "place 121", "where", new string('w', 121), "where_too_long" },
        { "website over 200 once read", "website", "example.com/" + new string('p', 190), "website_too_long" },
        { "website http", "website", "http://example.com", "website_invalid" },
        { "website with no dot in the host", "website", "localhost/page", "website_invalid" },
        { "website with a user name", "website", "https://me:secret@example.com", "website_invalid" },
        { "website with a space", "website", "my site.com", "website_invalid" },
        { "website another scheme", "website", "ftp://example.com", "website_invalid" },
        { "church connection 201", "churchConnection", new string('c', 201), "church_connection_too_long" },
        { "reason 1001", "reason", new string('r', 1001), "reason_too_long" },
        { "email 255", "email", new string('e', 243) + "@example.org", "email_too_long" },
        { "email malformed", "email", "lead at eastside", "email_invalid" },
    };

    [Theory]
    [MemberData(nameof(Invalid))]
    public async Task Given_a_field_the_rules_refuse_When_suggested_Then_it_is_refused_400_with_the_fields_code_and_nothing_is_stored(
        string why, string field, object? value, string code)
    {
        var email = $"grace.refused.{Math.Abs(why.GetHashCode(StringComparison.Ordinal))}@example.org";
        var (client, cookie) = await MemberAsync(factory, email);
        using var _ = client;

        using var response = await PostAsync(client, cookie, With(field, value));

        Assert.True(response.StatusCode == HttpStatusCode.BadRequest, why);
        var problem = await BodyAsync(response);
        Assert.Equal("validation_failed", problem.GetProperty("code").GetString());
        var codes = problem.GetProperty("fieldCodes").EnumerateObject().ToDictionary(p => p.Name, p => p.Value.GetString(), StringComparer.Ordinal);
        Assert.Equal(new Dictionary<string, string?>(StringComparer.Ordinal) { [field] = code }, codes);
        Assert.Empty(await factory.SuggestionsOfAsync(email));
    }

    /// <summary>The limits themselves are allowed: the boundary of each row above.</summary>
    public static TheoryData<string, string, object?> AtTheLimit() => new()
    {
        { "name 120", "name", new string('n', 120) },
        { "place 120", "where", new string('w', 120) },
        { "website exactly 200 once read", "website", "example.com/" + new string('p', 200 - "https://example.com/".Length) },
        { "website https", "website", "https://example.com/club" },
        { "church connection 200", "churchConnection", new string('c', 200) },
        { "reason 1000", "reason", new string('r', 1000) },
        { "email 254", "email", new string('e', 242) + "@example.org" },
        { "a malformed email for Myself, which is not asked", "email", "not an email" },
    };

    [Theory]
    [MemberData(nameof(AtTheLimit))]
    public async Task Given_a_value_at_its_limit_When_suggested_Then_it_is_stored(string why, string field, object? value)
    {
        var email = $"grace.limit.{Math.Abs(why.GetHashCode(StringComparison.Ordinal))}@example.org";
        var (client, cookie) = await MemberAsync(factory, email);
        using var _ = client;

        using var response = await PostAsync(client, cookie, With(field, value, why.Contains("Myself", StringComparison.Ordinal) ? "myself" : "someone-i-know"));

        Assert.True(response.StatusCode == HttpStatusCode.Created, why);
        Assert.Single(await factory.SuggestionsOfAsync(email));
    }

    [Fact]
    public async Task Given_a_suspended_member_When_they_suggest_Then_it_is_refused_account_suspended_and_nothing_is_stored()
    {
        const string email = "grace.suspended@example.org";
        var (client, cookie) = await MemberAsync(factory, email);
        using var _ = client;
        await factory.SuspendAsync(email);

        using var response = await PostAsync(client, cookie, Valid());

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal("account_suspended", (await BodyAsync(response)).GetProperty("code").GetString());
        Assert.Empty(await factory.SuggestionsOfAsync(email));
    }

    [Fact]
    public async Task Given_five_suggestions_in_24_hours_When_a_sixth_is_sent_Then_it_is_refused_too_many_attempts_until_the_first_is_a_day_old()
    {
        const string email = "grace.limit.daily@example.org";
        var (client, cookie) = await MemberAsync(factory, email);
        using var _ = client;
        var other = await MemberAsync(factory, "kevin.limit.daily@example.org");
        using var __ = other.Client;
        var first = factory.Time.GetUtcNow();
        for (var i = 0; i < 5; i++)
        {
            using var sent = await PostAsync(client, cookie, Valid());
            Assert.Equal(HttpStatusCode.Created, sent.StatusCode);
            factory.Time.Advance(TimeSpan.FromHours(1));
        }

        using (var sixth = await PostAsync(client, cookie, Valid()))
        {
            Assert.Equal(HttpStatusCode.TooManyRequests, sixth.StatusCode);
            Assert.Equal("too_many_attempts", (await BodyAsync(sixth)).GetProperty("code").GetString());
        }

        // Another member's count is their own.
        using (var others = await PostAsync(other.Client, other.Cookie, Valid()))
        {
            Assert.Equal(HttpStatusCode.Created, others.StatusCode);
        }

        // Exactly a day after the first, it no longer counts (AttemptWindow: "after" the start).
        factory.Time.Advance(first.AddDays(1) - factory.Time.GetUtcNow() - TimeSpan.FromTicks(1));
        using (var early = await PostAsync(client, cookie, Valid()))
        {
            Assert.Equal(HttpStatusCode.TooManyRequests, early.StatusCode);
        }

        factory.Time.Advance(TimeSpan.FromTicks(1));
        using (var again = await PostAsync(client, cookie, Valid()))
        {
            Assert.Equal(HttpStatusCode.Created, again.StatusCode);
        }

        Assert.Equal(6, (await factory.SuggestionsOfAsync(email)).Count);
    }
}
