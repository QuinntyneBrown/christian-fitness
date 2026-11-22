using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Errors;
using ChristianFitness.Application.Sessions;
using ChristianFitness.Domain.Members;
using ChristianFitness.Domain.Sessions;
using ChristianFitness.Infrastructure.Persistence;
using ChristianFitness.Infrastructure.Security;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Time.Testing;

namespace ChristianFitness.Application.Tests.Sessions;

/// <summary>
/// L2-004 AC1 to AC4: which sign-ins open a session and which are refused, and with what, one
/// case per row (ADR 0009, ADR 0010). Each test has its own store and clock.
/// </summary>
public sealed class SignInHandlerTests : IAsyncDisposable
{
    private const string Email = "Grace.Thompson@Gmail.com";
    private const string Password = "abundantlife";
    private const string SuspendedEmail = "tsimmons22@gmail.com";
    private const string Suspended = "suspended";
    private const string Paused = "paused";
    private const string Invalid = "invalid";
    private const string SignedIn = "signed in";

    private static readonly DateTimeOffset Now = new(2026, 11, 22, 9, 0, 0, TimeSpan.Zero);

    private readonly ServiceProvider _services;
    private readonly RecordingSessionSignIn _session = new();
    private readonly FakeTimeProvider _time = new(Now);
    private readonly Member _grace;
    private readonly Member _tyler;

    public SignInHandlerTests()
    {
        var store = $"sign-in-{Guid.NewGuid():N}";
        _services = new ServiceCollection()
            .AddApplication()
            .AddDbContext<AppDbContext>(options => options.UseInMemoryDatabase(store))
            .AddScoped<IAppDbContext>(provider => provider.GetRequiredService<AppDbContext>())
            .AddSingleton<IPasswordHasherService, IdentityPasswordHasher>()
            .AddSingleton<ISessionSignIn>(_session)
            .AddSingleton<TimeProvider>(_time)
            .BuildServiceProvider();
        var hash = new IdentityPasswordHasher().Hash(Password);
        _grace = Member.Join("Grace Thompson", Email, hash, Now.AddDays(-30));
        _tyler = Member.Join("Tyler Simmons", SuspendedEmail, hash, Now.AddDays(-30));
        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Members.AddRange(_grace, _tyler);
        // A suspended member: staff set the status in slice 27.1; the store does it here.
        db.Entry(_tyler).Property(m => m.Status).CurrentValue = MemberStatus.Suspended;
        db.SaveChanges();
    }

    public static TheoryData<string, string, string, bool> Cases() => new()
    {
        // why, email, password, signed in (else refused with invalid_credentials)
        { "the email and password", Email, Password, true },
        { "the email in lower case", "grace.thompson@gmail.com", Password, true },
        { "the email with spaces around it", "  grace.thompson@gmail.com ", Password, true },
        { "a wrong password", Email, "abundantlifE", false },
        { "the password with a space added", Email, Password + " ", false },
        { "an unknown email", "nobody@gmail.com", Password, false },
        { "a blank email", "", Password, false },
        { "an email of spaces", "   ", Password, false },
        { "a blank password", Email, "", false },
    };

    [Theory]
    [MemberData(nameof(Cases))]
    public async Task Given_a_sign_in_When_it_is_handled_Then_it_opens_a_session_or_is_refused(string why, string email, string password, bool signedIn)
    {
        var sending = SendAsync(email, password);

        if (signedIn)
        {
            var session = await sending;
            Assert.Equal((_grace.Id, "Grace Thompson"), (session.MemberId, session.Name));
            Assert.Equal([_grace.Id], _session.SignedIn);
        }
        else
        {
            var refusal = await Assert.ThrowsAsync<RefusalException>(() => sending);
            Assert.Equal((RefusalCodes.InvalidCredentials, RefusalKind.Unauthenticated), (refusal.Code, refusal.Kind));
            Assert.Empty(_session.SignedIn);
        }

        Assert.NotNull(why);
    }

    public static TheoryData<string, string, int[], string, string, string, int> WindowCases() => new()
    {
        // why, email of the earlier failures, their ages in seconds, email signing in, password,
        // outcome, failures for the email signing in afterwards
        { "4 failures in the window, then the right password", Email, [10, 60, 300, 899], Email, Password, SignedIn, 0 },
        { "4 failures in the window, then a wrong one", Email, [10, 60, 300, 899], Email, "wrong", Invalid, 5 },
        { "5 failures in the window, then the right password", Email, [10, 60, 300, 600, 899], Email, Password, Paused, 5 },
        { "5 failures in the window, then a wrong password, not recorded", Email, [10, 60, 300, 600, 899], Email, "wrong", Paused, 5 },
        { "5 failures, the oldest exactly 15 minutes ago", Email, [10, 60, 300, 600, 900], Email, Password, SignedIn, 0 },
        { "5 failures all over 15 minutes ago", Email, [901, 1000, 2000, 3000, 9000], Email, Password, SignedIn, 0 },
        { "5 failures with the email in another case", "GRACE.thompson@gmail.com ", [1, 2, 3, 4, 5], Email, Password, Paused, 5 },
        { "5 failures for another email", "someone@gmail.com", [1, 2, 3, 4, 5], Email, Password, SignedIn, 0 },
        { "5 failures for an unknown email, then it again", "nobody@gmail.com", [1, 2, 3, 4, 5], "nobody@gmail.com", Password, Paused, 5 },
        { "4 failures for an unknown email, then it again", "nobody@gmail.com", [1, 2, 3, 4], "nobody@gmail.com", Password, Invalid, 5 },
        { "a wrong password with old failures left behind", Email, [901, 1000], Email, "wrong", Invalid, 1 },
        { "a suspended member with the right password", SuspendedEmail, [], SuspendedEmail, Password, Suspended, 0 },
        { "a suspended member with a wrong password", SuspendedEmail, [], SuspendedEmail, "wrong", Invalid, 1 },
        { "a suspended member, paused", SuspendedEmail, [1, 2, 3, 4, 5], SuspendedEmail, Password, Paused, 5 },
    };

