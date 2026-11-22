using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Admin;
using ChristianFitness.Application.Errors;
using ChristianFitness.Domain.Members;
using ChristianFitness.Infrastructure.Persistence;
using ChristianFitness.Infrastructure.Security;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Application.Tests.Admin;

/// <summary>
/// L2-018 AC1 to AC3: which admin sign-ins open a staff session and which are refused, and with
/// which code, one case per row (ADR 0010).
/// </summary>
public sealed class StaffSignInHandlerTests : IAsyncDisposable
{
    private const string Password = "abundantlife";

    private readonly ServiceProvider _services;
    private readonly RecordingStaffSessionSignIn _session = new();
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
            .BuildServiceProvider();
        var hash = new IdentityPasswordHasher().Hash(Password);
        var joined = new DateTimeOffset(2026, 11, 22, 9, 0, 0, TimeSpan.Zero);
        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        foreach (var (email, role) in new (string, StaffRoleName?)[]
        {
            ("dana@christianfitness.ca", StaffRoleName.Admin),
            ("sam@christianfitness.ca", StaffRoleName.Moderator),
            ("grace.thompson@gmail.com", null),
        })
        {
            var member = Member.Join("Dana Reyes", email, hash, joined);
            _members[email] = member;
            db.Members.Add(member);
            if (role is { } name)
            {
                db.StaffRoles.Add(StaffRole.Grant(member, name));
            }
        }

        db.SaveChanges();
    }

    public static TheoryData<string, string, string, string> Cases() => new()
    {
        // why, email, password, outcome: the role signed in with, or the refusal's code
        { "an Admin", "dana@christianfitness.ca", Password, "Admin" },
        { "a Moderator", "sam@christianfitness.ca", Password, "Moderator" },
        { "an Admin's email in another case", "Dana@ChristianFitness.CA", Password, "Admin" },
        { "a member without a staff role", "grace.thompson@gmail.com", Password, RefusalCodes.NotStaff },
        { "a member without a staff role and a wrong password", "grace.thompson@gmail.com", "abundantlifE", RefusalCodes.InvalidCredentials },
        { "an Admin with a wrong password", "dana@christianfitness.ca", "abundantlifE", RefusalCodes.InvalidCredentials },
        { "an unknown email", "nobody@christianfitness.ca", Password, RefusalCodes.InvalidCredentials },
        { "a blank email", "", Password, RefusalCodes.InvalidCredentials },
        { "a blank password", "dana@christianfitness.ca", "", RefusalCodes.InvalidCredentials },
    };

    [Theory]
    [MemberData(nameof(Cases))]
    public async Task Given_an_admin_sign_in_When_it_is_handled_Then_it_opens_a_staff_session_or_is_refused(string why, string email, string password, string outcome)
    {
        using var scope = _services.CreateScope();
        var sender = scope.ServiceProvider.GetRequiredService<ISender>();

        var sending = sender.Send(new StaffSignInCommand { Email = email, Password = password }, TestContext.Current.CancellationToken);

        if (outcome is "Admin" or "Moderator")
        {
            var session = await sending;
            var member = _members[Member.NormalizeEmail(email)];
            Assert.Equal((member.Id, "Dana Reyes", outcome), (session.MemberId, session.Name, session.Role));
            Assert.Equal([(member.Id, Enum.Parse<StaffRoleName>(outcome))], _session.SignedIn);
        }
        else
        {
            var refusal = await Assert.ThrowsAsync<RefusalException>(() => sending);
            var kind = outcome == RefusalCodes.NotStaff ? RefusalKind.Forbidden : RefusalKind.Unauthenticated;
            Assert.Equal((outcome, kind), (refusal.Code, refusal.Kind));
            Assert.Empty(_session.SignedIn);
        }

        Assert.NotNull(why);
    }

    public ValueTask DisposeAsync() => _services.DisposeAsync();

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
