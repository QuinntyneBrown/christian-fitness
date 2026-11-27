using System.Text.Json.Serialization;
using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Chat;
using ChristianFitness.Application.Errors;
using ChristianFitness.Domain.Members;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Profiles;

/// <summary>Another member's profile, by the id the URL wrote (L2-005 AC3; ADR 0038).</summary>
public sealed record GetPublicProfileQuery(string MemberId) : IRequest<PublicProfileDto>;

/// <summary>
/// What members see of one another: name, bio and interests, and the home church only when its owner
/// chose to show it. There is no email, city, goals or join date field, so none can leak; a hidden
/// home church is absent from the answer, not null.
/// </summary>
public sealed record PublicProfileDto(
    string Name,
    string? Bio,
    IReadOnlyList<string> Interests,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? HomeChurch)
{
    /// <summary>
    /// True when the viewer may not start a conversation with the member, who takes messages only
    /// from people in their groups (L2-065 AC5); omitted otherwise.
    /// </summary>
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public bool MessagesRestricted { get; init; }

    /// <summary>The public view of <paramref name="member"/>.</summary>
    public static PublicProfileDto Of(Member member)
    {
        ArgumentNullException.ThrowIfNull(member);
        return new PublicProfileDto(member.Name, member.Bio, member.Interests, member.ShowHomeChurch ? member.HomeChurch : null);
    }
}

/// <summary>An id that names nobody, the Christian Fitness account (ADR 0065) or is not an id, is 404. It logs nothing (L2-033 AC2).</summary>
/// <summary>
/// An Anyone profile for a visitor (L2-065 AC3, AC12): name, bio and interests only, never the home
/// church. A malformed or unknown id, and a profile that is not Anyone, are the same 404
/// <c>not_found</c>, so the answer does not say whether the member exists.
/// </summary>
public sealed record GetAnonymousProfileQuery(string MemberId) : IRequest<PublicProfileDto>;

/// <summary>
/// Who may open a profile (L2-065 AC2): the member themselves; anyone when it is Anyone; a signed-in
/// member when it is Members; a member who shares a group chat when it is Just my groups. A member
/// with no preferences row has the defaults, Members.
/// </summary>
internal static class ProfileAccess
{
    public static RefusalException NotFound() => new(RefusalCodes.NotFound, RefusalKind.NotFound);

    public static async Task<Member> FindAsync(IAppDbContext db, string memberId, CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(memberId, out var id))
        {
            throw NotFound();
        }

        return await db.Members.AsNoTracking().SingleOrDefaultAsync(m => m.Id == id && !m.IsSystem, cancellationToken).ConfigureAwait(false)
            ?? throw NotFound();
    }

    public static async Task<ProfileVisibility> VisibilityOfAsync(IAppDbContext db, Guid memberId, CancellationToken cancellationToken) =>
        (await db.MemberPreferences.AsNoTracking().SingleOrDefaultAsync(p => p.MemberId == memberId, cancellationToken).ConfigureAwait(false)
            ?? MemberPreferences.DefaultsFor(memberId)).Visibility;
}

internal sealed class GetPublicProfileHandler(IAppDbContext db, ICurrentMember current, TimeProvider time) : IRequestHandler<GetPublicProfileQuery, PublicProfileDto>
{
    public async Task<PublicProfileDto> Handle(GetPublicProfileQuery request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var member = await ProfileAccess.FindAsync(db, request.MemberId, cancellationToken).ConfigureAwait(false);
        var viewer = current.Id;
        if (viewer != member.Id
            && await ProfileAccess.VisibilityOfAsync(db, member.Id, cancellationToken).ConfigureAwait(false) == ProfileVisibility.JustMyGroups
            && !await GroupMembership.ShareAGroupAsync(db, member.Id, viewer, time.GetUtcNow(), cancellationToken).ConfigureAwait(false))
        {
            throw ProfileAccess.NotFound();
        }

        var restricted = viewer != member.Id
            && !await DirectChat.MayStartAsync(db, viewer, member.Id, time.GetUtcNow(), cancellationToken).ConfigureAwait(false);
        return PublicProfileDto.Of(member) with { MessagesRestricted = restricted };
    }
}

internal sealed class GetAnonymousProfileHandler(IAppDbContext db) : IRequestHandler<GetAnonymousProfileQuery, PublicProfileDto>
{
    public async Task<PublicProfileDto> Handle(GetAnonymousProfileQuery request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var member = await ProfileAccess.FindAsync(db, request.MemberId, cancellationToken).ConfigureAwait(false);
        if (await ProfileAccess.VisibilityOfAsync(db, member.Id, cancellationToken).ConfigureAwait(false) != ProfileVisibility.Anyone)
        {
            throw ProfileAccess.NotFound();
        }

        // Never the home church for a visitor, whatever the member's switch (L2-065 AC3, AC10).
        return new PublicProfileDto(member.Name, member.Bio, member.Interests, null);
    }
}
