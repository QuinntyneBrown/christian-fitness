using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Admin;
using ChristianFitness.Application.Errors;
using ChristianFitness.Domain.Members;
using ChristianFitness.Domain.Sessions;
using ChristianFitness.Infrastructure.Persistence;
using ChristianFitness.Infrastructure.Security;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Time.Testing;

namespace ChristianFitness.Application.Tests.Admin;

/// <summary>
/// L2-018 AC1 to AC3, L2-046 AC1 and AC6: which admin password steps start a pending sign-in and
/// which are refused, and with which code, one case per row (ADR 0011, ADR 0013). None opens a
/// session: that is the second step's.
/// </summary>
public sealed class StaffSignInHandlerTests : IAsyncDisposable
{
    private const string Password = "abundantlife";

    private readonly ServiceProvider _services;
    private readonly RecordingStaffSessionSignIn _session = new();
    private readonly RecordingTwoStepCookie _cookie = new();
    private readonly FakeTimeProvider _time = new(new DateTimeOffset(2026, 11, 23, 9, 0, 0, TimeSpan.Zero));
    private readonly Dictionary<string, Member> _members = new(StringComparer.Ordinal);

    public StaffSignInHandlerTests()
    {
        var store = $"staff-sign-in-{Guid.NewGuid():N}";
        _services = new ServiceCollection()
            .AddApplication()
            .AddDbContext<AppDbContext>(options => options.UseInMemoryDatabase(store))
            .AddScoped<IAppDbContext>(provider => provider.GetRequiredService<AppDbContext>())
            .AddSingleton<IPasswordHasherService, IdentityPasswordHasher>()
            .AddSingleton<IStaffSessionSignIn>(_session)
            .AddSingleton<ITwoStepCookie>(_cookie)
            .AddSingleton<TimeProvider>(_time)
            .BuildServiceProvider();
        var hash = new IdentityPasswordHasher().Hash(Password);
        var joined = new DateTimeOffset(2026, 11, 22, 9, 0, 0, TimeSpan.Zero);
        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        foreach (var (email, role, twoStep) in new (string, StaffRoleName?, bool)[]
        {
            ("dana@christianfitness.ca", StaffRoleName.Admin, true),
            ("sam@christianfitness.ca", StaffRoleName.Moderator, true),
            ("lee@christianfitness.ca", StaffRoleName.Admin, false),
            ("grace.thompson@gmail.com", null, false),
        })
        {
            var member = Member.Join("Dana Reyes", email, hash, joined);
            _members[email] = member;
            db.Members.Add(member);
            if (role is { } name)
            {
                db.StaffRoles.Add(StaffRole.Grant(member, name));
            }

            if (twoStep)
            {
                db.StaffTwoSteps.Add(StaffTwoStep.SetUp(member.Id, joined));
            }
        }

        db.SaveChanges();
    }

    private const string Pending = "pending";

    public static TheoryData<string, string, string, string> Cases() => new()
    {
        // why, email, password, outcome: Pending for a pending sign-in, or the refusal's code
        { "an Admin", "dana@christianfitness.ca", Password, Pending },
        { "a Moderator", "sam@christianfitness.ca", Password, Pending },
        { "an Admin's email in another case", "Dana@ChristianFitness.CA", Password, Pending },
        { "an Admin without two-step verification set up", "lee@christianfitness.ca", Password, RefusalCodes.TwoStepNotSetUp },
        { "an Admin without two-step verification and a wrong password", "lee@christianfitness.ca", "abundantlifE", RefusalCodes.InvalidCredentials },
        { "a member without a staff role", "grace.thompson@gmail.com", Password, RefusalCodes.NotStaff },
        { "a member without a staff role and a wrong password", "grace.thompson@gmail.com", "abundantlifE", RefusalCodes.InvalidCredentials },
        { "an Admin with a wrong password", "dana@christianfitness.ca", "abundantlifE", RefusalCodes.InvalidCredentials },
        { "an unknown email", "nobody@christianfitness.ca", Password, RefusalCodes.InvalidCredentials },
        { "a blank email", "", Password, RefusalCodes.InvalidCredentials },
        { "a blank password", "dana@christianfitness.ca", "", RefusalCodes.InvalidCredentials },
    };

