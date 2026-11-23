using System.Security.Claims;
using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Errors;
using ChristianFitness.Domain.Members;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Infrastructure.Security;

/// <summary>The staff area an admin endpoint belongs to; its policy carries it (L2-019; ADR 0020).</summary>
public sealed class StaffAreaRequirement(StaffArea area) : IAuthorizationRequirement
{
    public StaffArea Area { get; } = area;
}

/// <summary>
/// Decides a <see cref="StaffAreaRequirement"/> from the role the database holds now, read on every
/// admin request, so a role changed or taken away applies at the next request without a new sign-in
/// (L2-019 AC4; ADR 0020). The role claim the staff cookie carries from sign-in is not read. A member
/// without a role fails with <c>not_staff</c>; a role the area refuses fails with
/// <c>forbidden_role</c> (L2-019 AC1). The failure's message is the code the API's refusal carries.
/// Nothing here logs the member or the role.
/// </summary>
internal sealed class StaffAreaAuthorizationHandler(IAppDbContext db) : AuthorizationHandler<StaffAreaRequirement>
{
    protected override async Task HandleRequirementAsync(AuthorizationHandlerContext context, StaffAreaRequirement requirement)
    {
        // An anonymous request fails the policy's authenticated-user rule and is challenged with 401.
        if (context.User.Identity?.IsAuthenticated != true
            || !Guid.TryParse(context.User.FindFirstValue(ClaimTypes.NameIdentifier), out var memberId))
        {
            return;
        }

        var role = await db.StaffRoles
            .Where(staff => staff.MemberId == memberId)
            .Select(staff => (StaffRoleName?)staff.Name)
            .SingleOrDefaultAsync()
            .ConfigureAwait(false);
        if (role is not { } name)
        {
            context.Fail(new AuthorizationFailureReason(this, RefusalCodes.NotStaff));
        }
        else if (StaffAccess.Allows(name, requirement.Area))
        {
            context.Succeed(requirement);
        }
        else
        {
            context.Fail(new AuthorizationFailureReason(this, RefusalCodes.ForbiddenRole));
        }
    }
}
