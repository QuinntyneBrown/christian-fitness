using ChristianFitness.Application.Abstractions;
using MediatR;

namespace ChristianFitness.Application.Sessions;

/// <summary>Signing out: the request's session ends on the server (L2-004 AC5; ADR 0009).</summary>
public sealed record SignOutCommand : IRequest;

internal sealed class SignOutHandler(ISessionSignIn session) : IRequestHandler<SignOutCommand>
{
    public Task Handle(SignOutCommand request, CancellationToken cancellationToken) => session.SignOutAsync();
}
