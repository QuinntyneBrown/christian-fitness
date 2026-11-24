using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Chat;
using ChristianFitness.Application.Errors;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Services;

/// <summary>The professional the booking request went to: Messages opens the conversation at <c>/messages/{memberId}</c> (ADR 0053).</summary>
public sealed record BookingRequestDto(Guid MemberId);

/// <summary>
/// A member asks a listing's professional for a session (L2-014 AC3 to AC5; ADR 0053). A class, not a
/// record, so a generated <c>ToString</c> never prints the member's words if one is logged.
/// </summary>
public sealed class RequestBookingCommand : IRequest<BookingRequestDto>
{
    public Guid ListingId { get; init; }

    /// <summary>One of <c>one-on-one</c>, <c>small-group</c> or <c>intro-call</c>.</summary>
    public string Kind { get; init; } = string.Empty;

    public string When { get; init; } = string.Empty;

    public string? Message { get; init; }
}

/// <summary>The rules of the booking dialog (ADR 0053); the member app's <c>validateBookingRequest</c> checks the same table.</summary>
public sealed class RequestBookingValidator : AbstractValidator<RequestBookingCommand>
{
    public const string KindUnknown = "Choose what you would like";
    public const string WhenRequired = "Tell the professional which days and times work for you";
    public const string WhenTooLong = "Use 200 characters or fewer";
    public const string MessageTooLong = "Keep your message to 1,000 characters";
    public const int WhenMaxLength = 200;
    public const int MessageMaxLength = 1000;

    /// <summary>What the request says for each kind, as the professional reads it.</summary>
    private static readonly Dictionary<string, string> Labels = new(StringComparer.Ordinal)
    {
        ["one-on-one"] = "One-on-one session",
        ["small-group"] = "Small-group session",
        ["intro-call"] = "Free 15-minute intro call",
    };

    public RequestBookingValidator()
    {
        RuleLevelCascadeMode = CascadeMode.Stop;
        RuleFor(c => c.Kind).Must(kind => LabelOf(kind) is not null).WithMessage(KindUnknown);
        RuleFor(c => c.When)
            .Must(text => !string.IsNullOrWhiteSpace(text)).WithMessage(WhenRequired)
            .Must(text => text.Trim().Length <= WhenMaxLength).WithMessage(WhenTooLong).WithErrorCode(RefusalCodes.FieldTooLong);
        RuleFor(c => c.Message)
            .Must(text => text is null || text.Trim().Length <= MessageMaxLength).WithMessage(MessageTooLong).WithErrorCode(RefusalCodes.FieldTooLong);
    }

    public static string? LabelOf(string? kind) => kind is not null && Labels.TryGetValue(kind, out var label) ? label : null;
}

/// <summary>
/// Delivers the request as a direct message from the member to the listing's professional by sending
/// the direct-message command of slice 14.1, so the conversation starts and the professional is
/// notified as for any message (ADR 0053). A listing that publishes a contact link is 409
/// <c>professional_not_linked</c>; an unknown one 404 <c>service_not_found</c>; a suspended professional
/// or the caller's own listing 403 <c>recipient_unavailable</c>. Nothing is logged.
/// </summary>
internal sealed class RequestBookingHandler(IAppDbContext db, ICurrentMember current, ISender sender)
    : IRequestHandler<RequestBookingCommand, BookingRequestDto>
{
    public async Task<BookingRequestDto> Handle(RequestBookingCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var listing = await db.ServiceListings.AsNoTracking()
            .Where(l => l.Id == request.ListingId)
            .Select(l => new { l.MemberId, Linked = l.ContactUrl == null })
            .SingleOrDefaultAsync(cancellationToken)
            .ConfigureAwait(false)
            ?? throw new RefusalException(RefusalCodes.ServiceNotFound, RefusalKind.NotFound);
        if (!listing.Linked)
        {
            throw new RefusalException(RefusalCodes.ProfessionalNotLinked, RefusalKind.Conflict);
        }

        var text = $"Booking request: {RequestBookingValidator.LabelOf(request.Kind)}\nWhen: {request.When.Trim()}";
        if (!string.IsNullOrWhiteSpace(request.Message))
        {
            text += $"\n\n{request.Message.Trim()}";
        }

        var answer = await sender.Send(new SendDirectMessageCommand(current.Id, listing.MemberId, text), cancellationToken).ConfigureAwait(false);
        return answer.Code is null
            ? new BookingRequestDto(listing.MemberId)
            : throw DirectChat.Unavailable();
    }
}
