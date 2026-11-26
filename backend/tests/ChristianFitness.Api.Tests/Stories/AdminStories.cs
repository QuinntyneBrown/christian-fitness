using System.Text.Json;
using ChristianFitness.Api.Tests.Bylines;
using ChristianFitness.Api.Tests.Events;
using ChristianFitness.Domain.Members;
using ChristianFitness.Domain.News;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Stories;

/// <summary>
/// What the console's story tests need (L2-068, L2-069; ADR 0097): the stories endpoints, staff of
/// either role signed in, and stories put straight in the store at a known status and time.
/// </summary>
internal static class AdminStories
{
    public const string Path = "/api/admin/stories";

    public static Task<string> SignInAsync(StoriesFactory factory, HttpClient client, string email, StaffRoleName role = StaffRoleName.Admin) =>
        AdminBylines.SignInAsync(factory, client, email, role);

    public static Task<HttpResponseMessage> GetAsync(HttpClient client, string cookie, string path) =>
        AdminEvents.SendAsync(client, HttpMethod.Get, path, cookie);

    public static Task<HttpResponseMessage> SendAsync(HttpClient client, HttpMethod method, string path, string cookie, object? body = null) =>
        AdminEvents.SendAsync(client, method, path, cookie, body);

    public static Task<JsonElement> JsonAsync(HttpResponseMessage response) => AdminBylines.JsonAsync(response);

    public static string[] Keys(JsonElement element) => AdminBylines.Keys(element);

    /// <summary>The ids of a list answer's rows, in order.</summary>
    public static string[] Ids(JsonElement list) => [.. list.GetProperty("items").EnumerateArray().Select(r => r.GetProperty("id").GetString()!)];
}

/// <summary>The API with a clock at the mocks' today, and a way to put stories in the store.</summary>
public class StoriesFactory : BylinesFactory
{
    /// <summary>
    /// Puts a story in the store, written at <paramref name="at"/> and taken to
    /// <paramref name="status"/> through the domain's own transitions, each a minute after the last.
    /// A Scheduled story is scheduled for <paramref name="publishAt"/> (a day after it was written by
    /// default) by <paramref name="scheduledBy"/>; a time before now makes it past due.
    /// </summary>
    internal async Task<Story> PutStoryAsync(
        string headline,
        StoryStatus status = StoryStatus.Draft,
        DateTimeOffset? at = null,
        Guid? bylineId = null,
        StorySection? section = StorySection.Community,
        bool unpublished = false,
        StoryPlacement placement = StoryPlacement.Latest,
        string? slug = null,
        DateTimeOffset? publishAt = null,
        Guid? scheduledBy = null,
        string summary = "",
        string? imageKey = null)
    {
        var when = at ?? Time.GetUtcNow();
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        bylineId ??= await db.Bylines.Select(b => (Guid?)b.Id).FirstOrDefaultAsync(TestContext.Current.CancellationToken)
            ?? await AddBylineAsync($"Story Writer {Guid.NewGuid():N}"[..30]);
        var story = Story.Create(
            Story.Blank with { Headline = headline, Summary = summary, Text = "Some words.", Section = section, BylineId = bylineId, Placement = placement, Slug = slug, ImageKey = imageKey },
            when);
        switch (status)
        {
            case StoryStatus.InReview:
                story.SendForReview(when.AddMinutes(1));
                break;
            case StoryStatus.Published:
                story.Publish(when.AddMinutes(1));
                break;
            case StoryStatus.Scheduled:
                story.Schedule(publishAt ?? when.AddDays(1), scheduledBy ?? Guid.NewGuid(), when.AddMinutes(1));
                break;
        }

        if (unpublished)
        {
            story.Unpublish(when.AddMinutes(2));
        }

        db.Stories.Add(story);
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        return story;
    }

    /// <summary>Puts an event starting <paramref name="startsAt"/> in the store: published unless told otherwise.</summary>
    internal async Task<Guid> AddStoryEventAsync(string title, DateTimeOffset startsAt, bool published = true)
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var e = ChristianFitness.Domain.Events.Event.CreateDraft(title, ChristianFitness.Domain.Events.EventCategory.Run, startsAt, "Martin Goodman Trail", "Waterfront, Toronto", 0, 50, "Come run with us.", Time.GetUtcNow(), null);
        if (published)
        {
            e.Publish();
        }

        db.Events.Add(e);
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        return e.Id;
    }

    /// <summary>Empties the store of stories, so a front-page test starts with only its own.</summary>
    internal async Task ClearStoriesAsync()
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Stories.RemoveRange(await db.Stories.ToListAsync(TestContext.Current.CancellationToken));
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
    }

    /// <summary>Makes every Lead story in the store an ordinary one, so a test starts with none.</summary>
    internal async Task ClearLeadsAsync()
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        foreach (var story in await db.Stories.Where(s => s.Placement == StoryPlacement.Lead).ToListAsync(TestContext.Current.CancellationToken))
        {
            story.GiveUpLead();
        }

        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
    }

    /// <summary>How many stories are In review now.</summary>
    internal async Task<int> InReviewCountAsync()
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await db.Stories.CountAsync(s => s.Status == StoryStatus.InReview, TestContext.Current.CancellationToken);
    }

    /// <summary>The ids of the Published stories placed as the Lead.</summary>
    internal async Task<Guid[]> PublishedLeadsAsync()
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await db.Stories.Where(s => s.Status == StoryStatus.Published && s.Placement == StoryPlacement.Lead).Select(s => s.Id).ToArrayAsync(TestContext.Current.CancellationToken);
    }

    /// <summary>The story as stored now, or none.</summary>
    internal async Task<Story?> FindStoryAsync(Guid id)
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await db.Stories.AsNoTracking().SingleOrDefaultAsync(s => s.Id == id, TestContext.Current.CancellationToken);
    }

    /// <summary>The audit entries naming <paramref name="recordId"/>, oldest first: who, what and of which type.</summary>
    internal async Task<(Guid Actor, string Action, string Type)[]> AuditOfAsync(Guid recordId)
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var entries = await db.AuditEntries.AsNoTracking().Where(e => e.RecordId == recordId).ToListAsync(TestContext.Current.CancellationToken);
        return [.. entries.OrderBy(e => e.OccurredAt).ThenBy(e => e.Id).Select(e => (e.ActorMemberId, e.Action, e.RecordType))];
    }

    /// <summary>The id of the member with <paramref name="email"/>.</summary>
    internal async Task<Guid> MemberIdAsync(string email)
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await db.Members.Where(m => m.NormalizedEmail == email).Select(m => m.Id).SingleAsync(TestContext.Current.CancellationToken);
    }
}
