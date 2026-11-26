using ChristianFitness.Api.Tests.Stories;
using ChristianFitness.Domain.Feedback;
using ChristianFitness.Domain.Members;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Feedback;

/// <summary>
/// The API on the stories' clock (so a story can be what a note is about), with the notes a member
/// sent read straight from the store (journey 30; ADR 0109).
/// </summary>
public sealed class FeedbackFactory : StoriesFactory
{
    public const string FormPath = "/api/feedback/form";

    public const string Path = "/api/feedback";

    /// <summary>The notes the member with <paramref name="email"/> sent, oldest first.</summary>
    public async Task<List<FeedbackNote>> NotesOfAsync(string email)
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var normalized = Member.NormalizeEmail(email);
        var id = await db.Members.Where(m => m.NormalizedEmail == normalized).Select(m => m.Id).SingleAsync(TestContext.Current.CancellationToken);
        return await db.FeedbackNotes.AsNoTracking().Where(n => n.MemberId == id).OrderBy(n => n.SentAt).ThenBy(n => n.Id)
            .ToListAsync(TestContext.Current.CancellationToken);
    }

    /// <summary>Marks the member with <paramref name="email"/> Suspended, as a moderator's change does.</summary>
    public async Task SuspendAsync(string email)
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var normalized = Member.NormalizeEmail(email);
        var member = await db.Members.SingleAsync(m => m.NormalizedEmail == normalized, TestContext.Current.CancellationToken);
        db.Entry(member).Property(m => m.Status).CurrentValue = MemberStatus.Suspended;
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
    }
}
