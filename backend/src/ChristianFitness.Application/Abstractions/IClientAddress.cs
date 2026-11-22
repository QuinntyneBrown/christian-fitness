using System.Net;
using System.Net.Sockets;

namespace ChristianFitness.Application.Abstractions;

/// <summary>Where the current request comes from, as rate limits count it (L2-034; ADR 0010).</summary>
public interface IClientAddress
{
    /// <summary>The key the request is counted under: see <see cref="ClientAddressPartition.Of"/>. Never logged.</summary>
    string PartitionKey { get; }
}

/// <summary>The key a client address is counted under.</summary>
public static class ClientAddressPartition
{
    /// <summary>The key of a request with no address.</summary>
    public const string Unknown = "unknown";

    /// <summary>
    /// An IPv4 address as itself (an IPv4-mapped IPv6 address as its IPv4 address), an IPv6 address
    /// as its /64 network, since one IPv6 host is usually given a whole /64, and no address as
    /// <see cref="Unknown"/>.
    /// </summary>
    public static string Of(IPAddress? address)
    {
        if (address is null)
        {
            return Unknown;
        }

        if (address.IsIPv4MappedToIPv6)
        {
            address = address.MapToIPv4();
        }

        if (address.AddressFamily != AddressFamily.InterNetworkV6)
        {
            return address.ToString();
        }

        var bytes = address.GetAddressBytes();
        Array.Clear(bytes, 8, 8);
        return new IPAddress(bytes) + "/64";
    }
}
