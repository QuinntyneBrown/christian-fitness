namespace ChristianFitness.Domain.Members;

/// <summary>Makes a member staff, with one role (L2-019).</summary>
public sealed class StaffRole
{
    private StaffRole()
    {
    }

    public Guid MemberId { get; private set; }

    public StaffRoleName Name { get; private set; }

    public static StaffRole Grant(Member member, StaffRoleName name)
    {
        ArgumentNullException.ThrowIfNull(member);
        return new StaffRole { MemberId = member.Id, Name = name };
    }
}
