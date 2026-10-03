import java.util.List;
class Catalog {
  static class Product {
    final String name;
    final int price;
    Product(String name, int price) {
      this.name = name;
      this.price = price;
    }
  }
  public static void main(String[] args) {
    List<Product> products = List.of(new Product("Notebook", 1200), new Product("Pen", 500));
    int sum = 0;
    for (Product product : products) {
      sum += product.price;
    }
    System.out.println(sum);
  }
}
