package learning;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
class TotalController {
    private final TotalService service;
    TotalController(TotalService service) { this.service = service; }
    record TotalResult(int total) {}
    @GetMapping("/total")
    TotalResult total(@RequestParam("quantity") int quantity) {
        return new TotalResult(service.total(quantity));
    }
}
