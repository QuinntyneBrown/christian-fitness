using ChristianFitness.Domain.Members;

namespace ChristianFitness.Application.Tests.Members;

/// <summary>
/// L2-029 AC1 to AC3 and AC6 (ADR 0025, ADR 0026): the transition table, one case per row. A flag
/// or a suspension the status allows moves the status and keeps the note, trimmed; a
/// reinstatement returns the member to Active and clears the note; a change the status does not
/// allow changes nothing, the earlier note included.
/// </summary>
public sealed class MemberModerationTests
{
    private const string Flag = "flag";
    private const string Suspend = "suspend";
    private const string Reinstate = "reinstate";
    private const string Earlier = "An earlier note";

    public static TheoryData<MemberStatus, string, MemberStatus?> Rows() => new()
    {
        // from, action, the status after, or none when the change is refused
        { MemberStatus.Active, Flag, MemberStatus.Flagged },
        { MemberStatus.Flagged, Flag, null },
        { MemberStatus.Suspended, Flag, null },
        { MemberStatus.Active, Suspend, MemberStatus.Suspended },
        { MemberStatus.Flagged, Suspend, MemberStatus.Suspended },
        { MemberStatus.Suspended, Suspend, null },
        { MemberStatus.Active, Reinstate, null },
        { MemberStatus.Flagged, Reinstate, MemberStatus.Active },
        { MemberStatus.Suspended, Reinstate, MemberStatus.Active },
    };

    [Theory]
    [MemberData(nameof(Rows))]
    public void Given_a_member_When_they_are_flagged_or_suspended_Then_only_what_their_status_allows_changes_them(MemberStatus from, string action, MemberStatus? after)
    {
        var member = Member.Join("Priya Nair", "priya.nair@gmail.com", "hash", new DateTimeOffset(2026, 2, 20, 17, 0, 0, TimeSpan.Zero));
        if (from != MemberStatus.Active)
        {
            Assert.True(member.TryFlag(Earlier));
        }

        if (from == MemberStatus.Suspended)
        {
            Assert.True(member.TrySuspend(Earlier));
        }

        var earlier = member.ModerationNote;
        var changed = action switch
        {
            Flag => member.TryFlag("  Two members asked about messages from this account "),
            Suspend => member.TrySuspend("  Two members asked about messages from this account "),
            _ => member.TryReinstate(),
        };

        Assert.Equal(after is not null, changed);
        Assert.Equal(after ?? from, member.Status);
        // A refused change keeps what was there; a reinstatement clears the note (ADR 0026).
        var expectedNote = after is null ? earlier : action == Reinstate ? null : "Two members asked about messages from this account";
        Assert.Equal(expectedNote, member.ModerationNote);
    }

    [Fact]
    public void Given_a_new_member_When_nothing_has_been_done_Then_they_are_active_with_no_note()
    {
        var member = Member.Join("Priya Nair", "priya.nair@gmail.com", "hash", DateTimeOffset.UnixEpoch);

        Assert.Equal(MemberStatus.Active, member.Status);
        Assert.Null(member.ModerationNote);
    }
}
