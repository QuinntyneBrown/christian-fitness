using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Errors;
using ChristianFitness.Application.Sessions;
using ChristianFitness.Domain.Members;
using ChristianFitness.Infrastructure.Persistence;
using ChristianFitness.Infrastructure.Security;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Application.Tests.Sessions;

/// <summary>
/// L2-004 AC1 and AC2: which sign-ins open a session and which are refused with
/// <c>invalid_credentials</c>, one case per row (ADR 0009).
/// </summary>
public sealed class SignInHandlerTests : IAsyncDisposable
{
    private const string Email = "Grace.Thompson@Gmail.com";
    private const string Password = "abundantlife";

    private readonly ServiceProvider _services;
    private readonly RecordingSessionSignIn _session = new();
    private readonly Member _grace;

    public SignInHandlerTests()
    {
        var store = $"sign-in-{Guid.NewGuid():N}";
        _services = new ServiceCollection()
            .AddApplication()
            .AddDbContext<AppDbContext>(options => options.UseInMemoryDatabase(store))
            .AddScoped<IAppDbContext>(provider => provider.GetRequiredService<AppDbContext>())
            .AddSingleton<IPasswordHasherService, IdentityPasswordHasher>()
            .AddSingleton<ISessionSignIn>(_session)
            .BuildServiceProvider();
        _grace = Member.Join("Grace Thompson", Email, new IdentityPasswordHasher().Hash(Password), new DateTimeOffset(2026, 11, 22, 9, 0, 0, TimeSpan.Zero));
        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Members.Add(_grace);
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
        using var scope = _services.CreateScope();
        var sender = scope.ServiceProvider.GetRequiredService<ISender>();

        var sending = sender.Send(new SignInCommand { Email = email, Password = password }, TestContext.Current.CancellationToken);

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

    public ValueTask DisposeAsync() => _services.DisposeAsync();

    private sealed class RecordingSessionSignIn : ISessionSignIn
    {
        public List<Guid> SignedIn { get; } = [];

        public Task SignInAsync(Member member)
        {
            SignedIn.Add(member.Id);
            return Task.CompletedTask;
        }
    }
}
