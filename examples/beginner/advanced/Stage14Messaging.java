import java.sql.*;
import java.util.concurrent.ArrayBlockingQueue;
class Stage14Messaging {
  static void consume(Connection db,String event) throws SQLException {
    db.setAutoCommit(false);
    try(PreparedStatement insert=db.prepareStatement("INSERT INTO processed VALUES(?)")) {
      insert.setString(1,event); insert.executeUpdate();
      db.createStatement().executeUpdate("UPDATE effect SET count=count+1"); db.commit();
    } catch(SQLException failure) {
      db.rollback(); if(!"23505".equals(failure.getSQLState())) throw failure;
    }
  }
  public static void main(String[] args) throws Exception {
    try(Connection db=DriverManager.getConnection("jdbc:h2:mem:outbox_lesson")) {
      Statement sql=db.createStatement();
      sql.execute("CREATE TABLE purchase(id INT PRIMARY KEY)");
      sql.execute("CREATE TABLE outbox(id VARCHAR(20) PRIMARY KEY, purchase_id INT REFERENCES purchase(id))");
      sql.execute("CREATE TABLE processed(id VARCHAR(20) PRIMARY KEY)");
      sql.execute("CREATE TABLE effect(count INT)"); sql.execute("INSERT INTO effect VALUES(0)");
      db.setAutoCommit(false);
      sql.execute("INSERT INTO purchase VALUES(1)"); sql.execute("INSERT INTO outbox VALUES('event-1',1)"); db.commit();
      // MODEL: broker accepts; relay crashes before recording publication, so it republishes.
      consume(db,"event-1"); consume(db,"event-1");
      try(ResultSet result=sql.executeQuery("SELECT count FROM effect")) { result.next(); if(result.getInt(1)!=1) throw new AssertionError("duplicate effect"); }
      sql.execute("INSERT INTO purchase VALUES(2)"); db.rollback();
      try(ResultSet result=sql.executeQuery("SELECT COUNT(*) FROM purchase")) { result.next(); if(result.getInt(1)!=1) throw new AssertionError("rollback"); }
      ArrayBlockingQueue<String> queue=new ArrayBlockingQueue<>(2);
      queue.add("event-2"); queue.add("event-3"); if(queue.offer("event-4")) throw new AssertionError("unbounded intake");
      int attempts=0; java.util.List<String> dlq=new java.util.ArrayList<>();
      while(attempts<3) {
        attempts++;
        try { throw new IllegalArgumentException("poison payload (model)"); }
        catch(IllegalArgumentException poison) { if(attempts==3) dlq.add("poison-event"); }
      }
      if(attempts!=3 || !dlq.equals(java.util.List.of("poison-event"))) throw new AssertionError("bounded retry/DLQ");
      System.out.println("PASS H2: order/outbox commit, rollback, duplicate delivery -> one transactional effect");
      System.out.println("MODEL broker: duplicate delivery, capacity=2 rejects third, poison message goes to DLQ after 3 attempts");
      System.out.println("No Kafka broker, partition reassignment or network crash was exercised.");
    }
  }
}
