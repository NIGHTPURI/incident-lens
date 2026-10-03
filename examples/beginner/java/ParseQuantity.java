class ParseQuantity {
  public static void main(String[] args) {
    String input = args.length == 0 ? "2" : args[0];
    try {
      int quantity = Integer.parseInt(input);
      if (quantity <= 0) throw new IllegalArgumentException("quantity must be positive");
      int result = 1200 * quantity;
      System.out.println(result);
    } catch (IllegalArgumentException error) {
      System.out.println("Invalid quantity: " + input);
    }
  }
}
