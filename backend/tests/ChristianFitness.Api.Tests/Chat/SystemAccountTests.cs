using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianFitness.Api.Tests.Account;
using ChristianFitness.Api.Tests.Admin;
using ChristianFitness.Api.Tests.Events;
using ChristianFitness.Api.Tests.Profiles;
using ChristianFitness.Application.Seeding;
using ChristianFitness.Domain.Members;
using ChristianFitness.Infrastructure.Persistence;
using Microsoft.AspNetCore.Http.Connections;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Chat;

/// <summary>A hub answer with the system account's flag (ADR 0065, ADR 0090).</summary>
public sealed record SystemChatAnswerBody(string? Code, string? Title, Guid? MemberId, bool? System);

/// <summary>Seeds the Christian Fitness system account into a fixture's store, as <c>cf seed</c> does.</summary>
public static class SystemAccount
{
    public static async Task SeedAsync(RegisterForEventFactory factory)
    {
        ArgumentNullException.ThrowIfNull(factory);
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await new SeedRunner([new SystemAccountSeed(factory.Time)], db).RunAsync(TestContext.Current.CancellationToken);
    }
}

/// <summary>
/// L2-014 AC8 (ADR 0065, ADR 0090): the seeded Christian Fitness account cannot sign in or be sent a
/// password reset, is in no member list and has no profile; a member may open its conversation, which
/// answers <c>system: true</c>, and a send to it is refused <c>system_account</c>.
/// </summary>
public sealed class SystemAccountTests(RegisterForEventFactory factory) : IClassFixture<RegisterForEventFactory>
{
    private static readonly Guid System = SystemMembers.ChristianFitnessId;

    private async Task<(string Cookie, HubConnection Hub)> MemberAsync(string email)
    {
        await SystemAccount.SeedAsync(factory);
        using var client = Browser.CreateClient(factory);
        var cookie = await OwnProfileTests.JoinedAsync(client, JoinTests.Details(email));
        var hub = new HubConnectionBuilder()
            .WithUrl(new Uri("https://localhost/api/chat"), options =>
            {
                options.Transports = HttpTransportType.LongPolling;
                options.HttpMessageHandlerFactory = _ => factory.Server.CreateHandler();
                options.Headers["Cookie"] = cookie;
            })
            .Build();
        await hub.StartAsync(TestContext.Current.CancellationToken);
        return (cookie, hub);
    }

    [Fact]
    public async Task Given_the_system_account_When_a_member_opens_its_conversation_Then_it_is_named_and_marked_as_the_system()
    {
        var (_, hub) = await MemberAsync("grace.system1@example.org");
        await using var _hub = hub;

        var answer = await hub.InvokeAsync<SystemChatAnswerBody>("JoinDirect", System, TestContext.Current.CancellationToken);

        Assert.Null(answer.Code);
        Assert.Equal(("Christian Fitness", true), (answer.Title, answer.System));
    }

    [Fact]
    public async Task Given_another_member_When_a_member_opens_their_conversation_Then_it_is_not_marked_as_the_system()
    {
        var (_, hub) = await MemberAsync("grace.system2@example.org");
        await using var _hub = hub;
        using var other = Browser.CreateClient(factory);
        await OwnProfileTests.JoinedAsync(other, JoinTests.Details("hope.system2@example.org") with { FullName = "Hope Adeyemi" });
        var hopeId = await InDbAsync(db => db.Members.Where(m => m.NormalizedEmail == "hope.system2@example.org").Select(m => m.Id).SingleAsync(TestContext.Current.CancellationToken));

        var answer = await hub.InvokeAsync<SystemChatAnswerBody>("JoinDirect", hopeId, TestContext.Current.CancellationToken);

        Assert.Equal(("Hope Adeyemi", (bool?)null), (answer.Title, answer.System));
    }

