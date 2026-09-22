package io.incidentlens.demoapi;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.net.URI;

@RestController
@RequestMapping("/api/orders")
public class OrderController {
    private final OrderService orders;
    public OrderController(OrderService orders) { this.orders = orders; }
    @PostMapping
    ResponseEntity<OrderService.OrderView> create(@RequestHeader("Idempotency-Key") String key, @Valid @RequestBody CreateOrder body) {
        var result = orders.create(key, body.productId(), body.quantity());
        return (result.created() ? ResponseEntity.created(URI.create("/api/orders/" + result.order().id())) : ResponseEntity.ok())
                .header("Idempotency-Replayed", Boolean.toString(!result.created())).body(result.order());
    }
    @GetMapping("/{id}")
    OrderService.OrderView get(@PathVariable String id) { return orders.get(id); }
    public record CreateOrder(@Min(1) long productId, @Min(1) @Max(100) int quantity) { }
}
