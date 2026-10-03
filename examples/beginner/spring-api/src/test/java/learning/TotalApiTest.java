package learning;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class TotalApiTest {
    @Autowired MockMvc http;
    @Test void serviceValidatesBothBoundaries() {
        TotalService service = new TotalService();
        assertEquals(1200, service.total(1));
        assertEquals(12000, service.total(10));
        assertThrows(IllegalArgumentException.class, () -> service.total(0));
        assertThrows(IllegalArgumentException.class, () -> service.total(11));
    }
    @Test void httpReturnsTypedJson() throws Exception {
        http.perform(get("/total").param("quantity", "2"))
            .andExpect(status().isOk()).andExpect(content().contentTypeCompatibleWith("application/json"))
            .andExpect(jsonPath("$.total").value(2400));
    }
    @Test void httpRejectsMissingMalformedAndOutOfRangeInputs() throws Exception {
        for (String input : new String[] {"two", "0", "11"}) {
            http.perform(get("/total").param("quantity", input)).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("quantity must be an integer from 1 to 10"));
        }
        http.perform(get("/total")).andExpect(status().isBadRequest());
    }
    @Test void routesAndMethodsRemainDistinct() throws Exception {
        http.perform(get("/missing")).andExpect(status().isNotFound());
        http.perform(post("/total").param("quantity", "2")).andExpect(status().isMethodNotAllowed());
    }
}
