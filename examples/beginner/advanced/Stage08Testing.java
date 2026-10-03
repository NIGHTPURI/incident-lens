class Stage08Testing {
  interface Calculator { int total(int price,int quantity); }
  static int correct(int price,int quantity) {
    if(price<0 || quantity<1 || quantity>10) throw new IllegalArgumentException();
    return Math.multiplyExact(price,quantity);
  }
  static void contract(Calculator calculate) {
    if(calculate.total(500,3)!=1500 || calculate.total(0,1)!=0) throw new AssertionError("normal result");
    for(int quantity:new int[]{0,11}) {
      try { calculate.total(500,quantity); throw new AssertionError("invalid quantity accepted"); }
      catch(IllegalArgumentException expected) { }
    }
    try { calculate.total(-1,1); throw new AssertionError("negative price accepted"); }
    catch(IllegalArgumentException expected) { }
  }
  public static void main(String[] args) {
    try { contract((price,quantity)->price*quantity); throw new IllegalStateException("test missed the bug"); }
    catch(AssertionError expected) { System.out.println("RED detected: "+expected.getMessage()); }
    contract(Stage08Testing::correct);
    for(int q=1;q<=10;q++) if(correct(500,q)!=q*correct(500,1)) throw new AssertionError("linear property");
    System.out.println("GREEN: normal, boundary, invalid-input and invariant checks passed");
  }
}
