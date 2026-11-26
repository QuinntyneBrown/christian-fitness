using ChristianFitness.Application.Errors;
using ChristianFitness.Application.Sessions.Google;
using MediatR;

namespace ChristianFitness.Application.Account.Google;

/// <summary>The Google account "Finish your profile" shows: its email and its name (L2-003 AC8).</summary>
public sealed class GoogleAccountDto(string email, string? name)
{
    public string Email { get; } = email;

    public string? Name { get; } = name;
}

/// <summary>The Google account the callback kept for joining (<c>GET /api/account/google</c>).</summary>
public sealed class GetPendingGoogleAccountQuery : IRequest<GoogleAccountDto>;

/// <summary>"Change": forgets the Google account at once (<c>DELETE /api/account/google</c>, L2-049 AC12).</summary>
public sealed class ForgetGoogleAccountCommand : IRequest;

/// <summary>Reads the kept, verified Google account for joining, or refuses as L2-049 AC3 and AC11 say.</summary>
internal static class PendingGoogleAccount
{
    public static async Task<GoogleIdentity> ReadAsync(IGoogleIdentityReader identities)
    {
        var identity = await identities.ReadAsync(GoogleApp.Member).ConfigureAwait(false)
            ?? throw new RefusalException(RefusalCodes.GoogleEmailUnverified, RefusalKind.Unauthenticated);
        if (!identity.EmailVerified)
        {
            await identities.ForgetAsync().ConfigureAwait(false);
            throw new RefusalException(RefusalCodes.GoogleEmailUnverified, RefusalKind.Unauthenticated);
        }

        return identity;
    }
}

internal sealed class GetPendingGoogleAccountHandler(IGoogleIdentityReader identities)
    : IRequestHandler<GetPendingGoogleAccountQuery, GoogleAccountDto>
{
    public async Task<GoogleAccountDto> Handle(GetPendingGoogleAccountQuery request, CancellationToken cancellationToken)
    {
        var identity = await PendingGoogleAccount.ReadAsync(identities).ConfigureAwait(false);
        return new GoogleAccountDto(identity.Email, identity.Name);
    }
}

internal sealed class ForgetGoogleAccountHandler(IGoogleIdentityReader identities)
    : IRequestHandler<ForgetGoogleAccountCommand>
{
    public Task Handle(ForgetGoogleAccountCommand request, CancellationToken cancellationToken) => identities.ForgetAsync();
}
