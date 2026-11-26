using ChristianFitness.Application.Abstractions;
using ChristianFitness.Domain.Audit;
using ChristianFitness.Domain.News;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.News;

/// <summary>
/// The publishing clock's story job (L2-069 AC4, AC6, AC14; ADR 0069, ADR 0104): stores each
/// Scheduled story whose time has come as Published at that time, the earliest first, at most
/// <see cref="Batch"/> a tick. Answers how many it published.
/// </summary>
public sealed record PublishDueStoriesCommand : IRequest<int>
{
    /// <summary>At most this many stories a tick; the rest go on the next.</summary>
    public const int Batch = 100;
}

/// <summary>
/// Each story is published as an Admin's Publish would be: the Lead takes the front page from any
/// other Lead, and the change is audited <c>story.published</c> against the Admin who scheduled it,
/// stored with it. A story is saved over the version read, so a command or another clock that
/// stored it first wins, and this tick stops; the next tick reads what is still due. Reads already
/// showed it as Published since its time, so a late tick delays nothing a reader sees.
/// </summary>
internal sealed class PublishDueStoriesHandler(IAppDbContext db, TimeProvider time) : IRequestHandler<PublishDueStoriesCommand, int>
{
    public async Task<int> Handle(PublishDueStoriesCommand request, CancellationToken cancellationToken)
    {
        var now = time.GetUtcNow();
        var due = await db.Stories
            .Where(s => s.Status == StoryStatus.Scheduled && s.PublishAt <= now)
            .OrderBy(s => s.PublishAt).ThenBy(s => s.Id)
            .Take(PublishDueStoriesCommand.Batch)
            .ToListAsync(cancellationToken).ConfigureAwait(false);
        var published = 0;
        foreach (var story in due)
        {
            var by = story.ScheduledById ?? Guid.Empty;
            story.PublishDue(now);
            await StoryActions.TakeLeadAsync(db, story, cancellationToken).ConfigureAwait(false);
            db.AuditEntries.Add(AuditEntry.Record(by, StoryActions.PublishedAction, StoryActions.RecordType, story.Id, now));
            try
            {
                await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
            }
            catch (DbUpdateConcurrencyException)
            {
                return published;
            }

            published++;
        }

        return published;
    }
}
