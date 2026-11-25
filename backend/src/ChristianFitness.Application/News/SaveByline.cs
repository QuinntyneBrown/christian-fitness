using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Audit;
using ChristianFitness.Application.Errors;
using ChristianFitness.Application.Events;
using ChristianFitness.Application.Sessions;
using ChristianFitness.Domain.News;
using FluentValidation;
using FluentValidation.Results;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.News;

/// <summary>What the byline editor sends (L2-077 AC3): a name, a short bio and an optional photo's key.</summary>
public abstract class BylineFields
{
    public string? Name { get; set; }

    public string? Bio { get; set; }

    public string? PhotoKey { get; set; }
}

/// <summary>Add byline (L2-077 AC3, AC4). Audited <c>byline.created</c> as <c>Byline</c> (ADR 0093).</summary>
public sealed class AddBylineCommand : BylineFields, IRequest<BylineDto>, IAuditableCommand
{
    string IAuditableCommand.AuditAction => "byline.created";
}

/// <summary>Save byline (L2-077 AC5); an unknown byline is 404 <c>not_found</c>. Audited <c>byline.updated</c>.</summary>
public sealed class UpdateBylineCommand : BylineFields, IRequest<BylineDto>, IAuditableCommand
{
    /// <summary>The byline, from the route.</summary>
    public Guid Id { get; set; }

    string IAuditableCommand.AuditAction => "byline.updated";
}

/// <summary>The key an uploaded byline photo is kept under (ADR 0093).</summary>
public sealed record BylinePhotoDto(string PhotoKey);

/// <summary>
/// Stores one byline photo, judged by its first bytes as an event image is (ADR 0025): a JPEG, PNG
/// or WebP of up to 5 MB. Audited <c>byline_photo.uploaded</c> against the key's GUID.
/// </summary>
public sealed class UploadBylinePhotoCommand(Stream content, long length) : IRequest<BylinePhotoDto>, IAuditableCommand
{
    public const string RecordType = "BylinePhoto";

    string IAuditableCommand.AuditAction => "byline_photo.uploaded";

    public Stream Content { get; } = content;

    public long Length { get; } = length;
}

/// <summary>The editor's field codes, named in the refusal's <c>fieldCodes</c> (ADR 0093).</summary>
public static class BylineRules
{
    public const string PhotoInvalid = "photo_invalid";

    public static readonly IReadOnlySet<string> FieldCodes = new HashSet<string>(StringComparer.Ordinal)
    {
        "name_required", "name_too_long", "bio_required", "bio_too_long", PhotoInvalid,
    };
}

/// <summary>Each field's rule (L2-077 AC3); the sentences never repeat a value.</summary>
internal abstract class BylineFieldsValidator<T> : AbstractValidator<T>
    where T : BylineFields
{
    protected BylineFieldsValidator(IImageStore images)
    {
        RuleLevelCascadeMode = CascadeMode.Stop;
        RuleFor(c => c.Name)
            .Must(name => !string.IsNullOrWhiteSpace(name)).WithErrorCode("name_required").WithMessage("Add a name")
            .Must(name => name!.Trim().Length <= Byline.NameMaxLength).WithErrorCode("name_too_long").WithMessage("Use 80 characters or fewer");
        RuleFor(c => c.Bio)
            .Must(bio => !string.IsNullOrWhiteSpace(bio)).WithErrorCode("bio_required").WithMessage("Add a short bio")
            .Must(bio => bio!.Trim().Length <= Byline.BioMaxLength).WithErrorCode("bio_too_long").WithMessage("Use 200 characters or fewer");
        RuleFor(c => c.PhotoKey)
            .MustAsync(async (key, cancellationToken) => ImageKeys.IsKey(key) && await images.ExistsAsync(key!, cancellationToken).ConfigureAwait(false))
            .When(c => c.PhotoKey is not null)
            .WithErrorCode(BylineRules.PhotoInvalid).WithMessage("Choose the image again");
    }
}

internal sealed class AddBylineValidator(IImageStore images) : BylineFieldsValidator<AddBylineCommand>(images);

internal sealed class UpdateBylineValidator(IImageStore images) : BylineFieldsValidator<UpdateBylineCommand>(images);

