using System.Globalization;
using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Audit;
using ChristianFitness.Application.Email;
using ChristianFitness.Application.Errors;
using ChristianFitness.Domain.Events;
using ChristianFitness.Domain.Members;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Preferences;

/// <summary>
/// "Request download" on Preferences (L2-066 AC1, AC10; ADR 0117): records that the member asked for
/// their data, audited with the member as actor (ADR 0078). A request of theirs younger than 24 hours
/// is answered instead, and nothing is added or audited.
/// </summary>
public sealed record RequestDataExportCommand : IRequest<DataExportRequestedDto>, IAuditableCommand
{
    public string AuditAction => "data_export.requested";
}

/// <summary>When the member asked; the scheduled builder emails the link within 24 hours of it.</summary>
public sealed record DataExportRequestedDto(DateTimeOffset RequestedAt);

internal static class DataExportRequests
{
    /// <summary>The member's request still shown as asked for at <paramref name="now"/>, or none (AC3).</summary>
    public static async Task<DataExportRequest?> RecentAsync(IAppDbContext db, Guid memberId, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var since = now - DataExportRequest.RequestWindow;
        return await db.DataExportRequests.AsNoTracking()
            .Where(r => r.MemberId == memberId && r.RequestedAt > since)
            .OrderByDescending(r => r.RequestedAt)
            .FirstOrDefaultAsync(cancellationToken).ConfigureAwait(false);
    }
}

internal sealed class RequestDataExportHandler(IAppDbContext db, ICurrentMember current, AuditTrail audit, TimeProvider time)
    : IRequestHandler<RequestDataExportCommand, DataExportRequestedDto>
{
    public async Task<DataExportRequestedDto> Handle(RequestDataExportCommand request, CancellationToken cancellationToken)
    {
        var now = time.GetUtcNow();
        if (await DataExportRequests.RecentAsync(db, current.Id, now, cancellationToken).ConfigureAwait(false) is { } recent)
        {
            audit.Unchanged();
            return new DataExportRequestedDto(recent.RequestedAt);
        }

        var asked = DataExportRequest.Ask(current.Id, now);
        db.DataExportRequests.Add(asked);
        audit.Record(current.Id, nameof(DataExportRequest), asked.Id);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return new DataExportRequestedDto(asked.RequestedAt);
    }
}

/// <summary>
/// The scheduler's data export job (L2-066 AC1, AC2, AC10; ADR 0069, ADR 0117), run on every tick:
/// it removes each archive whose 7 days are over, then builds the archive of each request not yet
/// ready, oldest first and at most <see cref="BuildDataExportsHandler.BatchSize"/> a tick, keeps it
/// in the private <see cref="IArchiveStore"/>, and emails the member's address its link once the
/// request is saved as ready, so a second tick builds and sends nothing again. Answers how many it
/// built; nothing it reads reaches a log or a span.
/// </summary>
public sealed record BuildDataExportsCommand : IRequest<int>;

