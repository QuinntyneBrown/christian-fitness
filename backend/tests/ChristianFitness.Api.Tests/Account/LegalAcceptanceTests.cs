using System.Net;
using System.Net.Http.Json;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Time.Testing;

namespace ChristianFitness.Api.Tests.Account;

public sealed class LegalAcceptanceFactory : ApiFactory
{
    public FakeTimeProvider Clock { get; } = new(new DateTimeOffset(2026, 5, 31, 23, 59, 59, TimeSpan.Zero));

    protected override void ConfigureServices(IServiceCollection services)
    {
        services.AddSingleton(new Domain.Legal.LegalDocuments([new(2026, 4, 1), new(2026, 6, 1)], [new(2026, 4, 1)]));
        services.RemoveAll<TimeProvider>();
        services.AddSingleton<TimeProvider>(Clock);
    }
}

public sealed class LegalAcceptanceTests(LegalAcceptanceFactory factory) : IClassFixture<LegalAcceptanceFactory>
{
    [Fact]
    public async Task Given_a_privacy_revision_When_members_join_across_midnight_Then_each_accepts_the_server_version()
    {
        using var client = Browser.CreateClient(factory);
        var first = new DateOnly(2026, 4, 1);
        foreach (var expected in new[] { first, new DateOnly(2026, 6, 1) })
        {
            var email = $"legal-{expected.Month}@example.org";
            using var response = await client.PostAsJsonAsync(new Uri("/api/account/join", UriKind.Relative),
                new { fullName = "Grace", email, password = "abundantlife", ageConfirmed = true, acceptedPrivacyVersion = "1999-01-01", acceptedTermsVersion = "1999-01-01" },
                TestContext.Current.CancellationToken);
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var member = await db.Members.SingleAsync(m => m.Email == email, TestContext.Current.CancellationToken);
            Assert.Equal(expected, db.Entry(member).Property<DateOnly?>("AcceptedPrivacyVersion").CurrentValue);
            Assert.Equal(first, db.Entry(member).Property<DateOnly?>("AcceptedTermsVersion").CurrentValue);
            Assert.Equal(factory.Clock.GetUtcNow(), db.Entry(member).Property<DateTimeOffset?>("AcceptedLegalAt").CurrentValue);
            factory.Clock.Advance(TimeSpan.FromSeconds(1));
        }
    }
}
