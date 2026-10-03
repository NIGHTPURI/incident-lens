import java.util.*;
class Stage11Observability {
  static int percentile(int[] values,double fraction) {
    if(values.length==0) throw new IllegalArgumentException("no samples");
    int[] sorted=values.clone(); Arrays.sort(sorted);
    return sorted[(int)Math.ceil(fraction*sorted.length)-1];
  }
  public static void main(String[] args) {
    int[] fixture={10,20,30,40,50,60,70,80,90,100,110,120,130,140,150,160,170,180,190,1000};
    if(percentile(fixture,.95)!=190) throw new AssertionError("nearest rank p95");
    if(Arrays.stream(fixture).average().orElseThrow()!=145) throw new AssertionError("mean");
    try { percentile(new int[0],.95); throw new AssertionError("missing became zero"); } catch(IllegalArgumentException expected) { }
    System.out.println("SYNTHETIC fixture: n=20 mean=145ms nearest-rank p95=190ms max=1000ms errors=1 rate=5%");
    System.out.println("trace=t1 catalog=100ms db=60ms cache=5ms; remaining span time/overlap must be inspected");
    System.out.println("Hypothesis: DB contributes latency. Not proven: no real workload or causal intervention was run.");
  }
}
