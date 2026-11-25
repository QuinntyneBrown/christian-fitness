namespace ChristianFitness.Api.Tests.DirectoryListings;

/// <summary>The directory's test classes share one store and clock and run one after another, since each empties the directory first.</summary>
[CollectionDefinition(Name)]
public sealed class DirectoryFixture : ICollectionFixture<DirectoryFactory>
{
    public const string Name = "Directory";
}
