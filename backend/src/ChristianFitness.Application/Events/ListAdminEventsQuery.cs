using ChristianFitness.Application.Abstractions;
using ChristianFitness.Domain.Events;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Events;

/// <summary>
/// The staff list of events for one tab: <c>all</c> (the default), <c>published</c> or <c>draft</c>
/// (L2-022 AC5; ADR 0021).
/// </summary>
public sealed record ListAdminEventsQuery(string? Status) : IRequest<AdminEventListDto>
{
    /// <summary>The most events one answer holds; paging waits until the community has more (ADR 0021).</summary>
    public const int Limit = 100;
}

/// <summary>A tab the list does not have is refused with 400 <c>validation_failed</c>.</summary>
internal sealed class ListAdminEventsValidator : AbstractValidator<ListAdminEventsQuery>
{
    public const string UnknownTab = "Choose all, published or draft";

    public ListAdminEventsValidator() =>
        RuleFor(q => q.Status)
            .Must(status => status is null or "all" or "published" or "draft")
            .WithMessage(UnknownTab);
}

/// <summary>
/// Counts every status, then reads the tab's events soonest first, at most
/// <see cref="ListAdminEventsQuery.Limit"/>. Nobody registers before slice 6.1, so going is 0.
/// </summary>
internal sealed class ListAdminEventsHandler(IAppDbContext db, IRegistrationReader registrations) : IRequestHandler<ListAdminEventsQuery, AdminEventListDto>
{
    public async Task<AdminEventListDto> Handle(ListAdminEventsQuery request, CancellationToken cancellationToken)
    {
        var counts = await db.Events
            .GroupBy(e => e.Status)
            .Select(group => new { Status = group.Key, Count = group.Count() })
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        int CountOf(EventStatus status) => counts.Where(c => c.Status == status).Sum(c => c.Count);

        var events = db.Events.AsNoTracking();
        events = request.Status switch
        {
            "published" => events.Where(e => e.Status == EventStatus.Published),
            "draft" => events.Where(e => e.Status == EventStatus.Draft),
            _ => events,
        };
        var page = await events
            .OrderBy(e => e.StartsAt)
            .ThenBy(e => e.Id)
            .Take(ListAdminEventsQuery.Limit)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        var going = await registrations.GoingForAsync([.. page.Select(e => e.Id)], cancellationToken).ConfigureAwait(false);

        return new AdminEventListDto(
            new AdminEventCountsDto(counts.Sum(c => c.Count), CountOf(EventStatus.Published), CountOf(EventStatus.Draft)),
            [.. page.Select(e => AdminEventDto.Of(e, going.GetValueOrDefault(e.Id)))]);
    }
}