internal sealed class BuildDataExportsHandler(IAppDbContext db, IArchiveStore archives, IEmailSender email, MemberAppAddress app, TimeProvider time)
    : IRequestHandler<BuildDataExportsCommand, int>
{
    /// <summary>How many archives one tick builds; the rest wait for the next tick, 30 seconds on.</summary>
    public const int BatchSize = 10;

    public const string Subject = "Your Christian Fitness data is ready";

    public async Task<int> Handle(BuildDataExportsCommand request, CancellationToken cancellationToken)
    {
        var now = time.GetUtcNow();
        var expired = await db.DataExportRequests
            .Where(r => r.ArchiveKey != null && r.ExpiresAt <= now)
            .ToListAsync(cancellationToken).ConfigureAwait(false);
        foreach (var done in expired)
        {
            await archives.DeleteAsync(done.ArchiveKey!, cancellationToken).ConfigureAwait(false);
            done.Expire();
        }

        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        var due = await db.DataExportRequests
            .Where(r => r.ReadyAt == null)
            .OrderBy(r => r.RequestedAt)
            .Take(BatchSize)
            .ToListAsync(cancellationToken).ConfigureAwait(false);
        foreach (var asked in due)
        {
            var key = ArchiveKeys.New();
            var zip = await DataExportArchive.BuildAsync(db, asked.MemberId, now, cancellationToken).ConfigureAwait(false);
            await archives.SaveAsync(key, zip, cancellationToken).ConfigureAwait(false);
            asked.Ready(key, now);
            await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
            var member = await db.Members.AsNoTracking()
                .Where(m => m.Id == asked.MemberId)
                .Select(m => new { m.Name, m.Email })
                .SingleAsync(cancellationToken).ConfigureAwait(false);
            await email.SendAsync(new EmailMessage(member.Email, Subject, Text(member.Name, app.DownloadLink(asked.Id), asked.ExpiresAt!.Value)), cancellationToken).ConfigureAwait(false);
        }

        return due.Count;
    }

    /// <summary>The words of mock <c>email-download-ready</c>, with the link and its last day in Toronto.</summary>
    private static string Text(string name, string link, DateTimeOffset expiresAt)
    {
        var first = name.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault();
        var until = EventSchedule.TorontoOf(expiresAt).Date.ToString("MMMM d, yyyy", CultureInfo.InvariantCulture);
        return $"""
            Hi {(string.IsNullOrEmpty(first) ? "there" : first)},

            You asked for a copy of your data. It's a .zip of your profile, preferences, registrations, follows, suggestions, feedback and the messages you sent.

            The link works for 7 days, until {until}, and only when you're signed in as you. After that you can request a new one in Preferences.

            Download your data: {link}

            {Organisation.Name}

            If you didn't ask for this, you can ignore this email. Nobody can open the link without signing in as you.
            """;
    }
}

/// <summary>
/// The download page's question (L2-066 AC2; ADR 0117): when the link of the caller's own built
/// archive stops working. Any other id, another member's, one not built yet or one past its 7 days
/// is the same 404 <c>not_found</c> (L2-031 AC3).
/// </summary>
public sealed record GetDataExportQuery(Guid Id) : IRequest<DataExportDto>;

public sealed record DataExportDto(DateTimeOffset ExpiresAt);

/// <summary>The caller's own archive while its link works, as a stream the caller disposes; else 404 <c>not_found</c>.</summary>
public sealed record GetDataExportArchiveQuery(Guid Id) : IRequest<Stream>;

internal static class DownloadableExports
{
    public static async Task<DataExportRequest> FindAsync(IAppDbContext db, ICurrentMember current, TimeProvider time, Guid id, CancellationToken cancellationToken)
    {
        var request = await db.DataExportRequests.AsNoTracking()
            .SingleOrDefaultAsync(r => r.Id == id && r.MemberId == current.Id, cancellationToken).ConfigureAwait(false);
        return request is not null && request.IsDownloadableAt(time.GetUtcNow())
            ? request
            : throw new RefusalException(RefusalCodes.NotFound, RefusalKind.NotFound);
    }
}

internal sealed class GetDataExportHandler(IAppDbContext db, ICurrentMember current, TimeProvider time) : IRequestHandler<GetDataExportQuery, DataExportDto>
{
    public async Task<DataExportDto> Handle(GetDataExportQuery request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var found = await DownloadableExports.FindAsync(db, current, time, request.Id, cancellationToken).ConfigureAwait(false);
        return new DataExportDto(found.ExpiresAt!.Value);
    }
}

internal sealed class GetDataExportArchiveHandler(IAppDbContext db, ICurrentMember current, TimeProvider time, IArchiveStore archives)
    : IRequestHandler<GetDataExportArchiveQuery, Stream>
{
    public async Task<Stream> Handle(GetDataExportArchiveQuery request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var found = await DownloadableExports.FindAsync(db, current, time, request.Id, cancellationToken).ConfigureAwait(false);
        return await archives.OpenAsync(found.ArchiveKey!, cancellationToken).ConfigureAwait(false)
            ?? throw new RefusalException(RefusalCodes.NotFound, RefusalKind.NotFound);
    }
}
