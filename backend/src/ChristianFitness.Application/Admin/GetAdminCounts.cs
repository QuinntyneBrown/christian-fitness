using ChristianFitness.Application.Abstractions;
using ChristianFitness.Domain.Directory;
using ChristianFitness.Domain.Members;
using ChristianFitness.Domain.News;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Admin;

/// <summary>
/// The work waiting behind each area of the console's navigation (ADR 0079): how many listing
/// suggestions wait for review (L2-073 AC1; ADR 0090) and how many stories wait in review
/// (L2-068 AC5; ADR 0097). Later journeys add the other areas.
/// </summary>
public sealed record AdminCountsDto(int Suggestions, int StoriesInReview, int NewFeedback);

/// <summary>Staff ask what waits behind the navigation's areas.</summary>
public sealed record GetAdminCountsQuery : IRequest<AdminCountsDto>;

/// <summary>
/// Counts the undecided suggestions, which both roles review, and the stories in review, which only
/// an Admin opens; a Moderator's answer counts none (L2-068 AC7).
/// </summary>
internal sealed class GetAdminCountsHandler(IAppDbContext db, ICurrentMember current) : IRequestHandler<GetAdminCountsQuery, AdminCountsDto>
{
    public async Task<AdminCountsDto> Handle(GetAdminCountsQuery request, CancellationToken cancellationToken)
    {
        var suggestions = await db.ListingSuggestions.AsNoTracking()
            .CountAsync(s => s.Status == SuggestionStatus.Waiting, cancellationToken).ConfigureAwait(false);
        var role = await StaffRoles.OfAsync(db, current.Id, cancellationToken).ConfigureAwait(false);
        var stories = role == StaffRoleName.Admin
            ? await db.Stories.AsNoTracking().CountAsync(s => s.Status == StoryStatus.InReview, cancellationToken).ConfigureAwait(false)
            : 0;
        // Both roles answer feedback (L2-074 AC1), so both get the New notes.
        var newFeedback = await db.FeedbackNotes.AsNoTracking()
            .CountAsync(n => n.Status == Domain.Feedback.FeedbackStatus.New, cancellationToken).ConfigureAwait(false);
        return new AdminCountsDto(suggestions, stories, newFeedback);
    }
}
