using ChristianFitness.Application.Abstractions;
using ChristianFitness.Domain.Events;
using ChristianFitness.Domain.Members;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Chat;

/// <summary>
/// Sends direct messages as the Christian Fitness account (ADR 0065, ADR 0090), one per request
/// scope. <see cref="AddAsync"/> adds an ordinary <see cref="DirectMessage"/> in the caller's unit
/// of work, unless the recipient is suspended; once the caller has saved, <see cref="PushAsync"/>
/// delivers each to the recipient's open connections. Logs nothing: no text, no recipient.
/// </summary>
public sealed class SystemMessages(IAppDbContext db, IChatChannel channel, TimeProvider time)
{
    private readonly List<DirectMessage> _added = [];

    /// <summary>Adds <paramref name="text"/> to <paramref name="recipientId"/>; false when they are suspended or unknown.</summary>
    public async Task<bool> AddAsync(Guid recipientId, string text, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(text);
        var active = await db.Members.AsNoTracking()
            .AnyAsync(m => m.Id == recipientId && m.Status != MemberStatus.Suspended, cancellationToken)
            .ConfigureAwait(false);
        if (!active)
        {
            return false;
        }

        var message = DirectMessage.Of(SystemMembers.ChristianFitnessId, recipientId, text, time.GetUtcNow());
        db.DirectMessages.Add(message);
        _added.Add(message);
        return true;
    }

    /// <summary>Delivers the messages added, after the caller saved them.</summary>
    public async Task PushAsync(CancellationToken cancellationToken)
    {
        foreach (var message in _added)
        {
            var dto = new ChatMessageDto(message.Id, SystemMembers.ChristianFitnessId, SystemMembers.ChristianFitnessId, SystemMembers.ChristianFitnessName, message.Text, message.SentAt);
            await channel.SendToMemberAsync(message.RecipientId, dto, cancellationToken).ConfigureAwait(false);
        }

        _added.Clear();
    }
}
