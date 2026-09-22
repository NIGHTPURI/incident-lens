package io.incidentlens.control;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Component;
import java.time.Instant;
import java.util.List;

@Component
class FaultCoordinator {
    private static final String KEY = "incidentlens:fault";
    private static final DefaultRedisScript<Long> APPLY = new DefaultRedisScript<>("""
        local current = redis.call('GET', KEYS[1])
        if current then
          local state = cjson.decode(current)
          if state.sessionId ~= ARGV[1] and state.enabled then return 0 end
        end
        if ARGV[2] == 'false' then redis.call('DEL', KEYS[1])
        else redis.call('SET', KEYS[1], ARGV[3], 'EX', 900) end
        return 1
        """, Long.class);
    private final StringRedisTemplate redis;
    private final JsonCodec json;
    FaultCoordinator(StringRedisTemplate redis, JsonCodec json) { this.redis = redis; this.json = json; }
    Models.FaultState current() {
        String raw = redis.opsForValue().get(KEY);
        if (raw == null) return null;
        Models.FaultState state = json.read(raw, Models.FaultState.class);
        return state.enabled() && state.expiresAt().isAfter(Instant.now()) ? state : null;
    }
    Models.FaultState apply(SessionEntity session, Models.FaultCommand command) {
        Models.FaultState state = new Models.FaultState(session.id, session.scenario, command.enabled(),
                command.parameter(), Instant.now().plusSeconds(900));
        Long applied = redis.execute(APPLY, List.of(KEY), session.id, Boolean.toString(command.enabled()), json.write(state));
        if (!Long.valueOf(1).equals(applied)) throw ApiFailure.conflict("Another session owns the active fault; disable it first or wait for expiry");
        return state;
    }
}
