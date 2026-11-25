using ChristianFitness.Domain.Members;

namespace ChristianFitness.Application.Tests.Members;

/// <summary>
/// L2-019 AC1 and AC2 (ADR 0020): which role may use which staff area, one case per row. The rows
/// for the four areas the admin app lists are the same as <c>canManage</c>'s in
/// <c>frontend/projects/domain/src/admin/admin-areas.spec.ts</c>.
/// </summary>
public sealed class StaffAccessTests
{
    public static TheoryData<StaffRoleName, StaffArea, bool, string> Rows => new()
    {
        // role, area, allowed, why
        { StaffRoleName.Admin, StaffArea.Dashboard, true, "an Admin may use every area" },
        { StaffRoleName.Admin, StaffArea.Events, true, "an Admin manages events" },
        { StaffRoleName.Admin, StaffArea.Services, true, "an Admin manages services" },
        { StaffRoleName.Admin, StaffArea.Members, true, "an Admin moderates members" },
        { StaffRoleName.Moderator, StaffArea.Dashboard, true, "a Moderator sees the dashboard" },
        { StaffRoleName.Moderator, StaffArea.Events, false, "a Moderator does not manage events" },
        { StaffRoleName.Moderator, StaffArea.Services, false, "a Moderator does not manage services" },
        { StaffRoleName.Moderator, StaffArea.Members, true, "a Moderator moderates members" },
        { StaffRoleName.Admin, StaffArea.Directory, true, "an Admin reviews listings (ADR 0064)" },
        { StaffRoleName.Moderator, StaffArea.Directory, true, "a Moderator reviews listings (ADR 0064)" },
        { StaffRoleName.Admin, StaffArea.Series, true, "an Admin manages event series" },
        { StaffRoleName.Moderator, StaffArea.Series, true, "a Moderator manages event series (L2-071 AC8; ADR 0064, ADR 0091)" },
        { StaffRoleName.Admin, StaffArea.Publishing, true, "an Admin manages stories and bylines (L2-077; ADR 0093)" },
        { StaffRoleName.Moderator, StaffArea.Publishing, false, "a Moderator does not open Stories (L2-068 AC7, L2-077 AC10)" },
        // The backend's own rows: the console itself, and an endpoint in no area yet.
        { StaffRoleName.Admin, StaffArea.Console, true, "an Admin has a staff session" },
        { StaffRoleName.Moderator, StaffArea.Console, true, "a Moderator has a staff session" },
        { StaffRoleName.Admin, StaffArea.Unlisted, true, "an Admin may use a new area" },
        { StaffRoleName.Moderator, StaffArea.Unlisted, false, "a new area is closed to Moderators until named" },
    };

    [Theory]
    [MemberData(nameof(Rows))]
    public void Given_a_role_and_an_area_When_access_is_decided_Then_it_follows_the_table(StaffRoleName role, StaffArea area, bool allowed, string why)
    {
        Assert.True(StaffAccess.Allows(role, area) == allowed, why);
    }
}
