using ChristianFitness.Domain.Directory;

namespace ChristianFitness.Application.Tests.Directory;

/// <summary>
/// L2-079 AC2 and AC5 (ADR 0093): a name or kind the owner sends that differs from the live one
/// waits for staff while the live one stays; sending the live one again withdraws it; asking again
/// for the same change keeps when it was first asked. One row per case.
/// </summary>
public sealed class ListingNameChangeTests
{
    private const string Live = "Eastside Ladies Who Lift";
    private static readonly DateTimeOffset First = new(2026, 11, 20, 14, 0, 0, TimeSpan.Zero);
    private static readonly DateTimeOffset Later = First.AddDays(2);

    public static TheoryData<string, string?, ListingKind?, string, ListingKind, string?, ListingKind?, DateTimeOffset?> Cases => new()
    {
        // case, waiting name, waiting kind (before), name sent, kind sent, expected waiting name, kind, since
        { "the live name and kind: nothing waits", null, null, Live, ListingKind.Organization, null, null, null },
        { "the live name with spaces round it: nothing waits", null, null, "  Eastside Ladies Who Lift ", ListingKind.Organization, null, null, null },
        { "a new name waits, with the live kind", null, null, "Eastside Strength Club", ListingKind.Organization, "Eastside Strength Club", ListingKind.Organization, Later },
        { "a new kind waits, with the live name", null, null, Live, ListingKind.ChurchMinistry, Live, ListingKind.ChurchMinistry, Later },
        { "a new name, trimmed", null, null, " Eastside Strength Club ", ListingKind.Organization, "Eastside Strength Club", ListingKind.Organization, Later },
        { "a case change is a new name", null, null, "Eastside ladies who lift", ListingKind.Organization, "Eastside ladies who lift", ListingKind.Organization, Later },
        { "the same change again keeps when it was asked", "Eastside Strength Club", ListingKind.Organization, "Eastside Strength Club", ListingKind.Organization, "Eastside Strength Club", ListingKind.Organization, First },
        { "another change replaces the waiting one", "Eastside Strength Club", ListingKind.Organization, "Eastside Iron", ListingKind.Organization, "Eastside Iron", ListingKind.Organization, Later },
        { "the live one again withdraws the waiting one", "Eastside Strength Club", ListingKind.Organization, Live, ListingKind.Organization, null, null, null },
    };

    [Theory]
    [MemberData(nameof(Cases))]
    public void Given_a_listing_When_its_owner_sends_a_name_and_kind_Then_a_different_one_waits_and_the_live_one_stays(
        string name, string? waitingName, ListingKind? waitingKind, string sentName, ListingKind sentKind,
        string? expectedName, ListingKind? expectedKind, DateTimeOffset? expectedSince)
    {
        _ = name;
        var listing = DirectoryListing.CreateDraft(Guid.CreateVersion7(First), ListingKind.Organization, Live, "Saturday strength", "East York", ["Strength"], First);
        if (waitingName is not null)
        {
            listing.AskToRename(waitingName, waitingKind!.Value, First);
        }

        listing.AskToRename(sentName, sentKind, Later);

        Assert.Equal((expectedName, expectedKind, expectedSince), (listing.PendingName, listing.PendingKind, listing.PendingSince));
        Assert.Equal((Live, ListingKind.Organization), (listing.Name, listing.Kind));
    }

    [Fact]
    public void Given_a_waiting_name_When_staff_approve_it_Then_it_goes_live_and_nothing_waits()
    {
        var listing = DirectoryListing.CreateDraft(Guid.CreateVersion7(First), ListingKind.Organization, Live, "Saturday strength", "East York", ["Strength"], First);
        listing.AskToRename("Eastside Strength Club", ListingKind.ChurchMinistry, First);

        listing.ApproveRename();

        Assert.Equal(("Eastside Strength Club", ListingKind.ChurchMinistry), (listing.Name, listing.Kind));
        Assert.Equal((null, null, null), (listing.PendingName, listing.PendingKind, (DateTimeOffset?)listing.PendingSince));
        Assert.Equal(SearchFold.Of("Eastside Strength Club"), listing.NameKey);
    }

    [Fact]
    public void Given_a_waiting_name_When_staff_decline_it_Then_the_live_one_stays_and_nothing_waits()
    {
        var listing = DirectoryListing.CreateDraft(Guid.CreateVersion7(First), ListingKind.Organization, Live, "Saturday strength", "East York", ["Strength"], First);
        listing.AskToRename("Eastside Strength Club", ListingKind.ChurchMinistry, First);

        listing.DeclineRename();

        Assert.Equal((Live, ListingKind.Organization), (listing.Name, listing.Kind));
        Assert.Equal((null, null, null), (listing.PendingName, listing.PendingKind, (DateTimeOffset?)listing.PendingSince));
    }
}
