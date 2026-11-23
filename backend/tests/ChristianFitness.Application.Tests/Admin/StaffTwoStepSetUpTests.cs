using System.Text.RegularExpressions;
using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Admin;
using ChristianFitness.Domain.Members;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Time.Testing;

namespace ChristianFitness.Application.Tests.Admin;

/// <summary>
/// L2-046 AC6 (ADR 0012): <c>cf two-step &lt;email&gt;</c> gives a staff account a new authenticator
/// secret and answers its <c>otpauth://</c> link once; a second run replaces the secret; a member
/// without a staff role or an unknown email gets nothing.
/// </summary>
public sealed partial class StaffTwoStepSetUpTests : IAsyncDisposable
{
    private readonly ServiceProvider _services;
    private readonly FakeTimeProvider _time = new(new DateTimeOffset(2026, 11, 23, 9, 0, 0, TimeSpan.Zero));

    public StaffTwoStepSetUpTests()
    {
        var store = $"two-step-set-up-{Guid.NewGuid():N}";
        _services = new ServiceCollection()
            .AddDbContext<AppDbContext>(options => options.UseInMemoryDatabase(store))
            .AddScoped<IAppDbContext>(provider => provider.GetRequiredService<AppDbContext>())
            .AddSingleton<TimeProvider>(_time)
            .AddScoped<StaffTwoStepSetUp>()
            .BuildServiceProvider();
        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var dana = Member.Join("Dana Reyes", "dana@christianfitness.ca", "hash", _time.GetUtcNow());
        db.Members.Add(dana);
        db.StaffRoles.Add(StaffRole.Grant(dana, StaffRoleName.Admin));
        db.Members.Add(Member.Join("Grace Thompson", "grace.thompson@gmail.com", "hash", _time.GetUtcNow()));
        db.SaveChanges();
    }

    [Fact]
    public async Task Given_a_staff_email_When_two_step_is_set_up_Then_its_otpauth_link_holds_the_stored_secret()
    {
        using var scope = _services.CreateScope();

        var link = await scope.ServiceProvider.GetRequiredService<StaffTwoStepSetUp>().SetUpAsync(" Dana@ChristianFitness.CA ", TestContext.Current.CancellationToken);

        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var twoStep = await db.StaffTwoSteps.SingleAsync(TestContext.Current.CancellationToken);
        Assert.Equal(20, twoStep.Secret.Length);
        Assert.Equal(
            $"otpauth://totp/Christian%20Fitness:dana%40christianfitness.ca?secret={Totp.Base32Of(twoStep.Secret)}&issuer=Christian%20Fitness&algorithm=SHA1&digits=6&period=30",
            link);
        Assert.Matches(SecretPattern(), link);
    }

    [Fact]
    public async Task Given_two_step_already_set_up_When_it_is_set_up_again_Then_the_secret_is_replaced_and_any_step_may_be_used()
    {
        using var scope = _services.CreateScope();
        var setUp = scope.ServiceProvider.GetRequiredService<StaffTwoStepSetUp>();
        await setUp.SetUpAsync("dana@christianfitness.ca", TestContext.Current.CancellationToken);
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var first = (await db.StaffTwoSteps.SingleAsync(TestContext.Current.CancellationToken)).Secret.ToArray();
        var twoStep = await db.StaffTwoSteps.SingleAsync(TestContext.Current.CancellationToken);
        Assert.True(twoStep.TryUse(Totp.CodeAt(first, Totp.StepAt(_time.GetUtcNow())), _time.GetUtcNow()));
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);

        await setUp.SetUpAsync("dana@christianfitness.ca", TestContext.Current.CancellationToken);

        var renewed = await db.StaffTwoSteps.SingleAsync(TestContext.Current.CancellationToken);
        Assert.NotEqual(first, renewed.Secret);
        Assert.Equal(0, renewed.LastUsedStep);
    }

    [Theory]
    [InlineData("a member without a staff role", "grace.thompson@gmail.com")]
    [InlineData("an unknown email", "nobody@christianfitness.ca")]
    public async Task Given_an_email_that_is_not_staff_When_two_step_is_set_up_Then_nothing_is_stored_or_answered(string why, string email)
    {
        using var scope = _services.CreateScope();

        var link = await scope.ServiceProvider.GetRequiredService<StaffTwoStepSetUp>().SetUpAsync(email, TestContext.Current.CancellationToken);

        Assert.Null(link);
        Assert.Empty(await scope.ServiceProvider.GetRequiredService<AppDbContext>().StaffTwoSteps.ToListAsync(TestContext.Current.CancellationToken));
        Assert.NotNull(why);
    }

    public ValueTask DisposeAsync() => _services.DisposeAsync();

    [GeneratedRegex("secret=[A-Z2-7]{32}&")]
    private static partial Regex SecretPattern();
}
