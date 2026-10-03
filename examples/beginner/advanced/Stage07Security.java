import java.security.*;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import java.sql.*;
class Stage07Security {
  record Principal(String id, boolean admin) {}
  static boolean mayRead(Principal user, String owner) {
    return user != null && (user.admin() || user.id().equals(owner));
  }
  static byte[] hash(char[] password, byte[] salt) throws Exception {
    PBEKeySpec spec=new PBEKeySpec(password,salt,600_000,256);
    try { return SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).getEncoded(); }
    finally { spec.clearPassword(); }
  }
  static boolean csrfAllowed(String method, String expected, String supplied) {
    return method.equals("GET") || (expected != null && supplied != null &&
      MessageDigest.isEqual(expected.getBytes(java.nio.charset.StandardCharsets.UTF_8), supplied.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
  }
  public static void main(String[] args) throws Exception {
    byte[] salt=new byte[16]; new SecureRandom().nextBytes(salt);
    byte[] stored=hash("example-only".toCharArray(),salt);
    if (!MessageDigest.isEqual(stored,hash("example-only".toCharArray(),salt))) throw new AssertionError("password");
    if (MessageDigest.isEqual(stored,hash("wrong".toCharArray(),salt))) throw new AssertionError("wrong password");
    if (!mayRead(new Principal("alice",false),"alice") || mayRead(new Principal("bob",false),"alice") || mayRead(null,"alice")) throw new AssertionError("authorization");
    if (csrfAllowed("POST","random-session-token",null) || !csrfAllowed("POST","random-session-token","random-session-token")) throw new AssertionError("csrf");
    try(Connection db=DriverManager.getConnection("jdbc:h2:mem:security_lesson")) {
      db.createStatement().execute("CREATE TABLE account(name VARCHAR(100) PRIMARY KEY)");
      db.createStatement().execute("INSERT INTO account VALUES('alice')");
      try(PreparedStatement query=db.prepareStatement("SELECT name FROM account WHERE name=?")) {
        query.setString(1,"alice' OR '1'='1");
        if(query.executeQuery().next()) throw new AssertionError("injection");
      }
    }
    System.out.println("PASS security: password derivation, owner policy, CSRF policy model, bound SQL parameter");
    System.out.println("No browser session, HTTPS, CORS or production authentication server was tested.");
  }
}
