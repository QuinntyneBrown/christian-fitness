using System.Net;
using ChristianFitness.Api.Tests.DirectoryListings;
using static ChristianFitness.Api.Tests.Feedback.SendFeedbackTests;

namespace ChristianFitness.Api.Tests.Feedback;

/// <summary>
/// L2-063 AC5, AC8 and AC9 (journey 30; ADR 0109): a note the rules refuse answers 400
/// <c>validation_failed</c> with its field's code in <c>fieldCodes</c>, a note over 2,000
/// characters included (<c>field_too_long</c>, under <c>validation_failed</c>); the eleventh note
/// within a rolling hour is refused 429 <c>too_many_attempts</c>, and one is accepted again once
/// the first is an hour old. Nothing is stored for a refusal.
/// </summary>
public sealed class SendFeedbackRefusalTests(FeedbackFactory factory) : IClassFixture<FeedbackFactory>
{
    /// <summary>ADR 0109's table, one case per row: the field, the value sent and its code.</summary>
    public static TheoryData<string, string, string?, string> Invalid() => new()
    {
        { "kind unknown", "kind", "bug", "kind_invalid" },
        { "kind in capitals", "kind", "Idea", "kind_invalid" },
        { "kind missing", "kind", null, "kind_invalid" },
        { "text empty", "text", "", "text_required" },
        { "text only spaces", "text", "   \n ", "text_required" },
        { "text missing", "text", null, "text_required" },
        { "text 2,001 once trimmed", "text", " " + new string('t', 2001) + " ", "field_too_long" },
        { "about an unknown page", "about", "page:admin/members", "about_invalid" },
        { "about an unknown story", "about", "story:" + Guid.Empty, "about_invalid" },
        { "about something else", "about", "https://example.com", "about_invalid" },
    };

    [Theory]
    [MemberData(nameof(Invalid))]
    public async Task Given_a_field_the_rules_refuse_When_sent_Then_it_is_refused_400_with_the_fields_code_and_nothing_is_stored(
        string why, string field, string? value, string code)
    {
        var email = $"grace.refused.{Math.Abs(why.GetHashCode(StringComparison.Ordinal))}@example.org";
        var (client, cookie) = await SuggestListingTests.MemberAsync(factory, email);
        using var _ = client;
        var note = Note();
        note[field] = value;

        using var response = await PostAsync(client, cookie, note);

        Assert.True(response.StatusCode == HttpStatusCode.BadRequest, why);
        var problem = await BodyAsync(response);
        Assert.Equal("validation_failed", problem.GetProperty("code").GetString());
        var codes = problem.GetProperty("fieldCodes").EnumerateObject().ToDictionary(p => p.Name, p => p.Value.GetString(), StringComparer.Ordinal);
        Assert.Equal(new Dictionary<string, string?>(StringComparer.Ordinal) { [field] = code }, codes);
        Assert.Empty(await factory.NotesOfAsync(email));
    }

    [Fact]
    public async Task Given_a_note_of_2000_characters_once_trimmed_When_sent_Then_it_is_stored()
    {
        const string email = "grace.limit.2000@example.org";
        var (client, cookie) = await SuggestListingTests.MemberAsync(factory, email);
        using var _ = client;

        using var response = await PostAsync(client, cookie, Note(text: "  " + new string('t', 2000) + "  "));

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(2000, Assert.Single(await factory.NotesOfAsync(email)).Text.Length);
    }

    [Fact]
    public async Task Given_ten_notes_in_an_hour_When_an_eleventh_is_sent_Then_it_is_refused_too_many_attempts_until_the_first_is_an_hour_old()
    {
        const string email = "grace.limit.hourly@example.org";
        var (client, cookie) = await SuggestListingTests.MemberAsync(factory, email);
        using var _ = client;
        var other = await SuggestListingTests.MemberAsync(factory, "kevin.limit.hourly@example.org");
        using var __ = other.Client;
        var first = factory.Time.GetUtcNow();
        for (var i = 0; i < 10; i++)
        {
            using var sent = await PostAsync(client, cookie, Note());
            Assert.Equal(HttpStatusCode.NoContent, sent.StatusCode);
            factory.Time.Advance(TimeSpan.FromMinutes(5));
        }

        using (var eleventh = await PostAsync(client, cookie, Note()))
        {
            Assert.Equal(HttpStatusCode.TooManyRequests, eleventh.StatusCode);
            Assert.Equal("too_many_attempts", (await BodyAsync(eleventh)).GetProperty("code").GetString());
        }

        // Another member is not limited by Grace's notes.
        using (var theirs = await PostAsync(other.Client, other.Cookie, Note()))
        {
            Assert.Equal(HttpStatusCode.NoContent, theirs.StatusCode);
        }

        // One tick before the first is an hour old it still counts; at the hour it does not.
        factory.Time.Advance(first + TimeSpan.FromHours(1) - TimeSpan.FromTicks(1) - factory.Time.GetUtcNow());
        using (var early = await PostAsync(client, cookie, Note()))
        {
            Assert.Equal(HttpStatusCode.TooManyRequests, early.StatusCode);
        }

        factory.Time.Advance(TimeSpan.FromTicks(1));
        using var again = await PostAsync(client, cookie, Note());
        Assert.Equal(HttpStatusCode.NoContent, again.StatusCode);
        Assert.Equal(11, (await factory.NotesOfAsync(email)).Count);
    }
}
