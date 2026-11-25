using ChristianFitness.Application.Abstractions;
using ChristianFitness.Domain.News;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Seeding;

/// <summary>
/// The starting bylines (L2-077 AC2; ADR 0093): Naomi Clarke, Priya Raman, Marcus Bell, Pastor Ruth
/// Adeyemi and CF Team, with the mocks' bios, as one seed. It applies only on a deployment that has
/// no byline and whose audit trail names no byline, so once an Admin has added, edited or removed
/// any byline it never runs again: it restores nothing removed and overwrites nothing edited.
/// </summary>
public sealed class BylineSeed(TimeProvider time) : ISeed
{
    /// <summary>The audit record type every byline change is recorded as (ADR 0023).</summary>
    private const string RecordType = nameof(Byline);

    /// <summary>The five, by stable ids so a reader can tell the seeded set.</summary>
    public static readonly IReadOnlyList<(Guid Id, string Name, string Bio)> Starting =
    [
        (new Guid("0193a9c0-0000-7000-8000-0000000b7001"), "Naomi Clarke", "Writes about community, church sport and the people behind both."),
        (new Guid("0193a9c0-0000-7000-8000-0000000b7002"), "Priya Raman", "Nutrition writer and meal-prep volunteer in Mississauga."),
        (new Guid("0193a9c0-0000-7000-8000-0000000b7003"), "Marcus Bell", "Personal trainer who writes beginner guides and profiles of our professionals."),
        (new Guid("0193a9c0-0000-7000-8000-0000000b7004"), "Pastor Ruth Adeyemi", "Pastor and writer on faith, rest and the body."),
        (new Guid("0193a9c0-0000-7000-8000-0000000b7005"), "CF Team", "Notices and event news from the Christian Fitness team."),
    ];

    public string Key => "starting bylines";

    public async Task<bool> ExistsAsync(IAppDbContext db, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(db);
        return await db.Bylines.AnyAsync(cancellationToken).ConfigureAwait(false)
            || await db.AuditEntries.AnyAsync(e => e.RecordType == RecordType, cancellationToken).ConfigureAwait(false);
    }

    public void Apply(IAppDbContext db)
    {
        ArgumentNullException.ThrowIfNull(db);
        var now = time.GetUtcNow();
        foreach (var (id, name, bio) in Starting)
        {
            db.Bylines.Add(Byline.Create(id, name, bio, null, now));
        }
    }
}
