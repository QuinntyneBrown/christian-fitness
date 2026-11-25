namespace ChristianFitness.Domain.Events;

/// <summary>What a group chat belongs to (ADR 0080, ADR 0099).</summary>
public enum ChatScopeKind
{
    /// <summary>A standalone event's own chat.</summary>
    Event,

    /// <summary>A series' one chat, shared by all its sessions.</summary>
    Series,
}

/// <summary>
/// A group chat's conversation scope (ADR 0080, ADR 0099): a kind and the id of the event or the
/// series it belongs to. The scope of an event is its series when it has one, otherwise itself.
/// </summary>
public readonly record struct ChatScope(ChatScopeKind Kind, Guid Id)
{
    /// <summary>The chat <paramref name="e"/>'s members talk in: its series' when it is a session, else its own.</summary>
    public static ChatScope Of(Event e)
    {
        ArgumentNullException.ThrowIfNull(e);
        return e.SeriesId is { } seriesId ? new(ChatScopeKind.Series, seriesId) : new(ChatScopeKind.Event, e.Id);
    }

    /// <summary>A standalone event's own chat.</summary>
    public static ChatScope OfEvent(Guid eventId) => new(ChatScopeKind.Event, eventId);

    /// <summary>The series' one chat.</summary>
    public static ChatScope OfSeries(Guid seriesId) => new(ChatScopeKind.Series, seriesId);
}
