using System.Security.Claims;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Infrastructure.Security;

/// <summary>
/// Keeps each session's ticket in the database, so the cookie carries only a key and signing out
/// deletes the session on the server (L2-004 AC5; ADR 0009): a copy of the cookie opens nothing
/// afterwards. An expired session is deleted when it is next read, and a member's expired sessions
/// when they next sign in, so the table holds only live sessions and recent leftovers.
/// </summary>
public sealed class DatabaseTicketStore(IServiceScopeFactory scopes, TimeProvider time) : ITicketStore
{
    public Task<string> StoreAsync(AuthenticationTicket ticket) => StoreAsync(ticket, CancellationToken.None);

    public async Task<string> StoreAsync(AuthenticationTicket ticket, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(ticket);
        var memberId = MemberIdOf(ticket);
        var now = time.GetUtcNow();
        using var scope = scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var expired = await db.Sessions
            .Where(session => session.MemberId == memberId && session.ExpiresAt != null && session.ExpiresAt <= now)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);
        db.Sessions.RemoveRange(expired);
        var record = new SessionRecord
        {
            Id = Guid.NewGuid().ToString("N"),
            MemberId = memberId,
            ExpiresAt = ticket.Properties.ExpiresUtc,
            Ticket = TicketSerializer.Default.Serialize(ticket),
        };
        db.Sessions.Add(record);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return record.Id;
    }

    public Task RenewAsync(string key, AuthenticationTicket ticket) => RenewAsync(key, ticket, CancellationToken.None);

    public async Task RenewAsync(string key, AuthenticationTicket ticket, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(ticket);
        using var scope = scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var record = await db.Sessions.FindAsync([key], cancellationToken).ConfigureAwait(false);
        if (record is null)
        {
            return;
        }

        record.ExpiresAt = ticket.Properties.ExpiresUtc;
        record.Ticket = TicketSerializer.Default.Serialize(ticket);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }

    private static readonly object ExpiredKey = new();

    /// <summary>
    /// True when this request's cookie named a session that had expired, so a challenge can say so
    /// (<c>session_expired</c>, L2-018 AC5; ADR 0016). A session that was signed out, or a key no
    /// session has, is not expired: nothing is known of it.
    /// </summary>
    public static bool FoundExpired(HttpContext context)
    {
        ArgumentNullException.ThrowIfNull(context);
        return context.Items.ContainsKey(ExpiredKey);
    }

    /// <summary>Marks this request's session as expired by a rule outside the store (the staff maximum age, ADR 0100).</summary>
    public static void MarkExpired(HttpContext context)
    {
        ArgumentNullException.ThrowIfNull(context);
        context.Items[ExpiredKey] = true;
    }

    public Task<AuthenticationTicket?> RetrieveAsync(string key) => RetrieveAsync(key, CancellationToken.None);

    public async Task<AuthenticationTicket?> RetrieveAsync(string key, HttpContext httpContext, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(httpContext);
        var (ticket, expired) = await FindAsync(key, cancellationToken).ConfigureAwait(false);
        if (expired)
        {
            httpContext.Items[ExpiredKey] = true;
        }

        return ticket;
    }

    public async Task<AuthenticationTicket?> RetrieveAsync(string key, CancellationToken cancellationToken) =>
        (await FindAsync(key, cancellationToken).ConfigureAwait(false)).Ticket;

    /// <summary>The live session's ticket, or none; an expired session is deleted and reported.</summary>
    private async Task<(AuthenticationTicket? Ticket, bool Expired)> FindAsync(string key, CancellationToken cancellationToken)
    {
        using var scope = scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var record = await db.Sessions.FindAsync([key], cancellationToken).ConfigureAwait(false);
        if (record is null)
        {
            return (null, false);
        }

        if (record.ExpiresAt is { } expiresAt && expiresAt <= time.GetUtcNow())
        {
            db.Sessions.Remove(record);
            await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
            return (null, true);
        }

        return (TicketSerializer.Default.Deserialize(record.Ticket), false);
    }

    public Task RemoveAsync(string key) => RemoveAsync(key, CancellationToken.None);

    public async Task RemoveAsync(string key, CancellationToken cancellationToken)
    {
        using var scope = scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var record = await db.Sessions.FindAsync([key], cancellationToken).ConfigureAwait(false);
        if (record is null)
        {
            return;
        }

        db.Sessions.Remove(record);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }

    private static Guid MemberIdOf(AuthenticationTicket ticket) =>
        Guid.TryParse(ticket.Principal.FindFirstValue(ClaimTypes.NameIdentifier), out var id)
            ? id
            : throw new InvalidOperationException("A session belongs to a member.");
}