/// <summary>The name rule both saves share: no other byline may hold the name, in any case (L2-077 AC4).</summary>
internal static class BylineNames
{
    public static Task<bool> TakenAsync(IAppDbContext db, string name, Guid? except, CancellationToken cancellationToken)
    {
        var key = Byline.KeyOf(name);
        return db.Bylines.AnyAsync(b => b.NameKey == key && b.Id != except, cancellationToken);
    }

    public static RefusalException Taken(Exception? inner = null) => new(RefusalCodes.BylineNameTaken, RefusalKind.Conflict, inner);

    /// <summary>
    /// Saves, answering a lost race on the unique name key (two saves of one name at once) as the
    /// later save would have been answered: <c>byline_name_taken</c>.
    /// </summary>
    public static async Task SaveAsync(IAppDbContext db, Byline byline, CancellationToken cancellationToken)
    {
        try
        {
            await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        }
        catch (DbUpdateException exception)
        {
            var entry = db.Bylines.Entry(byline);
            entry.State = entry.State == EntityState.Added ? EntityState.Detached : EntityState.Unchanged;
            if (await TakenAsync(db, byline.Name, byline.Id, cancellationToken).ConfigureAwait(false))
            {
                throw Taken(exception);
            }

            throw;
        }
    }
}

internal sealed class AddBylineHandler(IAppDbContext db, TimeProvider time, ICurrentMember current, AuditTrail audit)
    : IRequestHandler<AddBylineCommand, BylineDto>
{
    public async Task<BylineDto> Handle(AddBylineCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        if (await BylineNames.TakenAsync(db, request.Name!, null, cancellationToken).ConfigureAwait(false))
        {
            throw BylineNames.Taken();
        }

        var byline = Byline.Create(request.Name!, request.Bio!, request.PhotoKey, time.GetUtcNow());
        db.Bylines.Add(byline);
        audit.Record(current.Id, BylineAnswers.RecordType, byline.Id);
        await BylineNames.SaveAsync(db, byline, cancellationToken).ConfigureAwait(false);
        return BylineAnswers.Of(byline, 0);
    }
}

internal sealed class UpdateBylineHandler(IAppDbContext db, ICurrentMember current, AuditTrail audit)
    : IRequestHandler<UpdateBylineCommand, BylineDto>
{
    public async Task<BylineDto> Handle(UpdateBylineCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var byline = await db.Bylines.SingleOrDefaultAsync(b => b.Id == request.Id, cancellationToken).ConfigureAwait(false)
            ?? throw new RefusalException(RefusalCodes.NotFound, RefusalKind.NotFound);
        if (await BylineNames.TakenAsync(db, request.Name!, byline.Id, cancellationToken).ConfigureAwait(false))
        {
            throw BylineNames.Taken();
        }

        byline.Describe(request.Name!, request.Bio!, request.PhotoKey);
        audit.Record(current.Id, BylineAnswers.RecordType, byline.Id);
        await BylineNames.SaveAsync(db, byline, cancellationToken).ConfigureAwait(false);
        return BylineAnswers.Of(byline, await BylineAnswers.StoriesOfAsync(db, byline.Id, cancellationToken).ConfigureAwait(false));
    }
}

internal sealed class UploadBylinePhotoHandler(IImageStore store, ICurrentMember current, AuditTrail audit)
    : IRequestHandler<UploadBylinePhotoCommand, BylinePhotoDto>
{
    public async Task<BylinePhotoDto> Handle(UploadBylinePhotoCommand request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        if (request.Length is <= 0 or > ImageKeys.MaxBytes)
        {
            throw Refused();
        }

        var content = new byte[request.Length];
        await request.Content.ReadExactlyAsync(content, cancellationToken).ConfigureAwait(false);
        var kind = ImageKeys.Detect(content) ?? throw Refused();
        var key = ImageKeys.NewKey(kind.Extension);
        await store.SaveAsync(key, content, cancellationToken).ConfigureAwait(false);
        audit.Record(current.Id, UploadBylinePhotoCommand.RecordType, Guid.ParseExact(key[..32], "N"));
        return new BylinePhotoDto(key);
    }

    private static ValidationException Refused() =>
        new([new ValidationFailure("Photo", "Use a JPEG, PNG or WebP image up to 5 MB") { ErrorCode = BylineRules.PhotoInvalid }]);
}
