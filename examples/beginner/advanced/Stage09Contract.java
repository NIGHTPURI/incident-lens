import java.util.Map;
class Stage09Contract {
  static void oldClient(Map<String,Object> response) {
    if(!(response.get("total") instanceof Integer value) || value<0) throw new IllegalArgumentException("total must remain a nonnegative JSON integer");
  }
  public static void main(String[] args) {
    oldClient(Map.of("total",2400));
    oldClient(Map.of("total",2400,"currency","KRW")); // this client tolerates extra fields
    for(Map<String,Object> change: java.util.List.<Map<String,Object>>of(Map.of("amount",2400),Map.of("total","2400"))) {
      try { oldClient(change); throw new AssertionError("breaking change accepted"); }
      catch(IllegalArgumentException expected) { }
    }
    System.out.println("PASS contract model: tolerant client accepts added field; rejects rename and type change");
    System.out.println("This is a typed response model; Spring MockMvc tests cover actual JSON serialization.");
  }
}
