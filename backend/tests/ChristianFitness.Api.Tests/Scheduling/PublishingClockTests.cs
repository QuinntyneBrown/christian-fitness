using System.Globalization;
using System.Net;
using System.Threading.Channels;
using ChristianFitness.Api.Scheduling;
using ChristianFitness.Api.Tests.Stories;
using ChristianFitness.Domain.Events;
using ChristianFitness.Domain.Members;
using ChristianFitness.Domain.News;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace ChristianFitness.Api.Tests.Scheduling;

/// <summary>
/// L2-069 AC4, AC6, AC14 (ADR 0069, ADR 0104): the API's publishing clock ticks every 30 seconds
/// of its <see cref="TimeProvider"/>, so a story scheduled through the API is stored as Published
/// at its time within a minute of it, with one <c>story.published</c> audit entry against the Admin
/// who scheduled it, however many ticks follow. The clock runs only in this fixture's host, and
/// the test moves its fake clock: it never sleeps, and it awaits each tick with a timeout that
/// names the ticks that did come.
/// </summary>
public sealed class PublishingClockTests(PublishingClockTests.Factory factory) : IClassFixture<PublishingClockTests.Factory>
{
    /// <summary>The stories API with the publishing clock running, as Program runs it.</summary>
    public sealed class Factory : StoriesFactory
    {
        protected override void ConfigureServices(IServiceCollection services)
        {
            base.ConfigureServices(services);
            services.AddPublishingClock();
        }

        /// <summary>The running clock.</summary>
        internal PublishingClock Clock => Services.GetServices<IHostedService>().OfType<PublishingClock>().Single();
    }

    [Fact]
    public async Task Given_a_story_scheduled_through_the_API_When_its_time_comes_Then_the_clock_publishes_it_within_a_minute_at_its_time_and_audits_it_once()
    {
        var ticks = Channel.CreateUnbounded<PublishingTick>();
        void Heard(object? sender, PublishingTick tick) => ticks.Writer.TryWrite(tick);
        factory.Clock.Ticked += Heard;
        try
        {
            var byline = await factory.AddBylineAsync("Clock Writer");
            var story = await factory.PutStoryAsync("Clock story", bylineId: byline);
            var client = Browser.CreateClient(factory);
            using (client)
            {
                var cookie = await AdminStories.SignInAsync(factory, client, "dana.stories.clock@example.org", StaffRoleName.Admin);
                var staff = await factory.MemberIdAsync("dana.stories.clock@example.org");
                // Two whole minutes on, as the editor names a time.
                var now = factory.Time.GetUtcNow();
                var at = now.AddSeconds(-now.Second).AddMinutes(2);
                var (date, time) = EventSchedule.TorontoOf(at);
                var body = WriteStoryTests.Fields(byline, story.Version);
                body["publishDate"] = date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
                body["publishTime"] = time.ToString("HH:mm", CultureInfo.InvariantCulture);
                using var scheduled = await AdminStories.SendAsync(client, HttpMethod.Post, $"{AdminStories.Path}/{story.Id}/schedule", cookie, body);
                Assert.Equal(HttpStatusCode.OK, scheduled.StatusCode);

                // Tick by tick until the story's time, then one tick more: each before it leaves it Scheduled.
                var heard = new List<PublishingTick>();
                while (factory.Time.GetUtcNow() < at)
                {
                    Assert.Equal(StoryStatus.Scheduled, (await factory.FindStoryAsync(story.Id))!.Status);
                    factory.Time.Advance(TimeSpan.FromSeconds(30));
                    heard.Add(await NextTickAsync(ticks.Reader, heard));
                }

                var stored = (await factory.FindStoryAsync(story.Id))!;
                Assert.Equal((StoryStatus.Published, at), (stored.Status, stored.PublishedAt!.Value));
                Assert.True(factory.Time.GetUtcNow() - at < TimeSpan.FromMinutes(1), $"Published at {factory.Time.GetUtcNow():O}, scheduled for {at:O}.");
                Assert.Equal([(staff, "story.scheduled", "Story"), (staff, "story.published", "Story")], await factory.AuditOfAsync(story.Id));

                factory.Time.Advance(TimeSpan.FromSeconds(30));
                heard.Add(await NextTickAsync(ticks.Reader, heard));
                Assert.Equal(2, (await factory.AuditOfAsync(story.Id)).Length);
                Assert.All(heard, tick => Assert.True(tick.Held, "Every tick of the only clock holds the lease."));
            }
        }
        finally
        {
            factory.Clock.Ticked -= Heard;
        }
    }

    /// <summary>The next tick, or a failure naming the ticks that did come.</summary>
    private static async Task<PublishingTick> NextTickAsync(ChannelReader<PublishingTick> ticks, List<PublishingTick> heard)
    {
        try
        {
            return await ticks.ReadAsync(TestContext.Current.CancellationToken).AsTask().WaitAsync(TimeSpan.FromSeconds(10), TestContext.Current.CancellationToken);
        }
        catch (TimeoutException)
        {
            Assert.Fail($"No tick came after the clock moved on; {heard.Count} came before: {string.Join(", ", heard)}.");
            throw;
        }
    }
}
