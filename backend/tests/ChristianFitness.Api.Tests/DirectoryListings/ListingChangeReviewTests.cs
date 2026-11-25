using System.Net;
using System.Text.Json;
using ChristianFitness.Api.Tests.Events;
using ChristianFitness.Domain.Directory;
using ChristianFitness.Domain.Members;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Api.Tests.DirectoryListings;

/// <summary>
/// L2-079 AC5 (journey 20; ADR 0095): Listed shows a name or kind an owner asked for, waiting, with
/// the listing's focus tags and contact email; staff approve it (it goes live, audited
/// <c>listing.change_approved</c>) or decline it (the live one stays, audited
/// <c>listing.change_declined</c>). Nothing waiting is 409 <c>no_change_waiting</c>.
/// </summary>
public sealed class ListingChangeReviewTests(RegisterForEventFactory factory) : IClassFixture<RegisterForEventFactory>
{
    private readonly ReviewSuggestions _review = new(factory);

    private Task<Guid> ListingAsync(string name, string? waitingName = null, ListingStatus status = ListingStatus.Published) =>
        _review.InDbAsync(async db =>
        {
            var now = factory.Time.GetUtcNow();
            var listing = DirectoryListing.CreateDraft(Guid.CreateVersion7(now), ListingKind.Organization, name, "A tagline", "East York", ["Strength", "Women"], now, "About it.");
            if (status == ListingStatus.Published)
            {
                listing.Publish(now);
            }

            listing.SetContact("lead@eastside.example");
            if (waitingName is not null)
            {
                listing.AskToRename(waitingName, ListingKind.ChurchMinistry, now);
            }

            db.DirectoryListings.Add(listing);
            await db.SaveChangesAsync(TestContext.Current.CancellationToken);
            return listing.Id;
        });

    private async Task<(HttpStatusCode Status, JsonElement Body)> DecideAsync(Guid id, string decision, string staffEmail)
    {
        var (staff, cookie, _) = await _review.StaffAsync(staffEmail, StaffRoleName.Moderator);
        using var _staff = staff;
        using var response = await ReviewSuggestions.SendAsync(staff, HttpMethod.Post, $"/listings/{id}/change/{decision}", cookie);
        return (response.StatusCode, await ReviewSuggestions.JsonAsync(response));
    }

    [Fact]
    public async Task Given_a_listing_with_a_waiting_name_When_staff_open_Listed_Then_its_row_has_the_waiting_name_and_kind_its_focus_and_contact()
    {
        var id = await ListingAsync("Change Eastside Ladies", "Change Eastside Strength");
        var (staff, cookie, _) = await _review.StaffAsync("dana.change1@example.org", StaffRoleName.Moderator);
        using var _staff = staff;

        using var response = await ReviewSuggestions.SendAsync(staff, HttpMethod.Get, "/listings", cookie);

        var row = (await ReviewSuggestions.JsonAsync(response)).GetProperty("listings").EnumerateArray().Single(r => r.GetProperty("id").GetGuid() == id);
        Assert.Equal(
            ["about", "area", "contactEmail", "focus", "followers", "id", "kind", "name", "pendingKind", "pendingName", "photoKey", "tagline", "verified", "website"],
            row.EnumerateObject().Select(p => p.Name).Order(StringComparer.Ordinal));
        Assert.Equal(("Change Eastside Ladies", "Change Eastside Strength", "church-ministry"), (row.GetProperty("name").GetString(), row.GetProperty("pendingName").GetString(), row.GetProperty("pendingKind").GetString()));
        Assert.Equal(["Strength", "Women"], row.GetProperty("focus").EnumerateArray().Select(f => f.GetString()!));
        Assert.Equal("lead@eastside.example", row.GetProperty("contactEmail").GetString());
    }

