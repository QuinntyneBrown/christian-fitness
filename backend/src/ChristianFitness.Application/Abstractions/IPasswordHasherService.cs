namespace ChristianFitness.Application.Abstractions;

/// <summary>Hashes passwords with ASP.NET Core Identity's PBKDF2 hasher (L2-030 AC1).</summary>
public interface IPasswordHasherService
{
    string Hash(string password);

    bool Verify(string passwordHash, string password);
}