    [Fact]
    public async Task Given_the_system_account_When_a_member_sends_it_a_message_Then_it_is_refused_and_nothing_is_stored()
    {
        var (_, hub) = await MemberAsync("grace.system3@example.org");
        await using var _hub = hub;

        var answer = await hub.InvokeAsync<SystemChatAnswerBody>("SendDirect", System, "Thanks!", TestContext.Current.CancellationToken);

        Assert.Equal("system_account", answer.Code);
        Assert.False(await InDbAsync(db => db.DirectMessages.AnyAsync(m => m.RecipientId == System, TestContext.Current.CancellationToken)));
    }

    [Fact]
    public async Task Given_the_system_account_When_a_member_reads_its_history_Then_it_answers()
    {
        var (cookie, hub) = await MemberAsync("grace.system4@example.org");
        await using var _hub = hub;
        using var client = Browser.CreateClient(factory);

        using var response = await Browser.SendAsync(client, HttpMethod.Get, $"/api/messages/{System}/messages", cookie);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Given_the_system_account_When_anyone_signs_in_with_its_email_Then_it_is_refused_as_an_unknown_account()
    {
        await SystemAccount.SeedAsync(factory);
        using var client = Browser.CreateClient(factory);

        using var member = await Browser.SignInAsync(client, SystemMembers.ChristianFitnessEmail, "x");
        using var staff = await Staff.SignInAsync(client, SystemMembers.ChristianFitnessEmail, "x");

        Assert.Equal(HttpStatusCode.Unauthorized, member.StatusCode);
        Assert.Equal("invalid_credentials", (await member.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken)).GetProperty("code").GetString());
        Assert.Equal(HttpStatusCode.Unauthorized, staff.StatusCode);
    }

    [Fact]
    public async Task Given_the_system_account_When_a_reset_is_asked_for_its_email_Then_it_is_answered_as_for_anyone_and_no_mail_goes()
    {
        await SystemAccount.SeedAsync(factory);
        using var client = Browser.CreateClient(factory);

        using var response = await client.PostAsJsonAsync(new Uri("/api/account/password-reset", UriKind.Relative), new { email = SystemMembers.ChristianFitnessEmail }, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        Assert.DoesNotContain(factory.Emails.Sent(), m => m.To == SystemMembers.ChristianFitnessEmail);
        Assert.False(await InDbAsync(db => db.PasswordResets.AnyAsync(r => r.MemberId == System, TestContext.Current.CancellationToken)));
    }

    [Fact]
    public async Task Given_the_system_account_When_a_member_opens_its_profile_Then_it_is_not_found()
    {
        var (cookie, hub) = await MemberAsync("grace.system5@example.org");
        await using var _hub = hub;
        using var client = Browser.CreateClient(factory);

        using var response = await Browser.SendAsync(client, HttpMethod.Get, $"/api/members/{System}/profile", cookie);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Given_the_system_account_When_staff_list_or_search_members_Then_it_is_not_listed_or_counted()
    {
        await SystemAccount.SeedAsync(factory);
        using var client = Browser.CreateClient(factory);
        await Staff.CreateAsync(factory, client, "dana.system6@example.org", StaffRoleName.Admin);
        using var signedIn = await Staff.SignInWithCodeAsync(client, "dana.system6@example.org", factory.Time.GetUtcNow());
        var cookie = Staff.Cookie(signedIn);
        var people = await InDbAsync(db => db.Members.CountAsync(m => m.Id != System, TestContext.Current.CancellationToken));

        using var all = await Browser.SendAsync(client, HttpMethod.Get, "/api/admin/members", cookie);
        using var search = await Browser.SendAsync(client, HttpMethod.Get, "/api/admin/members?q=christian", cookie);

        var list = await all.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal(people, list.GetProperty("total").GetInt32());
        Assert.DoesNotContain(System.ToString(), list.GetProperty("members").EnumerateArray().Select(m => m.GetProperty("id").GetString()));
        var found = await search.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal(0, found.GetProperty("matches").GetInt32());
    }

    private async Task<T> InDbAsync<T>(Func<AppDbContext, Task<T>> read)
    {
        using var scope = factory.Services.CreateScope();
        return await read(scope.ServiceProvider.GetRequiredService<AppDbContext>());
    }
}
