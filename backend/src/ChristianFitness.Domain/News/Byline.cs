using System.Globalization;

namespace ChristianFitness.Domain.News;

/// <summary>
/// A name a story runs under, with a short bio and an optional photo (L2-077; ADR 0094). Only
/// Admins manage bylines; no byline is an account. A story holds its byline's id, so a change to
/// the name shows on every story at once. The name is unique without regard to case, which
/// <see cref="NameKey"/> stores.
/// </summary>
public sealed class Byline
{
    /// <summary>The longest name kept, in characters.</summary>
    public const int NameMaxLength = 80;

    /// <summary>The longest short bio kept, in characters (L2-077 AC3).</summary>
    public const int BioMaxLength = 200;

    private Byline()
    {
    }

    public Guid Id { get; private set; }

    /// <summary>The name as readers see it, trimmed.</summary>
    public string Name { get; private set; } = string.Empty;

    /// <summary>The name compared without regard to case (<see cref="KeyOf"/>); unique, and the list's order.</summary>
    public string NameKey { get; private set; } = string.Empty;

    /// <summary>One or two sentences about the writer, trimmed.</summary>
    public string Bio { get; private set; } = string.Empty;

    /// <summary>The stored photo's key, or none, when the byline shows initials (ADR 0094).</summary>
    public string? PhotoKey { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    /// <summary>How a name is compared: trimmed and lower-cased invariantly, so "Priya Raman" and "PRIYA RAMAN" are one name.</summary>
    public static string KeyOf(string name)
    {
        ArgumentNullException.ThrowIfNull(name);
        return name.Trim().ToLower(CultureInfo.InvariantCulture);
    }

    /// <summary>A new byline; the validator has checked every limit.</summary>
    public static Byline Create(string name, string bio, string? photoKey, DateTimeOffset createdAt) =>
        Create(Guid.CreateVersion7(createdAt), name, bio, photoKey, createdAt);

    /// <summary>A byline with a known id, as the seed adds the starting set (L2-077 AC2).</summary>
    public static Byline Create(Guid id, string name, string bio, string? photoKey, DateTimeOffset createdAt)
    {
        var byline = new Byline { Id = id, CreatedAt = createdAt };
        byline.Describe(name, bio, photoKey);
        return byline;
    }

    /// <summary>Changes the name, bio and photo (L2-077 AC5); each text is trimmed.</summary>
    public void Describe(string name, string bio, string? photoKey)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        ArgumentException.ThrowIfNullOrWhiteSpace(bio);
        Name = name.Trim();
        NameKey = KeyOf(name);
        Bio = bio.Trim();
        PhotoKey = photoKey;
    }
}
