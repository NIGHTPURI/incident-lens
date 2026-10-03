package learning.data;
import jakarta.persistence.EntityManager;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest(properties={"spring.jpa.properties.hibernate.generate_statistics=true", "spring.jpa.hibernate.ddl-auto=create-drop"})
class DataLessonTest {
  @Autowired EntityManager em;
  @Autowired Products products;
  Statistics stats;
  @BeforeEach void setup() {
    for(int i=1;i<=3;i++) { Category c=new Category("category-"+i); em.persist(c); em.persist(new Product("product-"+i,c)); }
    em.flush(); em.clear(); // Remove setup entities from the first-level cache.
    stats=em.getEntityManagerFactory().unwrap(SessionFactory.class).getStatistics(); stats.clear();
  }
  @Test void lazyTraversalActuallyProducesNPlusOne() {
    var rows=products.findAll(Sort.by("id"));
    for(Product p:rows) assertNotNull(p.category.getName());
    assertEquals(4,stats.getPrepareStatementCount());
  }
  @Test void fetchJoinLoadsTheNeededRelationshipInOneQuery() {
    var rows=products.withCategories();
    assertEquals(3,rows.size());
    for(Product p:rows) assertNotNull(p.category.getName());
    assertEquals(1,stats.getPrepareStatementCount());
  }
  @Test void stablePaginationHasExpectedSizeAndTotal() {
    var page=products.findAll(PageRequest.of(0,2,Sort.by("id")));
    assertEquals(2,page.getNumberOfElements()); assertEquals(3,page.getTotalElements()); assertTrue(page.hasNext());
    var next=products.findAll(PageRequest.of(1,2,Sort.by("id")));
    assertEquals(1,next.getNumberOfElements());
    assertTrue(page.getContent().get(1).id<next.getContent().get(0).id);
  }
}
