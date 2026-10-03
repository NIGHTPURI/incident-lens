package learning.data;
import jakarta.persistence.*;
@Entity
class Product {
  @Id @GeneratedValue Long id;
  String name;
  @ManyToOne(fetch=FetchType.LAZY, optional=false) Category category;
  protected Product() {}
  Product(String name, Category category) { this.name=name; this.category=category; }
}
