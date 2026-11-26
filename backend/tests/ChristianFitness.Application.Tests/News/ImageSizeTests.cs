using ChristianFitness.Application.Events;

namespace ChristianFitness.Application.Tests.News;

/// <summary>
/// L2-069 AC9 (ADR 0097): an image's size read from its header, one case per row: PNG, the three
/// WebP forms and JPEGs whose frame header follows other segments; a header cut short, a JPEG with
/// no frame and anything else have no size.
/// </summary>
public sealed class ImageSizeTests
{
    private static byte[] Hex(string hex) => Convert.FromHexString(hex.Replace(" ", string.Empty, StringComparison.Ordinal));

    public static TheoryData<string, byte[], int?, int?> Cases() => new()
    {
        { "PNG 1600 by 900", Hex("89504E470D0A1A0A 0000000D 49484452 00000640 00000384 0806000000"), 1600, 900 },
        { "PNG cut short", Hex("89504E470D0A1A0A 0000000D 49484452 0000"), null, null },
        // VP8 (lossy): frame tag, start code 9D 01 2A, then 14-bit width and height, little-endian.
        { "WebP VP8 1920 by 1080", Hex("52494646 00000000 57454250 56503820 00000000 000000 9D012A 8007 3804"), 1920, 1080 },
        // VP8L (lossless): signature 2F, then width - 1 and height - 1 in 14 bits each, little-endian.
        { "WebP VP8L 1600 by 900", Hex("52494646 00000000 57454250 5650384C 00000000 2F 3F C6 E0 00"), 1600, 900 },
        // VP8X (extended): flags and reserved, then width - 1 and height - 1 in 24 bits each.
        { "WebP VP8X 2048 by 1152", Hex("52494646 00000000 57454250 56503858 0A000000 00000000 FF0700 7F0400"), 2048, 1152 },
        // APP0 first, then a baseline frame: length, precision, height, width.
        { "JPEG 1600 by 1067", Hex("FFD8 FFE0 0004 0000 FFC0 0011 08 042B 0640 03"), 1600, 1067 },
        { "JPEG progressive 2000 by 1125", Hex("FFD8 FFC2 0011 08 0465 07D0 03"), 2000, 1125 },
        // DHT (C4) is not a frame, though its marker sits among them.
        { "JPEG with a table before its frame", Hex("FFD8 FFC4 0004 0000 FFC0 0011 08 0384 0640 03"), 1600, 900 },
        { "JPEG with no frame", Hex("FFD8 FFE0 0004 0000 FFD9"), null, null },
        { "GIF", "GIF89a"u8.ToArray(), null, null },
    };

    [Theory]
    [MemberData(nameof(Cases))]
    public void The_size_is_read_from_the_header(string why, byte[] head, int? width, int? height)
    {
        _ = why;
        var size = ImageKeys.SizeOf(head);

        Assert.Equal(width is null ? null : (width.Value, height!.Value), size);
    }
}
