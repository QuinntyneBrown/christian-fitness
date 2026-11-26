namespace ChristianFitness.Domain.News;

/// <summary>
/// How many times a Published story was read on one Toronto day (L2-061 AC12; ADR 0105): one row
/// per story and day, so the store grows with the days a story is read, not with its readers.
/// <see cref="Count"/> is the concurrency token, so two reads saved at once never lose one.
/// </summary>
public sealed class StoryReadTally
{
    private StoryReadTally()
    {
    }

    public Guid StoryId { get; private set; }

    /// <summary>The Toronto date the reads were counted on.</summary>
    public DateOnly Day { get; private set; }

    public int Count { get; private set; }

    /// <summary>The day's first read of the story.</summary>
    public static StoryReadTally First(Guid storyId, DateOnly day) => new() { StoryId = storyId, Day = day, Count = 1 };

    /// <summary>One more read on the day.</summary>
    public void Add() => Count++;
}
