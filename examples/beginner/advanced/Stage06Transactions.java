import java.sql.*;
class Stage06Transactions {
  public static void main(String[] args) throws Exception {
    try (Connection db=DriverManager.getConnection("jdbc:h2:mem:transaction_lesson")) {
      Statement sql=db.createStatement();
      sql.execute("CREATE TABLE product(id INT PRIMARY KEY, stock INT CHECK(stock>=0))");
      sql.execute("CREATE TABLE purchase(id INT PRIMARY KEY, quantity INT CHECK(quantity>0))");
      sql.execute("INSERT INTO product VALUES(1,2)");
      db.setAutoCommit(false);
      try {
        sql.executeUpdate("UPDATE product SET stock=stock-1 WHERE id=1");
        sql.executeUpdate("INSERT INTO purchase VALUES(10,0)"); // deliberately invalid
        db.commit(); throw new AssertionError("expected constraint error");
      } catch (SQLException expected) {
        db.rollback();
        if (!expected.getSQLState().startsWith("23")) throw expected;
      }
      try (ResultSet row=sql.executeQuery("SELECT stock FROM product WHERE id=1")) {
        row.next(); if (row.getInt(1)!=2) throw new AssertionError("partial write survived");
      }
      sql.executeUpdate("UPDATE product SET stock=stock-1 WHERE id=1");
      sql.executeUpdate("INSERT INTO purchase VALUES(10,1)"); db.commit();
      try (ResultSet row=sql.executeQuery("SELECT stock FROM product WHERE id=1")) {
        row.next(); if (row.getInt(1)!=1) throw new AssertionError("commit");
      }
      System.out.println("PASS transactions: failed purchase leaves stock=2; commit leaves stock=1 (H2)");
    }
  }
}
