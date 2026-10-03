import java.util.*;
import java.sql.*;
class Stage12Cache {
  record Entry(int value,long expiresAt) {}
  static class Catalog {
    int databasePrice=1200, loads=0; long now=0;
    Map<String,Entry> cache=new HashMap<>();
    int read() {
      Entry found=cache.get("product:1");
      if(found!=null && now<found.expiresAt()) return found.value();
      loads++; cache.put("product:1",new Entry(databasePrice,now+100)); return databasePrice;
    }
  }
  public static void main(String[] args) throws Exception {
    Catalog c=new Catalog(); c.read(); c.read();
    if(c.loads!=1) throw new AssertionError("cache hit");
    c.databasePrice=1500;
    if(c.read()!=1200) throw new AssertionError("expected stale value");
    c.now=100;
    if(c.read()!=1500 || c.loads!=2) throw new AssertionError("expiry boundary");
    c.databasePrice=1700; c.cache.remove("product:1");
    if(c.read()!=1700 || c.loads!=3) throw new AssertionError("invalidation");
    try(Connection db=DriverManager.getConnection("jdbc:h2:mem:index_lesson")) {
      Statement sql=db.createStatement();
      sql.execute("CREATE TABLE product(id INT PRIMARY KEY, category INT)");
      sql.execute("INSERT INTO product SELECT X, MOD(X,10) FROM SYSTEM_RANGE(1,1000)");
      sql.execute("CREATE INDEX idx_product_category ON product(category)");
      try(ResultSet plan=sql.executeQuery("EXPLAIN SELECT id FROM product WHERE category=3")) {
        plan.next(); if(!plan.getString(1).contains("IDX_PRODUCT_CATEGORY")) throw new AssertionError("index plan");
      }
    }
    System.out.println("PASS cache MODEL: hit, stale read, exact TTL boundary, invalidation; backing loads=3");
    System.out.println("PASS actual H2 EXPLAIN uses category index; no Redis or production speedup measured");
  }
}
