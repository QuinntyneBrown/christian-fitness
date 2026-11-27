using ChristianFitness.Application.Abstractions;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Chat;

/// <summary>
/// How a message names its author and shows its text (L2-066 AC7; ADR 0078, ADR 0118): a member whose
/// account is deleting is "A former member"; once erased, their id names nobody, so the author is
/// "Deleted member" and the text, erased in place, reads "Message removed".
/// </summary>
internal static class ChatAuthors
{
    public const string FormerMember = "A former member";

    public const string DeletedMember = "Deleted member";

    public const string MessageRemoved = "Message removed";

    /// <summary>Each of <paramref name="ids"/> with the name messages show for them.</summary>
    public static async Task<IReadOnlyDictionary<Guid, string>> NamesAsync(IAppDbContext db, IReadOnlyCollection<Guid> ids, CancellationToken cancellationToken)
    {
        var found = await db.Members.AsNoTracking()
            .Where(m => ids.Contains(m.Id))
            .ToDictionaryAsync(m => m.Id, m => m.DeletionRequestedAt == null ? m.Name : FormerMember, cancellationToken)
            .ConfigureAwait(false);
        return ids.Distinct().ToDictionary(id => id, id => found.GetValueOrDefault(id, DeletedMember));
    }

    /// <summary>A message's text as it shows: an erased one, which is empty, is "Message removed".</summary>
    public static string TextOf(string text) => text.Length == 0 ? MessageRemoved : text;
}
