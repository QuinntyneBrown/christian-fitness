namespace ChristianFitness.Infrastructure.Health;

/// <summary>Tags that group health checks into endpoints.</summary>
public static class HealthTags
{
    /// <summary>The checks that make the API ready to serve: <c>/health</c> and <c>/health/ready</c>.</summary>
    public const string Ready = "ready";
}
