package com.pangochain.backend.config.ratelimit;

import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class RateLimitTest {

    @Test
    void tokenBucket_allowsUpToCapacityThenBlocks() {
        TokenBucket bucket = new TokenBucket(3, 60_000);
        assertThat(bucket.tryConsume()).isTrue();
        assertThat(bucket.tryConsume()).isTrue();
        assertThat(bucket.tryConsume()).isTrue();
        assertThat(bucket.tryConsume()).isFalse();        // 4th blocked
        assertThat(bucket.secondsUntilRefill()).isGreaterThanOrEqualTo(1);
    }

    @Test
    void filter_blocks11thLoginFromSameIpWith429AndRetryAfter() throws Exception {
        RateLimitFilter filter = new RateLimitFilter();
        FilterChain chain = mock(FilterChain.class);

        // 10 allowed
        for (int i = 0; i < 10; i++) {
            MockHttpServletResponse res = doLogin(filter, chain, "1.2.3.4");
            assertThat(res.getStatus()).isNotEqualTo(429);
        }
        // 11th blocked
        MockHttpServletResponse blocked = doLogin(filter, chain, "1.2.3.4");
        assertThat(blocked.getStatus()).isEqualTo(429);
        assertThat(blocked.getHeader("Retry-After")).isNotNull();
        verify(chain, times(10)).doFilter(any(), any()); // chain only proceeds for the allowed 10
    }

    @Test
    void filter_isolatesLimitsPerIp() throws Exception {
        RateLimitFilter filter = new RateLimitFilter();
        FilterChain chain = mock(FilterChain.class);
        for (int i = 0; i < 10; i++) doLogin(filter, chain, "10.0.0.1");
        // a different IP still gets its own full allowance
        MockHttpServletResponse other = doLogin(filter, chain, "10.0.0.2");
        assertThat(other.getStatus()).isNotEqualTo(429);
    }

    @Test
    void filter_ignoresNonRateLimitedPaths() throws Exception {
        RateLimitFilter filter = new RateLimitFilter();
        FilterChain chain = mock(FilterChain.class);
        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/cases");
        req.setRemoteAddr("9.9.9.9");
        MockHttpServletResponse res = new MockHttpServletResponse();
        for (int i = 0; i < 50; i++) filter.doFilter(req, res, chain);
        assertThat(res.getStatus()).isNotEqualTo(429);
    }

    private MockHttpServletResponse doLogin(RateLimitFilter filter, FilterChain chain, String ip) throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/auth/login");
        req.setRemoteAddr(ip);
        MockHttpServletResponse res = new MockHttpServletResponse();
        filter.doFilter(req, res, chain);
        return res;
    }
}
