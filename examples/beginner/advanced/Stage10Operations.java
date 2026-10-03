class Stage10Operations {
  record Release(String name,int minimumSchema,boolean healthy) {}
  static int port(String configured) {
    int value=Integer.parseInt(configured);
    if(value<1024 || value>65535) throw new IllegalArgumentException("example port outside 1024..65535");
    return value;
  }
  static Release route(Release current,Release candidate,int schema) {
    if(!candidate.healthy() || candidate.minimumSchema()>schema) return current;
    return candidate;
  }
  public static void main(String[] args) {
    if(port("18182")!=18182) throw new AssertionError();
    try { port("eighty"); throw new AssertionError(); } catch(IllegalArgumentException expected) { }
    Release old=new Release("v1",1,true);
    Release broken=new Release("v2",1,false);
    if(route(old,broken,1)!=old) throw new AssertionError("unready traffic");
    Release incompatible=new Release("v2",2,true);
    if(route(old,incompatible,1)!=old) throw new AssertionError("schema mismatch");
    Release next=new Release("v2",1,true);
    if(route(old,next,1)!=next || route(next,old,1)!=old) throw new AssertionError("rollout/rollback model");
    System.out.println("PASS deployment MODEL: invalid config rejected; unready/incompatible release receives no traffic; compatible rollback allowed");
    System.out.println("No container was built, no process deployed, no traffic routing changed.");
  }
}
