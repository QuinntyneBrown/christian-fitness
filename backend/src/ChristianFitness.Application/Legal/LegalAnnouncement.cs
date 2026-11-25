using System.Globalization;
using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Email;
using ChristianFitness.Domain.Legal;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Legal;

public sealed class LegalAnnouncement(IAppDbContext db, IEmailSender sender, MemberAppAddress app, TimeProvider clock, LegalDocuments schedule)
{
    public async Task<int> SendAsync(string document, DateOnly version, CancellationToken cancellationToken)
    {
        var today = DateOnly.FromDateTime(clock.GetUtcNow().UtcDateTime);
        if (!schedule.Versions(document).Contains(version) || version.DayNumber - today.DayNumber < 30)
        {
            throw new InvalidOperationException("A published version at least 30 days away is required.");
        }

        var title = document == "privacy" ? "Privacy Policy" : "Terms of Service";
        var effective = version.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        var link = new Uri(app.BaseUrl, $"{document}#whats-changing");
        var body = $"Our {title} changes on {effective}. Read what is changing: {link}. Continued use after that date means you accept the revision.";
        var sent = 0;
        Guid? after = null;
        while (true)
        {
            var members = db.Members.AsNoTracking();
            if (after is Guid cursor)
            {
                members = members.Where(member => member.Id.CompareTo(cursor) > 0);
            }

            var batch = await members.OrderBy(member => member.Id).Take(100)
                .Select(member => new { member.Id, member.Email }).ToListAsync(cancellationToken).ConfigureAwait(false);
            foreach (var member in batch)
            {
                await sender.SendAsync(new EmailMessage(member.Email, $"Upcoming change to our {title}", body), cancellationToken).ConfigureAwait(false);
                sent++;
            }

            if (batch.Count < 100)
            {
                return sent;
            }

            after = batch[^1].Id;
        }
    }
}
