using System.Text;
using ChristianFitness.Domain.Members;

namespace ChristianFitness.Application.Tests.Members;

/// <summary>
/// L2-046 AC2 and AC3 (ADR 0013): the authenticator code of RFC 6238 (HMAC-SHA1, 30-second steps,
/// 6 digits), which codes are accepted at a given moment, and the secret's base32 form for the
/// <c>otpauth://</c> link, one case per row.
/// </summary>
public sealed class TotpTests
{
    /// <summary>The secret of RFC 6238's test vectors (appendix B): "12345678901234567890" in ASCII.</summary>
    private static readonly byte[] RfcSecret = Encoding.ASCII.GetBytes("12345678901234567890");

    public static TheoryData<long, string> RfcVectors() => new()
    {
        // Unix time, the last 6 digits of the RFC's 8-digit SHA-1 code
        { 59, "287082" },
        { 1111111109, "081804" },
        { 1111111111, "050471" },
        { 1234567890, "005924" },
        { 2000000000, "279037" },
        { 20000000000, "353130" },
    };

    [Theory]
    [MemberData(nameof(RfcVectors))]
    public void Given_the_RFC_6238_secret_When_the_code_at_a_time_is_computed_Then_it_is_the_RFC_s_code(long unixTime, string expected)
    {
        var step = Totp.StepAt(DateTimeOffset.FromUnixTimeSeconds(unixTime));

        Assert.Equal(expected, Totp.CodeAt(RfcSecret, step));
    }

    /// <summary>Now is Unix time 1111111111 (step 37037037), whose code is 050471.</summary>
    private static readonly DateTimeOffset Now = DateTimeOffset.FromUnixTimeSeconds(1111111111);

    private const long NowStep = 37037037;

    public static TheoryData<string, string?, long, long?> MatchCases() => new()
    {
        // why, code typed, last step used, the step it matches (null: refused)
        { "the current step's code", Totp.CodeAt(RfcSecret, NowStep), 0, NowStep },
        { "the step before, for a slow phone", Totp.CodeAt(RfcSecret, NowStep - 1), 0, NowStep - 1 },
        { "the step after, for a fast phone", Totp.CodeAt(RfcSecret, NowStep + 1), 0, NowStep + 1 },
        { "two steps old", Totp.CodeAt(RfcSecret, NowStep - 2), 0, null },
        { "two steps ahead", Totp.CodeAt(RfcSecret, NowStep + 2), 0, null },
        { "spaces inside and around, as the mock shows it", " 050 471 ", 0, NowStep },
        { "the step that already opened a session", "050471", NowStep, null },
        { "an earlier step than the one already used", Totp.CodeAt(RfcSecret, NowStep - 1), NowStep - 1, null },
        { "a later step than the one already used", Totp.CodeAt(RfcSecret, NowStep + 1), NowStep, NowStep + 1 },
        { "a wrong code", "050472", 0, null },
        { "a letter in it", "05047a", 0, null },
        { "five digits", "05047", 0, null },
        { "seven digits", "0504710", 0, null },
        { "non-ASCII digits", "０５０４７１", 0, null },
        { "blank", "", 0, null },
        { "missing", null, 0, null },
    };

    [Theory]
    [MemberData(nameof(MatchCases))]
    public void Given_a_typed_code_When_it_is_matched_Then_only_a_fresh_code_of_a_nearby_step_is_accepted(string why, string? code, long lastUsedStep, long? expected)
    {
        Assert.NotNull(why);

        Assert.Equal(expected, Totp.Match(RfcSecret, code, Now, lastUsedStep));
    }

    public static TheoryData<string, string> Base32Cases() => new()
    {
        // bytes (ASCII), RFC 4648 base32 without padding
        { "", "" },
        { "f", "MY" },
        { "fo", "MZXQ" },
        { "foo", "MZXW6" },
        { "foob", "MZXW6YQ" },
        { "fooba", "MZXW6YTB" },
        { "foobar", "MZXW6YTBOI" },
        { "12345678901234567890", "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ" },
    };

    [Theory]
    [MemberData(nameof(Base32Cases))]
    public void Given_a_secret_When_it_is_written_for_an_authenticator_Then_it_is_RFC_4648_base32_without_padding(string ascii, string expected)
    {
        Assert.Equal(expected, Totp.Base32Of(Encoding.ASCII.GetBytes(ascii)));
    }
}
