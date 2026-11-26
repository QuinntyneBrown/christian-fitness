using ChristianFitness.Application.Abstractions;
using ChristianFitness.Domain.Events;
using ChristianFitness.Domain.News;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.News;

/// <summary>
/// One read of story <paramref name="StoryId"/> from a browser naming <paramref name="UserAgent"/>
/// (L2-061 AC12; ADR 0105). The page sends it once per browser per story per 24 hours. It adds one
/// to a Published story's tally for the Toronto day, unless the user agent is a known crawler;
/// anything else counts none, and the answer never says which.
/// </summary>
public sealed record CountStoryReadCommand(Guid StoryId, string? UserAgent) : IRequest;

internal sealed class CountStoryReadHandler(IAppDbContext db, TimeProvider clock) : IRequestHandler<CountStoryReadCommand>
{
    /// <summary>How many times a read is saved again after another read of the story was saved first.</summary>
    private const int Attempts = 3;

    public async Task Handle(CountStoryReadCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        if (!StoryReaders.Counts(request.UserAgent)
            || !await db.Stories.AnyAsync(s => s.Id == request.StoryId && s.Status == StoryStatus.Published, cancellationToken).ConfigureAwait(false))
        {
            return;
        }

        var day = DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(clock.GetUtcNow(), EventSchedule.Toronto).DateTime);
        for (var attempt = 1; ; attempt++)
        {
            var tally = await db.StoryReadTallies
                .SingleOrDefaultAsync(t => t.StoryId == request.StoryId && t.Day == day, cancellationToken).ConfigureAwait(false);
            if (tally is null)
            {
                tally = StoryReadTally.First(request.StoryId, day);
                db.StoryReadTallies.Add(tally);
            }
            else
            {
                tally.Add();
            }

            try
            {
                await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
                return;
            }
            catch (DbUpdateException) when (attempt < Attempts)
            {
                // Another read of the story was saved first: the day's row now exists, or its count
                // moved on. Read it again and add this one to what is there.
                db.StoryReadTallies.Entry(tally).State = EntityState.Detached;
            }
        }
    }
}
