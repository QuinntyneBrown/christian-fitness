using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Tests.Events;
using ChristianFitness.Application.Chat;
using ChristianFitness.Domain.Directory;
using ChristianFitness.Domain.Events;
using ChristianFitness.Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Preferences;

/// <summary>
/// L2-065 AC5 and AC11 (journey 34, slice 3): with "Let anyone message me" off, the setting of a new
/// member, a member who shares no group chat with them is refused <c>messages_restricted</c> when
/// they join, send or read the conversation; one who shares a group, one whose conversation is
/// already open, and anyone writing to the owner of a published listing are not; with the switch on
/// nobody is refused.
/// </summary>
public sealed class MessagingRuleTests(RegisterForEventFactory factory) : IClassFixture<RegisterForEventFactory>
{
    public enum Tie
    {
        None,
        SharedGroup,
        OpenConversation,
        ListingOwner,
        AllowsAnyone,
    }

    [Theory]
    [InlineData(Tie.None, "messages_restricted")]
    [InlineData(Tie.SharedGroup, null)]
    [InlineData(Tie.OpenConversation, null)]
    [InlineData(Tie.ListingOwner, null)]
    [InlineData(Tie.AllowsAnyone, null)]
    public async Task Given_what_ties_two_members_When_one_starts_a_conversation_Then_it_is_allowed_or_refused_messages_restricted(Tie tie, string? code)
    {
        using var client = Browser.CreateClient(factory);
        var (recipientCookie, recipient) = await Prefs.JoinAsync(factory, client, $"recipient.{tie}@example.org");
        var (senderCookie, sender) = await Prefs.JoinAsync(factory, client, $"sender.{tie}@example.org");
        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var now = factory.Time.GetUtcNow();
            switch (tie)
            {
                case Tie.SharedGroup:
                    var shared = Event.CreateDraft("Shared run", EventCategory.Run, now.AddDays(3), "Marilyn Bell Park", "Waterfront, Toronto", 0, 50, "A summary.", now, null);
                    shared.Publish(shared.CreatedAt);
                    db.Events.Add(shared);
                    db.Registrations.Add(Registration.Of(shared.Id, recipient, 0, now));
                    db.Registrations.Add(Registration.Of(shared.Id, sender, 0, now));
                    break;
                case Tie.OpenConversation:
                    // The recipient wrote first, before switching anyone off: the conversation is open.
                    db.DirectMessages.Add(DirectMessage.Of(recipient, sender, "Good to meet you at the 5K.", now));
                    break;
                case Tie.ListingOwner:
                    var listing = DirectoryListing.CreateDraft(Guid.CreateVersion7(), ListingKind.Person, "Coach Recipient", "A tagline", "Toronto", [], now);
                    // Claiming publishes it and makes the recipient its owner.
                    listing.Claim(recipient, now);
                    db.DirectoryListings.Add(listing);
                    break;
            }

            await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        }

        if (tie == Tie.AllowsAnyone)
        {
            var body = Prefs.Body();
            body["privacy"] = new { visibility = "members", showHomeChurch = false, showOnAttendeeLists = true, letAnyoneMessage = true };
            using var saved = await Prefs.SaveAsync(client, recipientCookie, body);
            Assert.Equal(HttpStatusCode.OK, saved.StatusCode);
        }

        ChatAnswer joined;
        ChatAnswer sent;
        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var mediator = scope.ServiceProvider.GetRequiredService<ISender>();
            joined = await mediator.Send(new JoinDirectCommand(sender, recipient), TestContext.Current.CancellationToken);
        }

        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var mediator = scope.ServiceProvider.GetRequiredService<ISender>();
            sent = await mediator.Send(new SendDirectMessageCommand(sender, recipient, "Hello there"), TestContext.Current.CancellationToken);
        }

        using var history = await Browser.SendAsync(client, HttpMethod.Get, $"/api/messages/{recipient}/messages", senderCookie);
        using var profile = await Browser.SendAsync(client, HttpMethod.Get, $"/api/members/{recipient}/profile", senderCookie);
        var shown = await profile.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);

        // The profile says so before a conversation is tried, and only when it is restricted (AC5).
        Assert.Equal(code is not null, shown.TryGetProperty("messagesRestricted", out var restricted) && restricted.GetBoolean());

        Assert.Equal((code, code), (joined.Code, sent.Code));
        if (code is null)
        {
            Assert.Equal(HttpStatusCode.OK, history.StatusCode);
        }
        else
        {
            Assert.Equal(HttpStatusCode.Forbidden, history.StatusCode);
            Assert.Equal(code, (await history.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken)).GetProperty("code").GetString());
            await using var scope = factory.Services.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            Assert.False(await db.DirectMessages.AnyAsync(m => m.SenderId == sender && m.RecipientId == recipient, TestContext.Current.CancellationToken));
        }
    }
}
