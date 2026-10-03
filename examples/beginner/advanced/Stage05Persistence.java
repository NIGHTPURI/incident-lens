import java.sql.*;
import java.nio.file.*;
class Stage05Persistence {
  public static void main(String[] args) throws Exception {
    Path directory = Files.createTempDirectory("incidentlens-sql-lesson-");
    String url = "jdbc:h2:file:" + directory.resolve("products");
    try (Connection db = DriverManager.getConnection(url); Statement sql = db.createStatement()) {
      sql.execute("CREATE TABLE product(id INT PRIMARY KEY, name VARCHAR(80) NOT NULL UNIQUE, price INT NOT NULL CHECK(price>=0))");
      sql.execute("CREATE TABLE purchase(id INT PRIMARY KEY, product_id INT NOT NULL REFERENCES product(id), quantity INT CHECK(quantity>0))");
      try (PreparedStatement insert = db.prepareStatement("INSERT INTO product VALUES(?,?,?)")) {
        insert.setInt(1, 1); insert.setString(2, "Notebook"); insert.setInt(3, 1200); insert.executeUpdate();
      }
      sql.executeUpdate("UPDATE product SET price=1500 WHERE id=1");
      sql.executeUpdate("INSERT INTO purchase VALUES(10,1,2)");
      try { sql.executeUpdate("INSERT INTO purchase VALUES(11,99,1)"); throw new AssertionError("FK missing"); }
      catch (SQLException expected) { if (!expected.getSQLState().startsWith("23")) throw expected; }
      try (ResultSet rows = sql.executeQuery("SELECT p.name, p.price * o.quantity AS total FROM product p JOIN purchase o ON o.product_id=p.id")) {
        if (!rows.next() || rows.getInt("total") != 3000) throw new AssertionError("join");
        System.out.println(rows.getString("name") + " total=" + rows.getInt("total"));
      }
      sql.executeUpdate("DELETE FROM purchase WHERE id=10");
    }
    // Actual file close/reopen, not a MySQL server or a simulated durable store.
    try (Connection db = DriverManager.getConnection(url); ResultSet rows = db.createStatement().executeQuery("SELECT price FROM product WHERE id=1")) {
      if (!rows.next() || rows.getInt(1)!=1500) throw new AssertionError("durability");
    }
    System.out.println("PASS persistence: CRUD, join, foreign key, file reopen (H2)");
  }
}
