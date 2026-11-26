using ChristianFitness.Api.Scheduling;
using ChristianFitness.Api.Tests.Stories;
using ChristianFitness.Domain.News;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Scheduling;

/// <summary>
/// ADR 0069 and ADR 0104: before each tick a clock takes the scheduler's exclusive database lease;
/// a clock that cannot take it skips the tick and changes nothing. The holder renews it on each tick,
/// and it expires 60 seconds after the last, so another replica takes over from one that stopped.
/// Two clocks ticking at once publish a due story once, audited once. Each clock here is driven
/// tick by tick (<see cref="PublishingClock.TickAsync"/>) against the shared fake clock; no hosted
/// clock runs in this host.
/// </summary>
public sealed class SchedulerLeaseTests(StoriesFactory factory) : IClassFixture<StoriesFactory>
{
    private PublishingClock ClockOf(string holder) =>
        ActivatorUtilities.CreateInstance<PublishingClock>(factory.Services, holder);

    [Fact]
    public async Task Given_one_replica_holds_the_lease_When_another_ticks_before_it_expires_Then_the_other_skips_and_takes_over_once_it_expires()
    {
        var first = ClockOf("replica-a");
        var second = ClockOf("replica-b");
        // Past any lease another test of the class left.
        factory.Time.Advance(TimeSpan.FromMinutes(5));
        var story = await factory.PutStoryAsync("Lease story", StoryStatus.Scheduled, at: factory.Time.GetUtcNow().AddHours(-1), publishAt: factory.Time.GetUtcNow().AddSeconds(10));

        var held = await first.TickAsync(TestContext.Current.CancellationToken);
        Assert.Equal(new PublishingTick(true, 0), held);

        factory.Time.Advance(TimeSpan.FromSeconds(30));
        var skipped = await second.TickAsync(TestContext.Current.CancellationToken);
        Assert.Equal(new PublishingTick(false, 0), skipped);
        Assert.Equal(StoryStatus.Scheduled, (await factory.FindStoryAsync(story.Id))!.Status);

        // The holder stops: 60 seconds after its last tick the lease is free to take.
        factory.Time.Advance(TimeSpan.FromSeconds(29));
        Assert.Equal(new PublishingTick(false, 0), await second.TickAsync(TestContext.Current.CancellationToken));
        factory.Time.Advance(TimeSpan.FromSeconds(1));
        var taken = await second.TickAsync(TestContext.Current.CancellationToken);

        Assert.True(taken.Held);
        Assert.Equal(StoryStatus.Published, (await factory.FindStoryAsync(story.Id))!.Status);
        Assert.Equal(new PublishingTick(false, 0), await first.TickAsync(TestContext.Current.CancellationToken));
        factory.Time.Advance(TimeSpan.FromMinutes(5));
    }

    [Fact]
    public async Task Given_the_holder_ticks_again_When_another_replica_ticks_Then_the_renewed_lease_keeps_it_out()
    {
        var first = ClockOf("replica-c");
        var second = ClockOf("replica-d");
        factory.Time.Advance(TimeSpan.FromMinutes(5));

        Assert.True((await first.TickAsync(TestContext.Current.CancellationToken)).Held);
        factory.Time.Advance(TimeSpan.FromSeconds(45));
        Assert.True((await first.TickAsync(TestContext.Current.CancellationToken)).Held);
        factory.Time.Advance(TimeSpan.FromSeconds(45));

        Assert.False((await second.TickAsync(TestContext.Current.CancellationToken)).Held);
        factory.Time.Advance(TimeSpan.FromMinutes(5));
    }

    [Fact]
    public async Task Given_a_due_story_placed_as_the_Lead_When_the_clock_publishes_it_Then_it_is_the_only_Lead()
    {
        factory.Time.Advance(TimeSpan.FromMinutes(5));
        await factory.ClearLeadsAsync();
        var previous = await factory.PutStoryAsync("Lead before the clock", StoryStatus.Published, placement: StoryPlacement.Lead);
        var due = await factory.PutStoryAsync("Lead by the clock", StoryStatus.Scheduled, at: factory.Time.GetUtcNow().AddHours(-1), placement: StoryPlacement.Lead, publishAt: factory.Time.GetUtcNow().AddSeconds(-5));

        var tick = await ClockOf("replica-lead").TickAsync(TestContext.Current.CancellationToken);

        Assert.True(tick.Held);
        Assert.Equal([due.Id], await factory.PublishedLeadsAsync());
        Assert.Equal((StoryStatus.Published, StoryPlacement.Latest), ((await factory.FindStoryAsync(previous.Id))!.Status, (await factory.FindStoryAsync(previous.Id))!.Placement));
        factory.Time.Advance(TimeSpan.FromMinutes(5));
    }

    [Fact]
    public async Task Given_due_stories_When_two_replicas_tick_at_once_Then_each_story_is_published_once_and_audited_once()
    {
        factory.Time.Advance(TimeSpan.FromMinutes(5));
        var by = Guid.NewGuid();
        var stories = new List<Story>();
        for (var n = 0; n < 3; n++)
        {
            stories.Add(await factory.PutStoryAsync($"Raced lease story {n}", StoryStatus.Scheduled, at: factory.Time.GetUtcNow().AddHours(-1), publishAt: factory.Time.GetUtcNow().AddMinutes(-n - 1), scheduledBy: by));
        }

        var ticks = await Task.WhenAll(ClockOf("replica-e").TickAsync(TestContext.Current.CancellationToken), ClockOf("replica-f").TickAsync(TestContext.Current.CancellationToken));

        Assert.Equal(3, ticks.Sum(t => t.Published));
        foreach (var story in stories)
        {
            Assert.Equal(StoryStatus.Published, (await factory.FindStoryAsync(story.Id))!.Status);
            Assert.Equal([(by, "story.published", "Story")], await factory.AuditOfAsync(story.Id));
        }

        factory.Time.Advance(TimeSpan.FromMinutes(5));
    }
}
