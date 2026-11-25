namespace ChristianFitness.Domain.Directory;

/// <summary>How the member who suggested a listing knows the suggested party (L2-062 AC2; ADR 0085).</summary>
public enum SuggestionRelation
{
    /// <summary>A self-submission: the sender runs it or is them.</summary>
    Myself,

    /// <summary>A friend, coach or group the sender knows.</summary>
    SomeoneIKnow,

    /// <summary>Somewhere the sender went and loved.</summary>
    SomewhereIveBeen,
}
