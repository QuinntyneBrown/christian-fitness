using ChristianFitness.Application.Events;
using ChristianFitness.Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using ChristianFitness.Application.Abstractions;

namespace ChristianFitness.Api.Tests.Events;

/// <summary>
/// ADR 0025: the real image store keeps an image as a file named by its key in the directory the
/// setting names, reads it back with the type its key names, and lets no string that is not a key
/// near a path.
/// </summary>
public sealed class FileSystemImageStoreTests : IDisposable
{
    private readonly string _directory = Path.Combine(Path.GetTempPath(), $"cf-images-{Guid.NewGuid():N}");

    private IImageStore Store()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["Images:Directory"] = _directory, ["ConnectionStrings:Default"] = "Host=unused.invalid" })
            .Build();
        var services = new ServiceCollection();
        services.AddSingleton<IConfiguration>(configuration);
        services.AddInfrastructure(configuration);
        services.RemoveAll<Microsoft.EntityFrameworkCore.DbContextOptions<ChristianFitness.Infrastructure.Persistence.AppDbContext>>();
        return services.BuildServiceProvider().GetRequiredService<IImageStore>();
    }

    [Fact]
    public async Task Given_a_saved_image_When_it_is_opened_by_its_key_Then_its_bytes_and_type_come_back_from_the_configured_directory()
    {
        var store = Store();
        var key = ImageKeys.NewKey("png");
        byte[] bytes = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x01];

        await store.SaveAsync(key, bytes, TestContext.Current.CancellationToken);

        Assert.True(await store.ExistsAsync(key, TestContext.Current.CancellationToken));
        Assert.True(File.Exists(Path.Combine(_directory, key)));
        var opened = (await store.OpenAsync(key, TestContext.Current.CancellationToken))!;
        await using var content = opened.Content;
        using var copy = new MemoryStream();
        await content.CopyToAsync(copy, TestContext.Current.CancellationToken);
        Assert.Equal(bytes, copy.ToArray());
        Assert.Equal("image/png", opened.ContentType);
    }

    [Theory]
    [InlineData("../secret.png")]
    [InlineData("..\\secret.png")]
    [InlineData("0123456789abcdef0123456789abcdef.png/../../x")]
    [InlineData("0123456789abcdef0123456789abcdef.gif")]
    [InlineData("0123456789ABCDEF0123456789ABCDEF.png")]
    [InlineData("")]
    public async Task Given_text_that_is_not_a_key_When_it_is_asked_for_Then_nothing_exists_and_nothing_is_saved(string notAKey)
    {
        var store = Store();

        Assert.False(await store.ExistsAsync(notAKey, TestContext.Current.CancellationToken));
        Assert.Null(await store.OpenAsync(notAKey, TestContext.Current.CancellationToken));
        await Assert.ThrowsAsync<ArgumentException>(() => store.SaveAsync(notAKey, new byte[] { 1 }, TestContext.Current.CancellationToken));
    }

    public void Dispose()
    {
        if (Directory.Exists(_directory))
        {
            Directory.Delete(_directory, recursive: true);
        }
    }
}
