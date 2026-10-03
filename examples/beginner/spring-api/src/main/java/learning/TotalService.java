package learning;
import org.springframework.stereotype.Service;

@Service
class TotalService {
    int total(int quantity) {
        if (quantity < 1 || quantity > 10) {
            throw new IllegalArgumentException("quantity must be from 1 to 10");
        }
        return 1200 * quantity;
    }
}
