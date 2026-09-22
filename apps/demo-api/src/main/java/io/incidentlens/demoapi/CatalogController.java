package io.incidentlens.demoapi;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;

@RestController
public class CatalogController {
    private final CatalogService catalog;
    public CatalogController(CatalogService catalog) { this.catalog = catalog; }
    @GetMapping("/api/catalog")
    List<CatalogRepository.ProductView> list(@RequestParam(defaultValue = "books") String category) { return catalog.find(category); }
}
