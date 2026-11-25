using ChristianFitness.Domain.Directory;

namespace ChristianFitness.Application.Tests.Directory;

/// <summary>
/// L2-078 AC1 and AC8 (ADR 0092): a claim link is open for 14 days from issue, expired from then on
/// or once a new link voids it, and used once spent, whatever the time. One row per case.
/// </summary>
public sealed class ClaimLinkStateTests
{
    private static readonly DateTimeOffset Issued = new(2026, 4, 15, 12, 45, 0, TimeSpan.Zero);

    public static TheoryData<string, long, long?, long?, ClaimLinkState> Cases => new()
    {
        // case, ticks after issue it is read at, spent at, voided at, expected
        { "just issued", 0, null, null, ClaimLinkState.Open },
        { "one tick short of 14 days", TimeSpan.FromDays(14).Ticks - 1, null, null, ClaimLinkState.Open },
        { "exactly 14 days", TimeSpan.FromDays(14).Ticks, null, null, ClaimLinkState.Expired },
        { "a month on", TimeSpan.FromDays(30).Ticks, null, null, ClaimLinkState.Expired },
        { "spent, read at once", TimeSpan.FromHours(1).Ticks, TimeSpan.FromHours(1).Ticks, null, ClaimLinkState.Used },
        { "spent, read after expiry", TimeSpan.FromDays(20).Ticks, TimeSpan.FromDays(1).Ticks, null, ClaimLinkState.Used },
        { "voided the next day", TimeSpan.FromDays(1).Ticks, null, TimeSpan.FromDays(1).Ticks, ClaimLinkState.Expired },
        { "spent, then a void is ignored", TimeSpan.FromDays(2).Ticks, TimeSpan.FromDays(1).Ticks, TimeSpan.FromDays(2).Ticks, ClaimLinkState.Used },
    };

    [Theory]
    [MemberData(nameof(Cases))]
    public void Given_a_claim_When_its_state_is_read_Then_it_is_open_used_or_expired(string name, long readAfter, long? spentAfter, long? voidedAfter, ClaimLinkState expected)
    {
        _ = name;
        var (claim, _) = ListingClaim.Issue(Guid.CreateVersion7(Issued), Issued);
        if (spentAfter is long spent)
        {
            claim.Spend(Issued.AddTicks(spent));
        }

        if (voidedAfter is long voided)
        {
            claim.Void(Issued.AddTicks(voided));
        }

        Assert.Equal(expected, claim.StateAt(Issued.AddTicks(readAfter)));
    }
}
