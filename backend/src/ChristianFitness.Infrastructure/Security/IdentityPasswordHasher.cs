using ChristianFitness.Application.Abstractions;
using ChristianFitness.Domain.Members;
using Microsoft.AspNetCore.Identity;

namespace ChristianFitness.Infrastructure.Security;

/// <summary>ASP.NET Core Identity's PBKDF2 hasher (L2-030 AC1). The member is not part of the hash.</summary>
public sealed class IdentityPasswordHasher : IPasswordHasherService
{
    private readonly PasswordHasher<Member> _hasher = new();

    public string Hash(string password) => _hasher.HashPassword(null!, password);

    public bool Verify(string passwordHash, string password) =>
        _hasher.VerifyHashedPassword(null!, passwordHash, password) != PasswordVerificationResult.Failed;
}
