using ChristianFitness.Domain.Directory;

namespace ChristianFitness.Application.Tests.Directory;

/// <summary>
/// L2-078 AC1 and AC8 (ADR 0091): a claim link is open for 14 days from issue, expired from then on,
/// and used once spent, whatever the time. One row per case.
/// </summary>
public sealed class ClaimLinkStateTests
{
    private static readonly DateTimeOffset Issued = new(2026, 4, 15, 12, 45, 0, TimeSpan.Zero);

    public static TheoryData<string, long, long?, ClaimLinkState> Cases => new()
    {
        // case, ticks after issue it is read at, ticks after issue it was spent at, expected
        { "just issued", 0, null, ClaimLinkState.Open },
        { "one tick short of 14 days", TimeSpan.FromDays(14).Ticks - 1, null, ClaimLinkState.Open },
        { "exactly 14 days", TimeSpan.FromDays(14).Ticks, null, ClaimLinkState.Expired },
        { "a month on", TimeSpan.FromDays(30).Ticks, null, ClaimLinkState.Expired },
        { "spent, read at once", TimeSpan.FromHours(1).Ticks, TimeSpan.FromHours(1).Ticks, ClaimLinkState.Used },
        { "spent, read after expiry", TimeSpan.FromDays(20).Ticks, TimeSpan.FromDays(1).Ticks, ClaimLinkState.Used },
    };

    [Theory]
    [MemberData(nameof(Cases))]
    public void Given_a_claim_When_its_state_is_read_Then_it_is_open_used_or_expired(string name, long readAfter, long? spentAfter, ClaimLinkState expected)
    {
        _ = name;
        var (claim, _) = ListingClaim.Issue(Guid.CreateVersion7(Issued), Issued);
        if (spentAfter is long spent)
        {
            claim.Spend(Issued.AddTicks(spent));
        }

        Assert.Equal(expected, claim.StateAt(Issued.AddTicks(readAfter)));
    }
}
