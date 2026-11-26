using ChristianFitness.Application.Abstractions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Feedback;

/// <summary>The "About this page" label the form shows.</summary>
public sealed record FeedbackAboutDto(string Label);

/// <summary>
/// What the Send feedback form needs from the server (L2-063 AC1, AC3; ADR 0109): the member's
/// address, which the email choice names, and the label of the page it is about, if the server
/// knows it. A class, not a record, so no generated <c>ToString</c> can print the address.
/// </summary>
public sealed class FeedbackFormDto(string email, FeedbackAboutDto? about)
{
    public string Email { get; } = email;

    public FeedbackAboutDto? About { get; } = about;
}

/// <summary>The form for the signed-in member, about what <paramref name="About"/> names (<c>page:…</c> or <c>story:…</c>).</summary>
public sealed record GetFeedbackFormQuery(string? About) : IRequest<FeedbackFormDto>;

internal sealed class GetFeedbackFormHandler(IAppDbContext db, ICurrentMember current, TimeProvider time) : IRequestHandler<GetFeedbackFormQuery, FeedbackFormDto>
{
    public async Task<FeedbackFormDto> Handle(GetFeedbackFormQuery request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var id = current.Id;
        var email = await db.Members.AsNoTracking().Where(m => m.Id == id).Select(m => m.Email).SingleAsync(cancellationToken).ConfigureAwait(false);
        var about = await FeedbackAbout.ReadAsync(db, request.About, time.GetUtcNow(), cancellationToken).ConfigureAwait(false);
        return new FeedbackFormDto(email, about is null ? null : new FeedbackAboutDto(about.Label));
    }
}
