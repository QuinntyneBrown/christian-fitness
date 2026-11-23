using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Profiles;
using ChristianFitness.Domain.Members;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Time.Testing;

namespace ChristianFitness.Api.Tests.Profiles;

/// <summary>
/// The API on a clock the tests move, with the registrations a test gives it: until registration
/// exists (slice 6.1) nothing in the product creates one, so <see cref="Registrations"/> stands in
/// for the reader (ADR 0014). It can also set the profile fields that only slice 18.2 edits.
/// </summary>
public sealed class ProfileApiFactory : ApiFactory
{
    public static readonly DateTimeOffset Start = new(2026, 1, 14, 15, 30, 0, TimeSpan.Zero);

    public FakeTimeProvider Time { get; } = new(Start);

    public FakeRegistrationReader Registrations { get; } = new();

    protected override void ConfigureServices(IServiceCollection services)
    {
        services.RemoveAll<TimeProvider>();
        services.AddSingleton<TimeProvider>(Time);
        services.RemoveAll<IRegistrationReader>();
        services.AddSingleton<IRegistrationReader>(Registrations);
    }

    /// <summary>Sets the city, bio and goals of the member with <paramref name="email"/>, through the store.</summary>
    public async Task SetProfileAsync(string email, string city, string bio, IReadOnlyList<string> goals)
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var normalized = Member.NormalizeEmail(email);
        var member = await db.Members.SingleAsync(m => m.NormalizedEmail == normalized, TestContext.Current.CancellationToken);
        db.Entry(member).Property(m => m.City).CurrentValue = city;
        db.Entry(member).Property(m => m.Bio).CurrentValue = bio;
        db.Entry(member).Property(m => m.Goals).CurrentValue = goals;
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
    }

    /// <summary>Answers each member's events as a test set them, and records every question asked.</summary>
    public sealed class FakeRegistrationReader : IRegistrationReader
    {
        private readonly Dictionary<Guid, IReadOnlyList<UpcomingEventDto>> _events = [];
        private readonly List<(Guid MemberId, DateTimeOffset Now)> _asked = [];
        private readonly Lock _gate = new();

        public IReadOnlyList<(Guid MemberId, DateTimeOffset Now)> Asked
        {
            get
            {
                lock (_gate)
                {
                    return [.. _asked];
                }
            }
        }

        public void Set(Guid memberId, IReadOnlyList<UpcomingEventDto> events)
        {
            lock (_gate)
            {
                _events[memberId] = events;
            }
        }

        public Task<IReadOnlyList<UpcomingEventDto>> UpcomingForAsync(Guid memberId, DateTimeOffset now, CancellationToken cancellationToken)
        {
            lock (_gate)
            {
                _asked.Add((memberId, now));
                return Task.FromResult(_events.TryGetValue(memberId, out var events) ? events : (IReadOnlyList<UpcomingEventDto>)[]);
            }
        }
    }
}