    [Fact]
    public async Task Given_a_waiting_name_When_staff_approve_it_Then_it_goes_live_nothing_waits_and_it_is_audited()
    {
        var id = await ListingAsync("Approve Eastside Ladies", "Approve Eastside Strength");

        var (status, row) = await DecideAsync(id, "approve", "dana.change2@example.org");

        Assert.Equal(HttpStatusCode.OK, status);
        Assert.Equal(("Approve Eastside Strength", "church-ministry"), (row.GetProperty("name").GetString(), row.GetProperty("kind").GetString()));
        Assert.Equal((JsonValueKind.Null, JsonValueKind.Null), (row.GetProperty("pendingName").ValueKind, row.GetProperty("pendingKind").ValueKind));
        var stored = await _review.InDbAsync(db => db.DirectoryListings.SingleAsync(l => l.Id == id, TestContext.Current.CancellationToken));
        Assert.Equal(("Approve Eastside Strength", ListingKind.ChurchMinistry, (string?)null), (stored.Name, stored.Kind, stored.PendingName));
        Assert.True(await _review.InDbAsync(db => db.AuditEntries.AnyAsync(e => e.RecordId == id && e.Action == "listing.change_approved", TestContext.Current.CancellationToken)));
    }

    [Fact]
    public async Task Given_a_waiting_name_When_staff_decline_it_Then_the_live_one_stays_nothing_waits_and_it_is_audited()
    {
        var id = await ListingAsync("Decline Eastside Ladies", "Decline Eastside Strength");

        var (status, row) = await DecideAsync(id, "decline", "dana.change3@example.org");

        Assert.Equal(HttpStatusCode.OK, status);
        Assert.Equal(("Decline Eastside Ladies", "organization"), (row.GetProperty("name").GetString(), row.GetProperty("kind").GetString()));
        Assert.Equal(JsonValueKind.Null, row.GetProperty("pendingName").ValueKind);
        var stored = await _review.InDbAsync(db => db.DirectoryListings.SingleAsync(l => l.Id == id, TestContext.Current.CancellationToken));
        Assert.Equal(("Decline Eastside Ladies", (string?)null), (stored.Name, stored.PendingName));
        Assert.True(await _review.InDbAsync(db => db.AuditEntries.AnyAsync(e => e.RecordId == id && e.Action == "listing.change_declined", TestContext.Current.CancellationToken)));
    }

    [Theory]
    [InlineData("approve")]
    [InlineData("decline")]
    public async Task Given_nothing_waiting_When_staff_decide_Then_it_is_refused_no_change_waiting(string decision)
    {
        var id = await ListingAsync($"Nothing Waiting {decision}");

        var (status, body) = await DecideAsync(id, decision, $"dana.change4.{decision}@example.org");

        Assert.Equal(HttpStatusCode.Conflict, status);
        Assert.Equal("no_change_waiting", body.GetProperty("code").GetString());
    }

    [Fact]
    public async Task Given_a_listing_that_is_not_published_When_staff_approve_its_change_Then_it_is_refused_listing_not_found()
    {
        var id = await ListingAsync("Draft Eastside Ladies", "Draft Eastside Strength", ListingStatus.Draft);

        var (status, body) = await DecideAsync(id, "approve", "dana.change5@example.org");

        Assert.Equal(HttpStatusCode.NotFound, status);
        Assert.Equal("listing_not_found", body.GetProperty("code").GetString());
    }

    [Fact]
    public async Task Given_a_member_who_is_not_staff_When_they_approve_a_change_Then_they_must_sign_in_as_staff()
    {
        var id = await ListingAsync("Member Eastside Ladies", "Member Eastside Strength");
        var member = await _review.SuggestAsync("not.staff.change@example.org", "Not Staff");
        using var client = Browser.CreateClient(factory);

        using var response = await ReviewSuggestions.SendAsync(client, HttpMethod.Post, $"/listings/{id}/change/approve", member.Cookie);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        var stored = await _review.InDbAsync(db => db.DirectoryListings.SingleAsync(l => l.Id == id, TestContext.Current.CancellationToken));
        Assert.Equal("Member Eastside Strength", stored.PendingName);
    }
}
