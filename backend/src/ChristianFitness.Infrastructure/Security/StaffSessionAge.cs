using System.Globalization;
using Microsoft.AspNetCore.Authentication;

namespace ChristianFitness.Infrastructure.Security;

/// <summary>
/// The 12-hour maximum of a staff session (L2-018 AC9; ADR 0062, ADR 0100): however busy, a staff
/// session ends 12 hours after sign-in, so Google is asked again and leaving the team ends console
/// access the same day. The sign-in time is kept in the ticket, because the cookie handler moves
/// <see cref="AuthenticationProperties.IssuedUtc"/> on every renewal. A ticket without it was issued
/// before the rule and counts as past the maximum (issue 148).
/// </summary>
public static class StaffSessionAge
{
    /// <summary>The ticket item holding when the staff member signed in (round-trip UTC).</summary>
    public const string SignedInAtItem = "cf.signedInAt";

    /// <summary>The longest a staff session lasts from sign-in.</summary>
    public static readonly TimeSpan Maximum = TimeSpan.FromHours(12);

    /// <summary>Records <paramref name="signedInAt"/> as the sign-in time of a new session.</summary>
    public static void Record(AuthenticationProperties properties, DateTimeOffset signedInAt)
    {
        ArgumentNullException.ThrowIfNull(properties);
        properties.Items[SignedInAtItem] = signedInAt.UtcDateTime.ToString("O", CultureInfo.InvariantCulture);
    }

    /// <summary>True when the session has no recorded sign-in time or signed in 12 hours or more before <paramref name="now"/>.</summary>
    public static bool IsPast(AuthenticationProperties properties, DateTimeOffset now)
    {
        ArgumentNullException.ThrowIfNull(properties);
        return !properties.Items.TryGetValue(SignedInAtItem, out var value)
            || !DateTimeOffset.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out var signedInAt)
            || now - signedInAt >= Maximum;
    }
}
