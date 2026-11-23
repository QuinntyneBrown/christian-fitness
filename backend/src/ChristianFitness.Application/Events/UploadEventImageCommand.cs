using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Audit;
using ChristianFitness.Application.Errors;
using ChristianFitness.Application.Sessions;
using FluentValidation;
using FluentValidation.Results;
using MediatR;

namespace ChristianFitness.Application.Events;

/// <summary>The key an uploaded image is kept under; events name their image by it (ADR 0025).</summary>
public sealed record EventImageDto(string ImageKey);

/// <summary>
/// Stores one image for an event (L2-022 AC4; ADR 0025). A staff change, audited as
/// <c>event_image.uploaded</c> against the new <see cref="RecordType"/> record named by the key's
/// GUID (L2-019 AC3). The content is read once, by the handler.
/// </summary>
public sealed class UploadEventImageCommand(Stream content, long length) : IRequest<EventImageDto>, IAuditableCommand
{
    public const string RecordType = "EventImage";

    string IAuditableCommand.AuditAction => "event_image.uploaded";

    public Stream Content { get; } = content;

    public long Length { get; } = length;
}

/// <summary>
/// Keeps the image when its first bytes say JPEG, PNG or WebP and it is no larger than 5 MB; anything
/// else is refused with 400 <c>validation_failed</c> and <c>fieldCodes.image</c> =
/// <c>image_invalid</c>, naming no file name or type the client gave.
/// </summary>
internal sealed class UploadEventImageHandler(IImageStore store, ICurrentMember current, AuditTrail audit)
    : IRequestHandler<UploadEventImageCommand, EventImageDto>
{
    public async Task<EventImageDto> Handle(UploadEventImageCommand request, CancellationToken cancellationToken)
    {
        if (request.Length is <= 0 or > ImageKeys.MaxBytes)
        {
            throw Refused();
        }

        var content = new byte[request.Length];
        await request.Content.ReadExactlyAsync(content, cancellationToken).ConfigureAwait(false);
        var kind = ImageKeys.Detect(content) ?? throw Refused();
        var key = ImageKeys.NewKey(kind.Extension);
        await store.SaveAsync(key, content, cancellationToken).ConfigureAwait(false);
        audit.Record(current.Id, UploadEventImageCommand.RecordType, Guid.ParseExact(key[..32], "N"));
        return new EventImageDto(key);
    }

    private static ValidationException Refused() =>
        new([new ValidationFailure("Image", "Use a JPEG, PNG or WebP image up to 5 MB") { ErrorCode = EventFieldCodes.ImageInvalid }]);
}

/// <summary>An event's image, for anyone (L2-022 AC10; ADR 0025). A key that names nothing is 404 <c>not_found</c>.</summary>
public sealed record GetEventImageQuery(string Key) : IRequest<StoredImage>;

internal sealed class GetEventImageHandler(IImageStore store) : IRequestHandler<GetEventImageQuery, StoredImage>
{
    public async Task<StoredImage> Handle(GetEventImageQuery request, CancellationToken cancellationToken) =>
        (ImageKeys.IsKey(request.Key) ? await store.OpenAsync(request.Key, cancellationToken).ConfigureAwait(false) : null)
            ?? throw new RefusalException(RefusalCodes.NotFound, RefusalKind.NotFound);
}
