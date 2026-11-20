package com.cubeage.erp.auth.security;

import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory fixed-window rate limiter keyed by arbitrary strings (IP + endpoint, email, ...).
 *
 * <p><b>Limitation:</b> counters live in this JVM. With several backend instances each instance
 * enforces its own limit, so the effective limit is multiplied. The SRS (12.9) targets a
 * Redis-backed limiter; swap this class for one when Redis is introduced.
 */
@Component
public class RateLimiter {

    private static final int MAX_KEYS = 100_000;

    private record Window(long startMillis, int count) { }

    private final Map<String, Window> windows = new ConcurrentHashMap<>();
    private final Clock clock;

    public RateLimiter() {
        this(Clock.systemUTC());
    }

    RateLimiter(Clock clock) {
        this.clock = clock;
    }

    /** Records one hit; returns false when the key has exceeded {@code limit} in the window. */
    public boolean tryAcquire(String key, int limit, Duration window) {
        long now = clock.millis();
        if (windows.size() > MAX_KEYS) evictExpired(now, window.toMillis());
        Window updated = windows.compute(key, (k, w) ->
                (w == null || now - w.startMillis() >= window.toMillis()) ? new Window(now, 1) : new Window(w.startMillis(), w.count() + 1));
        return updated.count() <= limit;
    }

    /** Current count without recording a hit. */
    public int count(String key, Duration window) {
        Window w = windows.get(key);
        if (w == null || clock.millis() - w.startMillis() >= window.toMillis()) return 0;
        return w.count();
    }

    public void reset(String key) {
        windows.remove(key);
    }

    private void evictExpired(long now, long windowMillis) {
        windows.entrySet().removeIf(e -> now - e.getValue().startMillis() >= windowMillis);
    }
}
