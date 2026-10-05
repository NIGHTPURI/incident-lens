using System.Security.Cryptography;
using System.Text;

// Exercise token mapping only; no issuance, signature, expiry or production identity.
public sealed class PracticeIdentity {
    private readonly string alice, bob;
    public PracticeIdentity(string alice, string bob) {
        if (alice.Length < 24 || bob.Length < 24 || alice == bob) throw new ArgumentException("two distinct exercise tokens of at least 24 characters required");
        this.alice = alice; this.bob = bob;
    }
    private static bool Equal(string left, string right) {
        var a = Encoding.UTF8.GetBytes(left); var b = Encoding.UTF8.GetBytes(right);
        return a.Length == b.Length && CryptographicOperations.FixedTimeEquals(a, b);
    }
    public string? Resolve(string header) {
        if (!header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)) return null;
        var token = header[7..];
        if (Equal(token, alice)) return "alice";
        if (Equal(token, bob)) return "bob";
        return null;
    }
}
