using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianFitness.Api.Tests.Admin;

/// <summary>
/// The API with a probe endpoint in each staff area that has no endpoint of its own yet: the
/// Dashboard (slice 28.1), Members (26.1), Services (21.1) and a segment no area
/// names. The probes go through the same staff area convention, policies and refusals as a real
/// admin endpoint, so a test can ask each area as each role (L2-019; ADR 0020). Only this
/// fixture's host has them.
/// </summary>
public sealed class StaffRolesApiFactory : ApiFactory
{
    protected override void ConfigureServices(IServiceCollection services) =>
        services.AddControllers().AddApplicationPart(typeof(StaffRolesApiFactory).Assembly);
}

/// <summary>A probe per area: it answers 204 to whoever its area's policy lets in, and does nothing else.</summary>
[ApiController]
[Route("api/admin/dashboard/probe")]
public sealed class DashboardProbeController : ControllerBase
{
    [HttpGet]
    public IActionResult Get() => NoContent();
}

/// <inheritdoc cref="DashboardProbeController"/>
[ApiController]
[Route("api/admin/members/probe")]
public sealed class MembersProbeController : ControllerBase
{
    [HttpGet]
    public IActionResult Get() => NoContent();
}

/// <inheritdoc cref="DashboardProbeController"/>
[ApiController]
[Route("api/admin/services/probe")]
public sealed class ServicesProbeController : ControllerBase
{
    [HttpGet]
    public IActionResult Get() => NoContent();
}

/// <inheritdoc cref="DashboardProbeController"/>
[ApiController]
[Route("api/admin/reports/probe")]
public sealed class UnlistedProbeController : ControllerBase
{
    [HttpGet]
    public IActionResult Get() => NoContent();
}
