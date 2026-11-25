using ChristianFitness.Application.Abstractions;
using ChristianFitness.Domain.Directory;
using Microsoft.EntityFrameworkCore;

namespace ChristianFitness.Application.Seeding;

/// <summary>What one seeded directory listing says, under its stable id.</summary>
public sealed record SeedListing(
    Guid Id, ListingKind Kind, string Name, string Tagline, string Area, string Description, IReadOnlyList<string> Focus, string? WebsiteUrl, bool IsVerified);

/// <summary>
/// One published directory listing, keyed by its stable id: added when missing, never changed when
/// present, so a second run changes nothing (L2-054 AC10; ADR 0082). It stands in for staff's
/// listing editor until it exists.
/// </summary>
public sealed class DirectoryListingSeed(SeedListing listing, TimeProvider time) : ISeed
{
    public string Key => $"directory listing {listing.Id}";

    public Task<bool> ExistsAsync(IAppDbContext db, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(db);
        return db.DirectoryListings.AnyAsync(l => l.Id == listing.Id, cancellationToken);
    }

    public void Apply(IAppDbContext db)
    {
        ArgumentNullException.ThrowIfNull(db);
        var now = time.GetUtcNow();
        var made = DirectoryListing.CreateDraft(
            listing.Id, listing.Kind, listing.Name, listing.Tagline, listing.Area, listing.Focus, now, listing.Description, listing.WebsiteUrl, listing.IsVerified);
        made.Publish(now);
        db.DirectoryListings.Add(made);
    }

    /// <summary>
    /// The Listed Christian Fitness team listing, which every event is hosted by until an Admin
    /// chooses another (ADR 0067). Always seeded.
    /// </summary>
    public static readonly SeedListing Team = new(
        DirectoryListing.TeamListingId,
        ListingKind.Organization,
        "Christian Fitness",
        "Faith-first fitness community for the GTA",
        "Toronto-wide",
        "We run free community events across Toronto and keep this directory honest: every listing is checked by our team before it goes live.",
        ["Community runs", "Workshops", "Retreats"],
        "https://www.christian.fitness",
        IsVerified: true);

    /// <summary>
    /// The mocks' sample listings, seeded only when <c>Seed__DirectorySamples</c> is <c>true</c>, for a
    /// demonstration or staging system: a production directory never shows invented people (ADR 0082).
    /// </summary>
    public static readonly IReadOnlyList<SeedListing> Samples =
    [
        new(SampleId(1), ListingKind.Organization, "Lakeshore Runners Fellowship", "Beginner-friendly running club with a prayer at every finish", "Etobicoke",
            "A west-end run club started by three neighbours in 2019. Our Couch to 5K program has graduated over 400 runners, most of whom swore they could never run.",
            ["Running", "Beginners", "Race training"], "https://lakeshorerunners.ca", true),
        new(SampleId(2), ListingKind.Organization, "Faith & Footwork", "Women’s basketball nights and youth clinics", "Downtown",
            "Monthly pickup nights for women and summer clinics for girls, founded by Tasha Grant. Every night ends with a short devotion on the court.",
            ["Basketball", "Women", "Youth clinics"], null, true),
        new(SampleId(3), ListingKind.Person, "Rev. James Whitfield", "Pastor, speaker on rest and burnout", "Midtown",
            "Associate pastor at Grace Fellowship. I speak at men’s breakfasts and retreats about Sabbath rest, burnout and caring for the body God gave you.",
            ["Speaking", "Rest", "Men’s health"], null, true),
        new(SampleId(4), ListingKind.Instructor, "Danielle Okafor", "Strength for women returning to fitness", "East York",
            "Nine years coaching women back into strength after kids, injury or a long break. Small-group bootcamps outdoors from April to October.",
            ["Strength", "Bootcamp", "Postpartum"], null, true),
        new(SampleId(5), ListingKind.Instructor, "Tasha Grant", "Basketball skills coach, NCCP certified", "North York",
            "Former U SPORTS guard. Skills and conditioning for girls 10–18 and adult beginners. Faith and footwork, in that order.",
            ["Basketball", "Youth", "Conditioning"], null, true),
        new(SampleId(6), ListingKind.Ambassador, "Michael Chen", "Run leader and Christian Fitness ambassador", "Etobicoke",
            "Eleven marathons, one very slow first 5K. I lead the walk-back prayer at Couch to 5K and help new runners find their pace group.",
            ["Running", "Mentoring"], null, true),
        new(SampleId(7), ListingKind.Ambassador, "Priya Nair", "Hoops regular, youth mentor", "Downtown",
            "I play every month at Faith & Footwork and mentor girls in the summer clinics. Ask me anything about getting back into the game after 30.",
            ["Basketball", "Mentoring"], null, true),
        new(SampleId(8), ListingKind.Company, "Kingdom Fuel Nutrition", "Canadian-made protein and electrolytes", "Mississauga",
            "Family-owned in Mississauga. We supply water and electrolytes at every Christian Fitness run, and give 10% of profit to church food banks.",
            ["Nutrition", "Sponsor"], "https://kingdomfuel.ca", true),
        new(SampleId(9), ListingKind.Company, "Northline Athletic", "Running shoes and gait analysis, Roncesvalles", "Roncesvalles",
            "Independent running store. Free gait analysis for Couch to 5K members and 15% off for anyone in the directory.",
            ["Running gear", "Gait analysis"], "https://northlineathletic.ca", false),
        new(SampleId(10), ListingKind.ChurchMinistry, "Grace Fellowship Move Ministry", "Health and movement ministry of Grace Fellowship", "Scarborough",
            "Gentle movement, walking groups and seasonal health talks for our congregation and neighbours. Seniors and newcomers especially welcome.",
            ["Mobility", "Seniors", "Walking groups"], null, true),
        new(SampleId(11), ListingKind.ChurchMinistry, "St. Paul’s Sports Ministry", "Youth basketball and volleyball leagues", "Midtown",
            "Friday night leagues for kids 8–16 in the church gym, with mentors from the congregation on every bench.",
            ["Youth", "Basketball", "Volleyball"], null, true),
    ];

    /// <summary>The stable id of the <paramref name="n"/>th sample listing, from 1.</summary>
    public static Guid SampleId(int n) => new($"0193a9c0-0000-7000-8000-0000000d{n:x4}");
}
