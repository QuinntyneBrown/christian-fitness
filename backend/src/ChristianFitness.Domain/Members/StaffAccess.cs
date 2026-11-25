namespace ChristianFitness.Domain.Members;

/// <summary>
/// Which staff role may use which area of the admin console (L2-019 AC1, AC2; ADR 0020): an Admin
/// every area; a Moderator the console, the Dashboard and Members, so they moderate members but
/// manage neither events nor services, nor anything not yet in an area.
/// </summary>
public static class StaffAccess
{
    public static bool Allows(StaffRoleName role, StaffArea area) => role switch
    {
        StaffRoleName.Admin => true,
        StaffRoleName.Moderator => area is StaffArea.Console or StaffArea.Dashboard or StaffArea.Members or StaffArea.Directory,
        _ => false,
    };
}
