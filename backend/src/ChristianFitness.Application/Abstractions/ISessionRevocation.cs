namespace ChristianFitness.Application.Abstractions;

/// <summary>Ends sessions on the server (ADR 0009), such as when a password is reset (L2-045 AC3; ADR 0012).</summary>
public interface ISessionRevocation
{
    /// <summary>
    /// Ends every session of the member <paramref name="memberId"/> as part of the request's unit of
    /// work: the sessions go when the handler saves its other changes, and stay if it does not.
    /// </summary>
    Task EndAllAsync(Guid memberId, CancellationToken cancellationToken);
}
