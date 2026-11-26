using System.Buffers.Binary;
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

    /// <summary>The width and height a JPEG, PNG or WebP header names, in pixels, or none when it cannot be read (L2-069 AC9).</summary>
    public static (int Width, int Height)? SizeOf(ReadOnlySpan<byte> head) => Detect(head)?.Extension switch
    {
        "png" => head.Length >= 24 ? (BinaryPrimitives.ReadInt32BigEndian(head[16..]), BinaryPrimitives.ReadInt32BigEndian(head[20..])) : null,
        "webp" => WebPSizeOf(head),
        "jpg" => JpegSizeOf(head),
        _ => null,
    };

    private static (int Width, int Height)? WebPSizeOf(ReadOnlySpan<byte> head)
    {
        if (head.Length < 25)
        {
            return null;
        }

        var chunk = head[12..16];
        if (chunk.SequenceEqual("VP8 "u8) && head.Length >= 30)
        {
            return (BinaryPrimitives.ReadUInt16LittleEndian(head[26..]) & 0x3FFF, BinaryPrimitives.ReadUInt16LittleEndian(head[28..]) & 0x3FFF);
        }

        if (chunk.SequenceEqual("VP8L"u8))
        {
            var bits = BinaryPrimitives.ReadUInt32LittleEndian(head[21..]);
            return ((int)(bits & 0x3FFF) + 1, (int)((bits >> 14) & 0x3FFF) + 1);
        }

        if (chunk.SequenceEqual("VP8X"u8) && head.Length >= 30)
        {
            return ((head[24] | (head[25] << 8) | (head[26] << 16)) + 1, (head[27] | (head[28] << 8) | (head[29] << 16)) + 1);
        }

        return null;
    }

    /// <summary>Walks a JPEG's segments to its first frame header (SOF0–SOF15 but DHT, JPG and DAC).</summary>
    private static (int Width, int Height)? JpegSizeOf(ReadOnlySpan<byte> head)
    {
        var at = 2;
        while (at + 4 <= head.Length)
        {
            if (head[at] != 0xFF)
            {
                return null;
            }

            var marker = head[at + 1];
            if (marker == 0xFF)
            {
                at++;
                continue;
            }

            if (marker is 0xD8 or 0x01 or (>= 0xD0 and <= 0xD7))
            {
                at += 2;
                continue;
            }

            if (marker is 0xD9 or 0xDA)
            {
                return null;
            }

            var length = BinaryPrimitives.ReadUInt16BigEndian(head[(at + 2)..]);
            if (marker is >= 0xC0 and <= 0xCF and not 0xC4 and not 0xC8 and not 0xCC)
            {
                return at + 9 <= head.Length
                    ? (BinaryPrimitives.ReadUInt16BigEndian(head[(at + 7)..]), BinaryPrimitives.ReadUInt16BigEndian(head[(at + 5)..]))
                    : null;
            }

            at += 2 + length;
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
