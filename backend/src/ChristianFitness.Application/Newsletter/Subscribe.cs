using ChristianFitness.Application.Abstractions;
using ChristianFitness.Application.Account;
using ChristianFitness.Application.Directory;
using ChristianFitness.Application.Email;
using ChristianFitness.Application.Errors;
using ChristianFitness.Domain.Newsletter;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Newsletter;

/// <summary>
/// A request to subscribe <see cref="Email"/> to The Abundant Weekly (L2-057). A class, not a
/// record: a record's generated <c>ToString</c> would print the address if it were ever logged
/// (L2-033 AC2).
/// </summary>
public sealed class SubscribeCommand : IRequest
{
    public string Email { get; init; } = string.Empty;
}

/// <summary>
/// An address of the Join shape (ADR 0008): not blank, at most 254 characters trimmed, one <c>@</c>,
/// a dot in the domain and no white space. Anything else is refused 400 <c>validation_failed</c> with
/// <c>fieldCodes.email</c> = <c>email_invalid</c> (L2-057 AC3).
/// </summary>
public sealed class SubscribeValidator : AbstractValidator<SubscribeCommand>
{
    public SubscribeValidator()
    {
        RuleFor(c => c.Email)
            .Must(email => email is not null
                && email.Trim().Length <= NewsletterSubscription.EmailMaxLength
                && CreateAccountValidator.EmailPattern().IsMatch(email.Trim()))
            .WithErrorCode(SuggestListingRules.EmailInvalid)
            .WithMessage("That email doesn't look right. Check for a typo and try again.");
    }
}

/// <summary>
/// At most <see cref="Limit"/> subscriptions from one network in a sliding hour, whatever addresses
/// they name (L2-057 AC7; ADR 0110). Every submission counts and none is given back, so a refusal
/// depends only on the network and reveals nothing about addresses.
/// </summary>
public sealed class SubscriptionLimiter(TimeProvider time) : AddressRateLimiter(time, Limit, Window)
{
    public const int Limit = 5;

    public static readonly TimeSpan Window = TimeSpan.FromHours(1);
}

/// <summary>
/// Subscribes an address with double opt-in (L2-057 AC4, AC5; L2-058 AC1; ADR 0110). A new, Pending
/// or Unsubscribed address becomes Pending and is sent a confirmation email; a Subscribed address
/// is left as it is. The caller learns nothing either way: the API answers 202 with no body, and the
/// email is queued, so the answer takes as long whether or not one was sent (ADR 0010).
/// </summary>
internal sealed class SubscribeHandler(
    IAppDbContext db,
    IEmailSender email,
    NewsletterEmails emails,
    TimeProvider time,
    SubscriptionLimiter limiter,
    IClientAddress clientAddress)
    : IRequestHandler<SubscribeCommand>
{
    public async Task Handle(SubscribeCommand request, CancellationToken cancellationToken)
    {
        // Every submission counts and none is given back (L2-057 AC7).
        _ = limiter.TryAcquire(clientAddress.PartitionKey)
            ?? throw new RefusalException(RefusalCodes.TooManyAttempts, RefusalKind.TooManyRequests);
        var now = time.GetUtcNow();
        var address = NewsletterSubscription.Normalize(request.Email ?? string.Empty);
        var subscription = await db.NewsletterSubscriptions
            .SingleOrDefaultAsync(s => s.Email == address, cancellationToken)
            .ConfigureAwait(false);
        if (subscription is null)
        {
            subscription = NewsletterSubscription.Request(address, now);
            db.NewsletterSubscriptions.Add(subscription);
        }
        else if (!subscription.RequestAgain(now))
        {
            return;
        }

        var (confirmation, token) = SubscriptionConfirmation.Issue(subscription.Id, now);
        db.SubscriptionConfirmations.Add(confirmation);
        var message = emails.Confirmation(subscription, token, now);
        try
        {
            await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        }
        catch (DbUpdateException)
        {
            // Another submission of the same new address saved first and sent its confirmation:
            // this one is answered the same, and sends nothing more.
            return;
        }

        await email.SendAsync(message, cancellationToken).ConfigureAwait(false);
    }
}
