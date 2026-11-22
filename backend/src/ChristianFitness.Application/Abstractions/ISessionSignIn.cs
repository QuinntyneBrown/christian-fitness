using ChristianFitness.Domain.Members;

namespace ChristianFitness.Application.Abstractions;

/// <summary>Signs a member in: the session the next requests carry (L2-030 AC2).</summary>
public interface ISessionSignIn
{
    Task SignInAsync(Member member);
}
