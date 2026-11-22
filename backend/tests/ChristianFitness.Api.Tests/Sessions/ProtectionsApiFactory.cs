using ChristianFitness.Domain.Members;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Time.Testing;

namespace ChristianFitness.Api.Tests.Sessions;

/// <summary>
/// The API on a clock the tests move (never sleep): <see cref="Time"/> starts on a fixed instant
/// and only <see cref="FakeTimeProvider.Advance"/> moves it. It can also suspend a member, as staff
/// will in slice 27.1 (ADR 0010).
/// </summary>
public sealed class ProtectionsApiFactory : ApiFactory
{
    public FakeTimeProvider Time { get; } = new(new DateTimeOffset(2026, 11, 22, 9, 0, 0, TimeSpan.Zero));

    protected override void ConfigureServices(IServiceCollection services)
    {
        services.RemoveAll<TimeProvider>();
        services.AddSingleton<TimeProvider>(Time);
    }

    /// <summary>Makes the member with <paramref name="email"/> suspended, through the store.</summary>
    public async Task SuspendAsync(string email)
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var normalized = Member.NormalizeEmail(email);
        var member = await db.Members.SingleAsync(m => m.NormalizedEmail == normalized, TestContext.Current.CancellationToken);
        db.Entry(member).Property(m => m.Status).CurrentValue = MemberStatus.Suspended;
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
    }
}