    [Theory]
    [MemberData(nameof(WindowCases))]
    public async Task Given_earlier_failures_When_a_sign_in_is_handled_Then_the_window_decides(
        string why, string failedEmail, int[] ages, string email, string password, string outcome, int failuresAfter)
    {
        await SeedFailuresAsync(failedEmail, ages);

        var sending = SendAsync(email, password);

        if (outcome == SignedIn)
        {
            await sending;
            Assert.Single(_session.SignedIn);
        }
        else
        {
            var refusal = await Assert.ThrowsAsync<RefusalException>(() => sending);
            var expected = outcome switch
            {
                Paused => (RefusalCodes.TooManyAttempts, RefusalKind.TooManyRequests),
                Suspended => (RefusalCodes.AccountSuspended, RefusalKind.Forbidden),
                _ => (RefusalCodes.InvalidCredentials, RefusalKind.Unauthenticated),
            };
            Assert.Equal(expected, (refusal.Code, refusal.Kind));
            Assert.Empty(_session.SignedIn);
        }

        Assert.Equal(failuresAfter, await FailuresForAsync(email));
        Assert.NotNull(why);
    }

    // Recording a failure forgets every failure the window has left behind, whatever its email.
    [Fact]
    public async Task Given_old_failures_for_other_emails_When_a_failure_is_recorded_Then_only_the_window_is_kept()
    {
        await SeedFailuresAsync("old@gmail.com", [900, 5000]);
        await SeedFailuresAsync("recent@gmail.com", [899]);

        await Assert.ThrowsAsync<RefusalException>(() => SendAsync(Email, "wrong"));

        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(
            [(SignInFailure.KeyOf("grace.thompson@gmail.com"), Now), (SignInFailure.KeyOf("recent@gmail.com"), Now.AddSeconds(-899))],
            (await db.SignInFailures.ToListAsync(TestContext.Current.CancellationToken)).Select(f => (f.EmailKey, f.FailedAt)).OrderBy(f => f.FailedAt).Reverse());
    }

    // The store keeps a key, never the address typed.
    [Fact]
    public async Task Given_a_failed_sign_in_When_it_is_recorded_Then_the_email_is_kept_only_as_its_sha256()
    {
        await Assert.ThrowsAsync<RefusalException>(() => SendAsync(" Stranger@Example.org", "wrong"));

        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var failure = Assert.Single(await db.SignInFailures.ToListAsync(TestContext.Current.CancellationToken));
        // The SHA-256 of the lookup key, "stranger@example.org", in lower-case hex.
        Assert.Equal(Convert.ToHexStringLower(System.Security.Cryptography.SHA256.HashData("stranger@example.org"u8)), failure.EmailKey);
        Assert.DoesNotContain("stranger", failure.EmailKey, StringComparison.OrdinalIgnoreCase);
    }

    public ValueTask DisposeAsync() => _services.DisposeAsync();

    private async Task<SessionDto> SendAsync(string email, string password)
    {
        using var scope = _services.CreateScope();
        var sender = scope.ServiceProvider.GetRequiredService<ISender>();
        return await sender.Send(new SignInCommand { Email = email, Password = password }, TestContext.Current.CancellationToken);
    }

    private async Task SeedFailuresAsync(string email, int[] agesInSeconds)
    {
        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.SignInFailures.AddRange(agesInSeconds.Select(age => SignInFailure.Record(Member.NormalizeEmail(email), Now.AddSeconds(-age))));
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
    }

    private async Task<int> FailuresForAsync(string email)
    {
        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var key = SignInFailure.KeyOf(Member.NormalizeEmail(email));
        return await db.SignInFailures.CountAsync(f => f.EmailKey == key, TestContext.Current.CancellationToken);
    }

    private sealed class RecordingSessionSignIn : ISessionSignIn
    {
        public List<Guid> SignedIn { get; } = [];

        public Task SignInAsync(Member member)
        {
            SignedIn.Add(member.Id);
            return Task.CompletedTask;
        }

        public Task SignOutAsync() => Task.CompletedTask;
    }
}