    [Theory]
    [MemberData(nameof(Cases))]
    public async Task Given_an_admin_password_step_When_it_is_handled_Then_it_starts_a_pending_sign_in_or_is_refused(string why, string email, string password, string outcome)
    {
        using var scope = _services.CreateScope();
        var sender = scope.ServiceProvider.GetRequiredService<ISender>();

        var sending = sender.Send(new StaffSignInCommand { Email = email, Password = password }, TestContext.Current.CancellationToken);

        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        if (outcome == Pending)
        {
            await sending;
            var member = _members[Member.NormalizeEmail(email)];
            var challenge = await db.TwoStepChallenges.SingleAsync(TestContext.Current.CancellationToken);
            var (token, expiresAt) = Assert.Single(_cookie.Issued);
            Assert.Equal((member.Id, TwoStepChallenge.HashOf(token)), (challenge.MemberId, challenge.TokenHash));
            Assert.Equal(_time.GetUtcNow().AddMinutes(5), expiresAt);
        }
        else
        {
            var refusal = await Assert.ThrowsAsync<RefusalException>(() => sending);
            var kind = outcome is RefusalCodes.NotStaff or RefusalCodes.TwoStepNotSetUp ? RefusalKind.Forbidden : RefusalKind.Unauthenticated;
            Assert.Equal((outcome, kind), (refusal.Code, refusal.Kind));
            Assert.Empty(_cookie.Issued);
            Assert.Empty(await db.TwoStepChallenges.ToListAsync(TestContext.Current.CancellationToken));
        }

        Assert.Empty(_session.SignedIn);

        Assert.NotNull(why);
    }

    public ValueTask DisposeAsync() => _services.DisposeAsync();

    [Fact]
    public async Task Given_an_earlier_pending_sign_in_When_the_password_is_given_again_Then_only_the_new_challenge_remains()
    {
        using var scope = _services.CreateScope();
        var sender = scope.ServiceProvider.GetRequiredService<ISender>();

        await sender.Send(new StaffSignInCommand { Email = "dana@christianfitness.ca", Password = Password }, TestContext.Current.CancellationToken);
        await sender.Send(new StaffSignInCommand { Email = "dana@christianfitness.ca", Password = Password }, TestContext.Current.CancellationToken);

        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var challenge = await db.TwoStepChallenges.SingleAsync(TestContext.Current.CancellationToken);
        Assert.Equal(TwoStepChallenge.HashOf(_cookie.Issued[^1].Token), challenge.TokenHash);
    }

    // L2-018 AC3 with L2-004 AC3 (ADR 0016): a paused email is refused before the password is
    // checked, the refusal is not counted, and no pending sign-in starts.
    [Fact]
    public async Task Given_5_recent_failures_for_a_staff_email_When_the_right_password_is_given_Then_it_is_refused_with_too_many_attempts_and_not_recorded()
    {
        using var scope = _services.CreateScope();
        var sender = scope.ServiceProvider.GetRequiredService<ISender>();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        for (var i = 0; i < 5; i++)
        {
            db.SignInFailures.Add(SignInFailure.Record("dana@christianfitness.ca", _time.GetUtcNow().AddMinutes(-14)));
        }

        await db.SaveChangesAsync(TestContext.Current.CancellationToken);

        var refusal = await Assert.ThrowsAsync<RefusalException>(() => sender.Send(new StaffSignInCommand { Email = "dana@christianfitness.ca", Password = Password }, TestContext.Current.CancellationToken));

        Assert.Equal((RefusalCodes.TooManyAttempts, RefusalKind.TooManyRequests), (refusal.Code, refusal.Kind));
        Assert.Equal(5, await db.SignInFailures.CountAsync(TestContext.Current.CancellationToken));
        Assert.Empty(_cookie.Issued);
        Assert.Empty(await db.TwoStepChallenges.ToListAsync(TestContext.Current.CancellationToken));
    }

    private sealed class RecordingTwoStepCookie : ITwoStepCookie
    {
        public List<(string Token, DateTimeOffset ExpiresAt)> Issued { get; } = [];

        public void Issue(string token, DateTimeOffset expiresAt) => Issued.Add((token, expiresAt));

        public string? Read() => null;

        public void Clear()
        {
        }
    }

    private sealed class RecordingStaffSessionSignIn : IStaffSessionSignIn
    {
        public List<(Guid, StaffRoleName)> SignedIn { get; } = [];

        public Task SignInAsync(Member member, StaffRoleName role)
        {
            SignedIn.Add((member.Id, role));
            return Task.CompletedTask;
        }

        public Task SignOutAsync() => Task.CompletedTask;
    }
}
