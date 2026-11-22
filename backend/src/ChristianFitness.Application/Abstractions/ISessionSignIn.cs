using ChristianFitness.Domain.Members;

namespace ChristianFitness.Application.Abstractions;

/// <summary>Signs a member in and out: the session the next requests carry (L2-030 AC2, L2-004 AC5).</summary>
public interface ISessionSignIn
{
    Task SignInAsync(Member member);

    /// <summary>Ends the current request's session on the server and expires its cookie.</summary>
    Task SignOutAsync();
}
