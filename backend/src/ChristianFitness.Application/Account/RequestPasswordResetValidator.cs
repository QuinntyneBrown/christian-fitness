using ChristianFitness.Domain.Members;
using FluentValidation;

namespace ChristianFitness.Application.Account;

/// <summary>
/// A reset request needs an email of the Join shape (L2-044 AC5; ADR 0008): not blank, at most 254
/// characters trimmed, one <c>@</c>, a dot in the domain and no white space. Anything else is
/// refused 400 with <c>validation_failed</c> and the one sentence the form shows; the refusal says
/// nothing about accounts.
/// </summary>
public sealed class RequestPasswordResetValidator : AbstractValidator<RequestPasswordResetCommand>
{
    public RequestPasswordResetValidator()
    {
        RuleFor(c => c.Email)
            .Must(email => email is not null
                && email.Trim().Length <= Member.EmailMaxLength
                && CreateAccountValidator.EmailPattern().IsMatch(email.Trim()))
            .WithMessage(CreateAccountValidator.EmailInvalid);
    }
}
