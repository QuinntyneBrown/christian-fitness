using ChristianFitness.Domain.Notifications;

namespace ChristianFitness.Application.Tests.Notifications;

/// <summary>
/// The rules of a notification (ADR 0083), one case per row: the path it links to must be inside the
/// app; it expires 30 days after it was created; and reading it twice keeps the first instant.
/// </summary>
public sealed class NotificationTests
{
    private static readonly DateTimeOffset Now = new(2026, 4, 15, 12, 45, 0, TimeSpan.Zero);

    public static TheoryData<string, string?, bool> Paths() => new()
    {
        // why, href, inside the app
        { "an event", "/events/0195f2a4-0000-7000-8000-000000000001", true },
        { "a page with a fragment", "/preferences#notifications", true },
        { "the root alone", "/", false },
        { "nothing", null, false },
        { "empty", "", false },
        { "relative", "events/1", false },
        { "protocol-relative", "//evil.example/events", false },
        { "a backslash after the slash", "/\\evil.example", false },
        { "another site", "https://evil.example/events", false },
        { "a script", "javascript:alert(1)", false },
        { "white space inside", "/events/ 1", false },
        { "200 characters", "/" + new string('e', 199), true },
        { "201 characters", "/" + new string('e', 200), false },
    };

    [Theory]
    [MemberData(nameof(Paths))]
    public void IsAppPath_answers_by_case(string why, string? href, bool expected) =>
        Assert.True(Notification.IsAppPath(href) == expected, why);

    public static TheoryData<string, TimeSpan, bool> Ages() => new()
    {
        // why, age at Now, kept
        { "just created", TimeSpan.Zero, true },
        { "29 days", TimeSpan.FromDays(29), true },
        { "a second short of 30 days", TimeSpan.FromDays(30) - TimeSpan.FromSeconds(1), true },
        { "30 days exactly", TimeSpan.FromDays(30), false },
        { "31 days", TimeSpan.FromDays(31), false },
    };

    [Theory]
    [MemberData(nameof(Ages))]
    public void KeptSince_keeps_less_than_30_days(string why, TimeSpan age, bool kept) =>
        Assert.True(Now - age > Notification.KeptSince(Now) == kept, why);

    [Fact]
    public void MarkRead_keeps_the_first_instant()
    {
        var notification = Notification.Of(Guid.NewGuid(), NotificationKind.EventReminder, "Tomorrow: Easter Sunrise 5K", "Sat, Apr 18", "/events/1", Now);

        notification.MarkRead(Now.AddMinutes(1));
        notification.MarkRead(Now.AddMinutes(2));

        Assert.Equal(Now.AddMinutes(1), notification.ReadAt);
    }
}
