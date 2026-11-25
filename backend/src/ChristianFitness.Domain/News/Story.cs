namespace ChristianFitness.Domain.News;

/// <summary>
/// A story Admins write and publish (L1-022, L2-068). Journey 21 adds only what bylines need: the
/// story's byline, which the database keeps (a story can never lose its byline, L2-077 AC7), and its
/// headline. Writing and publishing (issue 172) extends this entity with the editor's fields
/// (ADR 0093).
/// </summary>
public sealed class Story
{
    private Story()
    {
    }

    public Guid Id { get; private set; }

    /// <summary>The byline the story runs under; required, and never removed while a story holds it.</summary>
    public Guid BylineId { get; private set; }

    public string Headline { get; private set; } = string.Empty;

    public DateTimeOffset CreatedAt { get; private set; }

    /// <summary>A new story under <paramref name="bylineId"/>.</summary>
    public static Story Create(Guid bylineId, string headline, DateTimeOffset createdAt)
    {
        ArgumentNullException.ThrowIfNull(headline);
        return new Story { Id = Guid.CreateVersion7(createdAt), BylineId = bylineId, Headline = headline.Trim(), CreatedAt = createdAt };
    }
}
