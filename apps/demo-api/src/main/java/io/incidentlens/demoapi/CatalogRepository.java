package io.incidentlens.demoapi;

import io.incidentlens.common.SessionTelemetry;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.math.BigDecimal;
import java.util.List;

@Repository
public class CatalogRepository {
    private final JdbcTemplate jdbc;
    private final SessionTelemetry telemetry;
    public CatalogRepository(JdbcTemplate jdbc, SessionTelemetry telemetry) { this.jdbc = jdbc; this.telemetry = telemetry; }
    public List<ProductView> find(String category, boolean degraded) {
        long start = System.nanoTime();
        try {
            if (!degraded) return jdbc.query("SELECT p.id,p.name,p.price,d.description FROM product p JOIN product_detail d ON d.product_id=p.id "
                    + "WHERE p.category=? ORDER BY p.id LIMIT 50", (rs, row) -> new ProductView(rs.getLong(1), rs.getString(2), rs.getBigDecimal(3), rs.getString(4)), category);
            // LOWER defeats the category index; each row then causes a separate detail round trip (N+1).
            List<ProductView> products = jdbc.query("SELECT id,name,price FROM product WHERE LOWER(category)=? ORDER BY id LIMIT 50",
                    (rs, row) -> new ProductView(rs.getLong(1), rs.getString(2), rs.getBigDecimal(3), null), category);
            return products.stream().map(product -> new ProductView(product.id(), product.name(), product.price(),
                    jdbc.queryForObject("SELECT description FROM product_detail WHERE product_id=?", String.class, product.id()))).toList();
        } finally { telemetry.database(System.nanoTime() - start); }
    }
    public record ProductView(long id, String name, BigDecimal price, String description) { }
}
