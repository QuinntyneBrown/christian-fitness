using ChristianFitness.Domain.News;

namespace ChristianFitness.Application.Tests.News;

/// <summary>
/// The scheduling rules of <see cref="Story"/> (L2-069 AC2, AC4, AC7; ADR 0069, ADR 0104), one row
/// per case: a Scheduled story is Published once its time has come, by every read and every
/// command; it is scheduled only for a time after now; the clock publishes it at its own time.
/// </summary>
public sealed class StoryScheduleTests
{
    private static readonly DateTimeOffset Now = new(2026, 4, 15, 12, 45, 0, TimeSpan.Zero);

    private static Story Scheduled(TimeSpan fromNow)
    {
        var story = Story.Create(Story.Blank with { Headline = "Scheduled", Text = "Words." }, Now.AddDays(-1));
        story.Schedule(Now + fromNow, Guid.NewGuid(), Now.AddDays(-1).AddMinutes(1));
        return story;
    }

    [Theory]
    [InlineData(1, StoryStatus.Scheduled, false)]
    [InlineData(0, StoryStatus.Published, true)]
    [InlineData(-1, StoryStatus.Published, true)]
    [InlineData(-3600, StoryStatus.Published, true)]
    public void A_Scheduled_story_is_Published_once_its_time_has_come(int secondsFromNow, StoryStatus effective, bool due)
    {
        var story = Scheduled(TimeSpan.FromSeconds(secondsFromNow));

        Assert.Equal((effective, due), (story.EffectiveStatus(Now), story.IsDue(Now)));
        Assert.Equal(due ? Now.AddSeconds(secondsFromNow) : null, story.EffectivePublishedAt(Now));
        Assert.Equal(StoryStatus.Scheduled, story.Status);
    }

    [Theory]
    [InlineData(StoryStatus.Draft)]
    [InlineData(StoryStatus.InReview)]
    [InlineData(StoryStatus.Published)]
    public void A_story_that_is_not_Scheduled_reads_as_it_is(StoryStatus status)
    {
        var story = Story.Create(Story.Blank with { Headline = "Not scheduled", Text = "Words." }, Now.AddDays(-1));
        if (status == StoryStatus.InReview)
        {
            story.SendForReview(Now.AddDays(-1));
        }
        else if (status == StoryStatus.Published)
        {
            story.Publish(Now.AddDays(-1));
        }

        Assert.Equal((status, false), (story.EffectiveStatus(Now), story.IsDue(Now)));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-60)]
    public void A_story_is_scheduled_only_for_a_time_after_now(int secondsFromNow)
    {
        var story = Story.Create(Story.Blank with { Headline = "Too late", Text = "Words." }, Now);

        Assert.Throws<ArgumentOutOfRangeException>(() => story.Schedule(Now.AddSeconds(secondsFromNow), Guid.NewGuid(), Now));
        Assert.Equal(StoryStatus.Draft, story.Status);
    }

    [Fact]
    public void A_due_story_can_no_longer_be_unscheduled_or_published_now_but_can_be_unpublished()
    {
        var story = Scheduled(TimeSpan.FromSeconds(-1));

        Assert.Throws<InvalidOperationException>(() => story.Unschedule(Now));
        Assert.Throws<InvalidOperationException>(() => story.Publish(Now));
        Assert.Throws<InvalidOperationException>(() => story.Edit(story.Content, Now));

        story.Unpublish(Now);

        Assert.Equal(
            (StoryStatus.Draft, (DateTimeOffset?)null, Now.AddSeconds(-1), (DateTimeOffset?)null),
            (story.Status, story.PublishedAt, story.FirstPublishedAt!.Value, story.PublishAt));
    }

    [Fact]
    public void A_story_before_its_time_can_be_unscheduled_to_a_Draft_with_no_time()
    {
        var story = Scheduled(TimeSpan.FromMinutes(1));

        story.Unschedule(Now);

        Assert.Equal((StoryStatus.Draft, (DateTimeOffset?)null, (Guid?)null), (story.Status, story.PublishAt, story.ScheduledById));
    }

    [Fact]
    public void The_clock_publishes_a_due_story_at_its_own_time_once_and_refuses_one_not_due()
    {
        var early = Scheduled(TimeSpan.FromMinutes(1));
        Assert.Throws<InvalidOperationException>(() => early.PublishDue(Now));

        var story = Scheduled(TimeSpan.FromSeconds(-20));
        var version = story.Version;
        story.PublishDue(Now);

        Assert.Equal(
            (StoryStatus.Published, Now.AddSeconds(-20), Now.AddSeconds(-20), (DateTimeOffset?)null, version + 1),
            (story.Status, story.PublishedAt!.Value, story.FirstPublishedAt!.Value, story.PublishAt, story.Version));
        Assert.Throws<InvalidOperationException>(() => story.PublishDue(Now));
    }
}
