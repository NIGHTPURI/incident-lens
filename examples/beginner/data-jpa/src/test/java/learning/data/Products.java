package learning.data;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
interface Products extends JpaRepository<Product,Long> {
  @Query("select p from Product p join fetch p.category order by p.id")
  List<Product> withCategories();
}
