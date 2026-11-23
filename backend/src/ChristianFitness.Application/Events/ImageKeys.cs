using System.Text.RegularExpressions;

namespace ChristianFitness.Application.Events;

/// <summary>
/// What an image is, by its first bytes, never by its name or the type the client claims (L2-022
/// AC4; ADR 0025), and the keys that name stored images.
/// </summary>
public static partial class ImageKeys
{
    /// <summary>The largest image, in bytes (5 MB).</summary>
    public const int MaxBytes = 5 * 1024 * 1024;

    /// <summary>The extension and content type of the image whose first bytes are given, or none.</summary>
    public static (string Extension, string ContentType)? Detect(ReadOnlySpan<byte> head)
    {
        if (head.Length >= 3 && head[0] == 0xFF && head[1] == 0xD8 && head[2] == 0xFF)
        {
            return ("jpg", "image/jpeg");
        }

        ReadOnlySpan<byte> png = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
        if (head.Length >= png.Length && head[..png.Length].SequenceEqual(png))
        {
            return ("png", "image/png");
        }

        // WebP is a RIFF file: "RIFF", four size bytes, then "WEBP".
        if (head.Length >= 12 && head[..4].SequenceEqual("RIFF"u8) && head[8..12].SequenceEqual("WEBP"u8))
        {
            return ("webp", "image/webp");
        }

        return null;
    }

    /// <summary>A new key: 32 lower-case hex digits and the extension.</summary>
    public static string NewKey(string extension) => string.Create(System.Globalization.CultureInfo.InvariantCulture, $"{Guid.NewGuid():N}.{extension}");

    /// <summary>Whether the text is a key this API could have made.</summary>
    public static bool IsKey(string? key) => key is not null && KeyPattern().IsMatch(key);

    /// <summary>The content type a key's extension names; the key must satisfy <see cref="IsKey"/>.</summary>
    public static string ContentTypeOf(string key) => key[^4..] switch
    {
        ".jpg" => "image/jpeg",
        ".png" => "image/png",
        _ => "image/webp",
    };

    [GeneratedRegex("^[0-9a-f]{32}\\.(jpg|png|webp)$", RegexOptions.CultureInvariant)]
    private static partial Regex KeyPattern();
}
