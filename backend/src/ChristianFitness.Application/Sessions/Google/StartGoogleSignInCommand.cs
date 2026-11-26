using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Account;
using ChristianFitness.Application.Errors;
using FluentValidation;
using MediatR;

namespace ChristianFitness.Application.Sessions.Google;

/// <summary>
/// Starts a Google sign-in (L2-049 AC1). <see cref="App"/> is the controller's; the rest is the
/// screen's: what it is for, the member route to return to and whether to show Google's account
/// chooser ("Use another account", L2-049 AC13).
/// </summary>
public sealed class StartGoogleSignInCommand : IRequest<GoogleRedirectDto>
{
    public GoogleApp App { get; init; }

    public string? Intent { get; init; }

    public string? ReturnUrl { get; init; }

    public bool SelectAccount { get; init; }
}

/// <summary>
/// A start names what it is for: Sign in or Join in the member app, Sign in alone for staff, who
/// have no return address (ADR 0099). Anything else is refused 400 <c>validation_failed</c>.
/// </summary>
public sealed class StartGoogleSignInValidator : AbstractValidator<StartGoogleSignInCommand>
{
    public StartGoogleSignInValidator()
    {
        RuleFor(c => c.Intent)
            .Must((command, intent) => intent == GoogleIntents.SignIn || (intent == GoogleIntents.Join && command.App == GoogleApp.Member))
            .WithMessage("Choose how to use Google.");
        RuleFor(c => c.ReturnUrl)
            .Null()
            .When(c => c.App == GoogleApp.Staff)
            .WithMessage("Staff sign-in has no return address.");
    }
}

/// <summary>
/// At most <see cref="Limit"/> Google sign-ins started from one network in a sliding
/// <see cref="Window"/>, in both apps alike (L2-049 AC7). Every start counts, so the limit says
/// nothing about accounts.
/// </summary>
public sealed class GoogleSignInLimiter(TimeProvider time) : AddressRateLimiter(time, Limit, Window)
{
    public const int Limit = 20;

    public static readonly TimeSpan Window = TimeSpan.FromMinutes(15);
}

/// <summary>
/// Starts a Google sign-in (L2-049 AC1, AC6, AC7, AC11, AC13; ADR 0099). In order:
/// <list type="number">
/// <item>the 21st start from one network in 15 minutes is refused <c>too_many_attempts</c>, 429;</item>
/// <item>with no Google client set, the start is refused <c>google_unavailable</c>, 503, and nothing
/// leaves for Google;</item>
/// <item>a return address that is not a member route is dropped (<see cref="MemberReturnPath"/>);</item>
/// <item>the app's OpenID Connect scheme answers Google's authorization address.</item>
/// </list>
/// </summary>
internal sealed class StartGoogleSignInHandler(GoogleSignInLimiter limiter, IClientAddress clientAddress, IGoogleChallenge challenge)
    : IRequestHandler<StartGoogleSignInCommand, GoogleRedirectDto>
{
    public async Task<GoogleRedirectDto> Handle(StartGoogleSignInCommand request, CancellationToken cancellationToken)
    {
        if (limiter.TryAcquire(clientAddress.PartitionKey) is null)
        {
            throw new RefusalException(RefusalCodes.TooManyAttempts, RefusalKind.TooManyRequests);
        }

        if (!challenge.IsConfigured(request.App))
        {
            throw new RefusalException(RefusalCodes.GoogleUnavailable, RefusalKind.Unavailable);
        }

        var returnPath = request.App == GoogleApp.Member && request.Intent == GoogleIntents.SignIn
            ? MemberReturnPath.Of(request.ReturnUrl)
            : null;
        var attempt = new GoogleAttempt(request.App, request.Intent ?? GoogleIntents.SignIn, returnPath, request.SelectAccount);
        return new GoogleRedirectDto(await challenge.BeginAsync(attempt, cancellationToken).ConfigureAwait(false));
    }
}
