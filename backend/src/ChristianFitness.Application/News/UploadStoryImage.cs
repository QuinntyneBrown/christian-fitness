using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Audit;
using ChristianFitness.Application.Errors;
using ChristianFitness.Application.Events;
using ChristianFitness.Application.Sessions;
using FluentValidation;
using FluentValidation.Results;
using MediatR;

namespace ChristianFitness.Application.News;

/// <summary>An uploaded lead image: the key it is kept under and the original's size, in pixels.</summary>
public sealed record StoryImageUploadDto(string ImageKey, int Width, int Height);

/// <summary>
/// Stores one lead image (L2-069 AC9; ADR 0097). A staff change, audited as
/// <c>story_image.uploaded</c> against the <see cref="RecordType"/> record named by the key's GUID
/// (L2-069 AC14). The content is read once, by the handler.
/// </summary>
public sealed class UploadStoryImageCommand(Stream content, long length) : IRequest<StoryImageUploadDto>, IAuditableCommand
{
    public const string RecordType = "StoryImage";

    /// <summary>The narrowest lead image, in pixels.</summary>
    public const int MinWidth = 1600;

    string IAuditableCommand.AuditAction => "story_image.uploaded";

    public Stream Content { get; } = content;

    public long Length { get; } = length;
}

/// <summary>
/// Keeps the image when its first bytes say JPEG, PNG or WebP, its header says it is at least
/// 1,600 px wide and it is no larger than 5 MB; anything else is refused with 400
/// <c>validation_failed</c> and <c>fieldCodes.image</c> = <c>image_invalid</c>, naming no file
/// name or type the client gave. The crop is chosen in the editor and saved with the story.
/// </summary>
internal sealed class UploadStoryImageHandler(IImageStore store, ICurrentMember current, AuditTrail audit)
    : IRequestHandler<UploadStoryImageCommand, StoryImageUploadDto>
{
    public async Task<StoryImageUploadDto> Handle(UploadStoryImageCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        if (request.Length is <= 0 or > ImageKeys.MaxBytes)
        {
            throw Refused();
        }

        var content = new byte[request.Length];
        await request.Content.ReadExactlyAsync(content, cancellationToken).ConfigureAwait(false);
        var kind = ImageKeys.Detect(content) ?? throw Refused();
        var size = ImageKeys.SizeOf(content) is { Width: >= UploadStoryImageCommand.MinWidth, Height: > 0 } read ? read : throw Refused();
        var key = ImageKeys.NewKey(kind.Extension);
        await store.SaveAsync(key, content, cancellationToken).ConfigureAwait(false);
        audit.Record(current.Id, UploadStoryImageCommand.RecordType, Guid.ParseExact(key[..32], "N"));
        return new StoryImageUploadDto(key, size.Width, size.Height);
    }

    private static ValidationException Refused() =>
        new([new ValidationFailure("Image", "Use a JPEG, PNG or WebP image at least 1600 px wide and up to 5 MB") { ErrorCode = StoryRules.ImageInvalid }]);
}

/// <summary>A lead image, for anyone, as stories are public once published (ADR 0097). A key that names nothing is 404 <c>not_found</c>.</summary>
public sealed record GetStoryImageQuery(string Key) : IRequest<StoredImage>;

internal sealed class GetStoryImageHandler(IImageStore store) : IRequestHandler<GetStoryImageQuery, StoredImage>
{
    public async Task<StoredImage> Handle(GetStoryImageQuery request, CancellationToken cancellationToken) =>
        (ImageKeys.IsKey(request.Key) ? await store.OpenAsync(request.Key, cancellationToken).ConfigureAwait(false) : null)
            ?? throw new RefusalException(RefusalCodes.NotFound, RefusalKind.NotFound);
}
