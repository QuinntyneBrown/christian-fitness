using System.Net;
using ChristianFitness.Api.Tests.Events;
using ChristianFitness.Domain.Members;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Api.Tests.DirectoryListings;

/// <summary>
/// Approved suggestions for the claim tests of journey 19 (ADR 0091): a suggestion sent, its four
/// checks passed and approved by a staff member, with the claim link that went out.
/// </summary>
internal sealed class ApprovedSuggestions(RegisterForEventFactory factory)
{
    private static readonly string[] AllChecks = ["credentials", "insurance", "two-references", "conversation"];

    private readonly ReviewSuggestions _review = new(factory);

    /// <summary>
    /// An approved suggestion: the staff client and cookie that approved it, the suggestion, its
    /// listing and the token of the link sent (none when it was published staff-managed).
    /// </summary>
    public sealed record Approved(HttpClient Staff, string Cookie, ReviewSuggestions.Suggested Suggested, Guid ListingId, string? Token) : IDisposable
    {
        public void Dispose() => Staff.Dispose();
    }

    /// <summary>The body of a suggestion of Rooted Physio by a member who knows them.</summary>
    public static Dictionary<string, object?> Body(string relation, string? email) => new(StringComparer.Ordinal)
    {
        ["relation"] = relation,
        ["kind"] = "company",
        ["name"] = "Rooted Physio",
        ["where"] = "Leslieville",
        ["website"] = "rootedphysio.ca",
        ["reason"] = "They gave our run club a free injury clinic.",
        ["email"] = email,
        ["mayTellWhoSuggested"] = true,
    };

    /// <summary>Waits for staff: suggested by <paramref name="email"/> with <paramref name="body"/>.</summary>
    public async Task<(HttpClient Staff, string Cookie, ReviewSuggestions.Suggested Suggested)> WaitingAsync(string email, Dictionary<string, object?> body)
    {
        var suggested = await _review.SuggestAsync(email, "Jordan Reid", body);
        var (staff, cookie, _) = await _review.StaffAsync("staff." + email, StaffRoleName.Moderator);
        foreach (var check in AllChecks)
        {
            using var ticked = await ReviewSuggestions.SendAsync(staff, HttpMethod.Put, $"/suggestions/{suggested.Id}/checks/{check}", cookie, new { passed = true });
            Assert.Equal(HttpStatusCode.OK, ticked.StatusCode);
        }

        return (staff, cookie, suggested);
    }

    /// <summary>Suggested by <paramref name="email"/> with <paramref name="body"/>, then approved by a Moderator.</summary>
    public async Task<Approved> ApproveAsync(string email, Dictionary<string, object?> body)
    {
        var (staff, cookie, suggested) = await WaitingAsync(email, body);
        var sent = factory.Emails.Sent().Count;
        using var approved = await ReviewSuggestions.SendAsync(staff, HttpMethod.Post, $"/suggestions/{suggested.Id}/approve", cookie);
        Assert.Equal(HttpStatusCode.OK, approved.StatusCode);
        var listingId = (await ReviewSuggestions.JsonAsync(approved)).GetProperty("listingId").GetGuid();
        return new Approved(staff, cookie, suggested, listingId, await LatestTokenAsync(suggested.MemberId, sent));
    }

    /// <summary>
    /// The token of the newest claim link sent: by an email after the first <paramref name="emailsBefore"/>,
    /// else the newest direct message to <paramref name="memberId"/> that carries one; none if neither.
    /// </summary>
    public async Task<string?> LatestTokenAsync(Guid memberId, int emailsBefore)
    {
        var email = factory.Emails.Sent().Skip(emailsBefore).LastOrDefault(m => m.Text.Contains("/claim/", StringComparison.Ordinal));
        if (email is not null)
        {
            return TokenIn(email.Text);
        }

        var message = await _review.InDbAsync(db => db.DirectMessages
            .Where(m => m.SenderId == SystemMembers.ChristianFitnessId && m.RecipientId == memberId && m.Text.Contains("/claim/"))
            .OrderByDescending(m => m.SentAt).ThenByDescending(m => m.Id).Select(m => m.Text).FirstOrDefaultAsync(TestContext.Current.CancellationToken));
        return message is null ? null : TokenIn(message);
    }

    /// <summary>The panel's <c>claim</c> for the suggestion <paramref name="id"/>.</summary>
    public static async Task<string?> ClaimOfAsync(HttpClient staff, string cookie, Guid id)
    {
        using var response = await ReviewSuggestions.SendAsync(staff, HttpMethod.Get, $"/suggestions/{id}", cookie);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var claim = (await ReviewSuggestions.JsonAsync(response)).GetProperty("claim");
        return claim.ValueKind == System.Text.Json.JsonValueKind.Null ? null : claim.GetString();
    }

    private static string TokenIn(string text)
    {
        var rest = text[(text.IndexOf("/claim/", StringComparison.Ordinal) + "/claim/".Length)..];
        var end = rest.IndexOfAny([' ', '\n', '\r', '.']);
        return end < 0 ? rest : rest[..end];
    }
}
