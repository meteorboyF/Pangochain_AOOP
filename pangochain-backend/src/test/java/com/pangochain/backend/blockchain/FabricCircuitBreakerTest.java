package com.pangochain.backend.blockchain;

import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerConfig;
import org.junit.jupiter.api.Test;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Validates the circuit-breaker semantics the Fabric integration relies on, using the same
 * thresholds configured in application.yml for the "fabric" instance. This proves the
 * OPEN→fast-fallback behaviour without needing a live Fabric peer; the @CircuitBreaker
 * annotation on FabricGatewayService wires this config to submit/evaluateTransaction.
 */
class FabricCircuitBreakerTest {

    private CircuitBreaker fabricBreaker() {
        return CircuitBreaker.of("fabric", CircuitBreakerConfig.custom()
                .slidingWindowType(CircuitBreakerConfig.SlidingWindowType.COUNT_BASED)
                .slidingWindowSize(5)
                .minimumNumberOfCalls(5)
                .failureRateThreshold(50f)
                .waitDurationInOpenState(Duration.ofSeconds(30))
                .permittedNumberOfCallsInHalfOpenState(3)
                .recordExceptions(FabricException.class)
                .build());
    }

    @Test
    void healthyCalls_keepBreakerClosed() throws Exception {
        CircuitBreaker cb = fabricBreaker();
        for (int i = 0; i < 10; i++) {
            cb.executeCallable(() -> "ok");
        }
        assertThat(cb.getState()).isEqualTo(CircuitBreaker.State.CLOSED);
    }

    @Test
    void repeatedFailures_openBreaker_thenCallsFailFastWithoutInvokingTheTarget() {
        CircuitBreaker cb = fabricBreaker();
        // 5 failing calls (>=50% of the window) trip the breaker.
        for (int i = 0; i < 5; i++) {
            try {
                cb.executeCallable(() -> { throw new FabricException("peer down"); });
            } catch (Exception ignored) { }
        }
        assertThat(cb.getState()).isEqualTo(CircuitBreaker.State.OPEN);

        // While OPEN, the target is NOT invoked — the call is short-circuited immediately,
        // which is what makes the service-layer fallback fire fast during an outage.
        final boolean[] targetInvoked = {false};
        boolean shortCircuited = false;
        try {
            cb.executeCallable(() -> { targetInvoked[0] = true; return "should not run"; });
        } catch (Exception e) {
            shortCircuited = e instanceof io.github.resilience4j.circuitbreaker.CallNotPermittedException;
        }
        assertThat(shortCircuited).isTrue();
        assertThat(targetInvoked[0]).isFalse();
    }
}
