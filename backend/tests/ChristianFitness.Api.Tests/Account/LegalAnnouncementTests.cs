using ChristianFitness.Application.Legal;
using ChristianFitness.Domain.Legal;
using ChristianFitness.Domain.Members;
using ChristianFitness.Infrastructure.Email;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Time.Testing;
using ChristianFitness.Application.Email;

namespace ChristianFitness.Api.Tests.Account;

// L2-067 AC6. The operator command uses the same member store as Join.
public sealed class LegalAnnouncementTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task Given_a_published_revision_When_announced_Then_every_member_gets_the_dated_notice()
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var clock = new FakeTimeProvider(new DateTimeOffset(2026, 5, 2, 0, 0, 0, TimeSpan.Zero));
        var version = new DateOnly(2026, 6, 1);
        var mail = new RecordingEmailSender();
        var app = new MemberAppAddress(new Uri("https://example.org"));
        var announce = new LegalAnnouncement(db, mail, app, clock, new LegalDocuments([version], []));
        var token = TestContext.Current.CancellationToken;
        db.Members.AddRange(Member.Join("One", "one@example.org", "hash", clock.GetUtcNow()),
            Member.Join("Two", "two@example.org", "hash", clock.GetUtcNow()));
        await db.SaveChangesAsync(token);

        Assert.Equal(2, await announce.SendAsync("privacy", version, token));
        Assert.Equal(["one@example.org", "two@example.org"], mail.Sent().Select(message => message.To).Order());
        Assert.All(mail.Sent(), message =>
        {
            Assert.Contains("2026-06-01", message.Text, StringComparison.Ordinal);
            Assert.Contains("https://example.org/privacy#whats-changing", message.Text, StringComparison.Ordinal);
        });
        clock.Advance(TimeSpan.FromSeconds(1));
        await Assert.ThrowsAsync<InvalidOperationException>(() => announce.SendAsync("privacy", version, token));
        Assert.Equal(2, mail.Sent().Count);
    }
}
