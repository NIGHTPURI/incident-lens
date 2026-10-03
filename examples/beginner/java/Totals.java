class Totals {
  static int total(int price, int quantity) {
    if (quantity <= 0) {
      throw new IllegalArgumentException("quantity must be positive");
    }
    return price * quantity;
  }
  public static void main(String[] args) {
    for (int quantity : new int[] {1, 2, 3}) {
      System.out.println(total(1200, quantity));
    }
    if (total(1200, 2) != 2400) throw new AssertionError("total");
  }
}
