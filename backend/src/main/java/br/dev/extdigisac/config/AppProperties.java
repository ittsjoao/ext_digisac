package br.dev.extdigisac.config;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("app")
public record AppProperties(
        String masterKey,
        String sessionSecret,
        String adminKey,
        String minExtVersion,
        String ownerContact,
        String adminOrigin,
        int rateLimitPerMinute,
        Duration sessionTtl) {
}
