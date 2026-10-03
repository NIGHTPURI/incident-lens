package learning.data;
import jakarta.persistence.*;
@Entity
class Category {
  @Id @GeneratedValue Long id;
  String name;
  public String getName() { return name; }
  protected Category() {}
  Category(String name) { this.name=name; }
}
