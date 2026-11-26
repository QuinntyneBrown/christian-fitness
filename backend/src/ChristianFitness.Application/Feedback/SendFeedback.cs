using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Errors;
using ChristianFitness.Application.Events;
using ChristianFitness.Domain.Feedback;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Feedback;

/// <summary>
/// The signed-in member's note (L2-063; ADR 0109), from the fields of <c>POST /api/feedback</c>.
/// A class, not a record, so no generated <c>ToString</c> can print the text if one is logged.
/// </summary>
public sealed class SendFeedbackCommand : IRequest
{
    /// <summary><c>idea</c>, <c>problem</c>, <c>correction</c> or <c>thanks</c>.</summary>
    public string? Kind { get; init; }

    public string? Text { get; init; }

    /// <summary><c>page:&lt;route template&gt;</c> or <c>story:&lt;id&gt;</c>; none for no page.</summary>
    public string? About { get; init; }

    /// <summary>Whether the team may email the member about it.</summary>
    public bool MayEmail { get; init; }

    /// <summary>The screenshot's bytes as sent, or none; its name and type are never read.</summary>
    public ReadOnlyMemory<byte>? Screenshot { get; init; }
}

/// <summary>The kind codes and the field codes a note is refused with (ADR 0109).</summary>
public static class FeedbackRules
{
    public const string KindInvalid = "kind_invalid";
    public const string TextRequired = "text_required";
    public const string AboutInvalid = "about_invalid";
    public const string ImageTooLarge = "image_too_large";
    public const string ImageTypeNotAllowed = "image_type_not_allowed";
    public const string ScreenshotNotAllowed = "screenshot_not_allowed";

    private static readonly Dictionary<string, FeedbackKind> Kinds = new(StringComparer.Ordinal)
    {
        ["idea"] = FeedbackKind.Idea,
        ["problem"] = FeedbackKind.Problem,
        ["correction"] = FeedbackKind.Correction,
        ["thanks"] = FeedbackKind.Thanks,
    };

    /// <summary>The kind an exact code names, or none.</summary>
    public static FeedbackKind? KindOf(string? code) =>
        code is not null && Kinds.TryGetValue(code, out var kind) ? kind : null;
}

/// <summary>
/// The note's field rules (L2-063 AC5, AC8; ADR 0109), each refused with 400
/// <c>validation_failed</c> and its field's code; the sentences never repeat a value.
/// </summary>
internal sealed class SendFeedbackValidator : AbstractValidator<SendFeedbackCommand>
{
    public SendFeedbackValidator(IAppDbContext db, TimeProvider time)
    {
        RuleLevelCascadeMode = CascadeMode.Stop;
        RuleFor(c => c.Kind)
            .Must(kind => FeedbackRules.KindOf(kind) is not null)
            .WithErrorCode(FeedbackRules.KindInvalid).WithMessage("Choose what it's about").WithState(_ => FieldCodeOnly.State);
        RuleFor(c => c.Text)
            .Must(text => !string.IsNullOrWhiteSpace(text))
            .WithErrorCode(FeedbackRules.TextRequired).WithMessage("Tell us a little more first.").WithState(_ => FieldCodeOnly.State)
            .Must(text => text!.Trim().Length <= FeedbackNote.TextMaxLength)
            .WithErrorCode(RefusalCodes.FieldTooLong).WithMessage($"Use {FeedbackNote.TextMaxLength:N0} characters or fewer").WithState(_ => FieldCodeOnly.State);
        RuleFor(c => c.About)
            .MustAsync(async (about, cancellationToken) => await FeedbackAbout.ReadAsync(db, about, time.GetUtcNow(), cancellationToken).ConfigureAwait(false) is not null)
            .When(c => c.About is not null)
            .WithErrorCode(FeedbackRules.AboutInvalid).WithMessage("Choose a page we know, or none").WithState(_ => FieldCodeOnly.State);
        // Only a note about something that is off carries a screenshot; it is read by its first
        // bytes, never by the name or type the browser gave (L2-063 AC4).
        RuleFor(c => c.Screenshot)
            .Must((command, _) => FeedbackRules.KindOf(command.Kind) == FeedbackKind.Problem)
            .WithErrorCode(FeedbackRules.ScreenshotNotAllowed).WithMessage("Only a problem can carry a screenshot").WithState(_ => FieldCodeOnly.State)
            .Must(shot => shot!.Value.Length <= ImageKeys.MaxBytes)
            .WithErrorCode(FeedbackRules.ImageTooLarge).WithMessage("Use an image up to 5 MB").WithState(_ => FieldCodeOnly.State)
            .Must(shot => ImageKeys.Detect(shot!.Value.Span) is not null)
            .WithErrorCode(FeedbackRules.ImageTypeNotAllowed).WithMessage("Use a JPEG, PNG or WebP image").WithState(_ => FieldCodeOnly.State)
            .When(c => c.Screenshot is not null);
    }
}

/// <summary>
/// Stores a New note with the signed-in member, the time, the page it is about and the device's
/// families (L2-063 AC6; ADR 0109). A suspended member is accepted like any other, as feedback is a
/// route to appeal (AC12); an eleventh note within a rolling hour is refused 429
/// <c>too_many_attempts</c> (AC9). It logs nothing (AC10, L2-033).
/// </summary>
internal sealed class SendFeedbackHandler(
    IAppDbContext db, ICurrentMember current, IClientDevice device, IFeedbackScreenshotStore screenshots, TimeProvider time)
    : IRequestHandler<SendFeedbackCommand>
{
    public async Task Handle(SendFeedbackCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var id = current.Id;
        var now = time.GetUtcNow();
        var since = FeedbackNote.SendWindow.Since(now);
        var sent = await db.FeedbackNotes.CountAsync(n => n.MemberId == id && n.SentAt > since, cancellationToken).ConfigureAwait(false);
        if (FeedbackNote.SendWindow.IsFull(sent))
        {
            throw new RefusalException(RefusalCodes.TooManyAttempts, RefusalKind.TooManyRequests);
        }

        var about = await FeedbackAbout.ReadAsync(db, request.About, now, cancellationToken).ConfigureAwait(false);
        string? key = null;
        if (request.Screenshot is { } shot)
        {
            key = ImageKeys.NewKey(ImageKeys.Detect(shot.Span)!.Value.Extension);
            await screenshots.SaveAsync(key, shot, cancellationToken).ConfigureAwait(false);
        }

        db.FeedbackNotes.Add(FeedbackNote.Send(
            id,
            FeedbackRules.KindOf(request.Kind)!.Value,
            request.Text!,
            about?.RouteTemplate,
            about?.StoryId,
            about?.Label,
            request.MayEmail,
            device.Os,
            device.Browser,
            key,
            now));
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }
}
