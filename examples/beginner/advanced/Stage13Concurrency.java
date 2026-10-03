import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;
import java.sql.*;
class Stage13Concurrency {
  record Result(String fingerprint,int orderId) {}
  static class Orders {
    Map<String,Result> keys=new HashMap<>(); int created=0;
    synchronized int create(String key,String fingerprint) {
      Result prior=keys.get(key);
      if(prior!=null) {
        if(!prior.fingerprint().equals(fingerprint)) throw new IllegalArgumentException("409 key payload conflict (model)");
        return prior.orderId();
      }
      int id=++created; keys.put(key,new Result(fingerprint,id)); return id;
    }
  }
  public static void main(String[] args) throws Exception {
    AtomicInteger unsafe=new AtomicInteger(); CountDownLatch bothRead=new CountDownLatch(2);
    Runnable split=()->{ int old=unsafe.get(); bothRead.countDown(); try { bothRead.await(); } catch(InterruptedException e) { Thread.currentThread().interrupt(); throw new RuntimeException(e); } unsafe.set(old+1); };
    Thread a=new Thread(split),b=new Thread(split); a.start();b.start();a.join();b.join();
    if(unsafe.get()!=1) throw new AssertionError("lost update schedule");
    AtomicInteger safe=new AtomicInteger(); Thread c=new Thread(safe::incrementAndGet),d=new Thread(safe::incrementAndGet); c.start();d.start();c.join();d.join();
    if(safe.get()!=2) throw new AssertionError("atomic update");
    Orders orders=new Orders(); if(orders.create("k1","p1:q2")!=orders.create("k1","p1:q2") || orders.created!=1) throw new AssertionError("idempotency");
    try { orders.create("k1","p1:q3"); throw new AssertionError("payload collision"); } catch(IllegalArgumentException expected) { }
    try(Connection db=DriverManager.getConnection("jdbc:h2:mem:optimistic_lesson")) {
      Statement sql=db.createStatement(); sql.execute("CREATE TABLE product(id INT PRIMARY KEY, stock INT, version INT)"); sql.execute("INSERT INTO product VALUES(1,2,0)");
      if(sql.executeUpdate("UPDATE product SET stock=stock-1,version=version+1 WHERE id=1 AND version=0 AND stock>0")!=1) throw new AssertionError();
      if(sql.executeUpdate("UPDATE product SET stock=stock-1,version=version+1 WHERE id=1 AND version=0 AND stock>0")!=0) throw new AssertionError("stale update");
    }
    System.out.println("PASS actual threads: split get/set=1, atomic increment=2; H2 stale version rejected");
    System.out.println("PASS process-local idempotency MODEL; restart/distributed guarantees not provided");
  }
}
