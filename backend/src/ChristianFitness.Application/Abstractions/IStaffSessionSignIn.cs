using ChristianFitness.Domain.Members;

namespace ChristianFitness.Application.Abstractions;

/// <summary>
/// Signs staff in to and out of the admin app: a session of its own, apart from the member
/// session (L2-018; ADR 0010).
/// </summary>
public interface IStaffSessionSignIn
{
    Task SignInAsync(Member member, StaffRoleName role);

    /// <summary>Ends the current request's staff session on the server and expires its cookie.</summary>
    Task SignOutAsync();
}
