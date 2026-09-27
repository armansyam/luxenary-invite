import { describe, it, expect, vi } from "vitest";
import { logger } from "@/lib/logger";
import { captureException, isErrorTrackingConfigured } from "@/lib/errorTracker";
import { getActiveRateLimitDriver, rateLimit } from "@/lib/rateLimit";

describe("Enterprise Structured Logger & Error Tracker", () => {
  it("logger.child menciptakan scoped logger dengan context yang tepat", () => {
    const child = logger.child("TestContext", { service: "auth" });
    expect(typeof child.info).toBe("function");
    expect(typeof child.warn).toBe("function");
    expect(typeof child.error).toBe("function");
  });

  it("captureException menangani Error instance tanpa throw", () => {
    expect(() => {
      captureException(new Error("Test simulation error"), {
        orderId: "ord-123",
        path: "/api/test",
      });
    }).not.toThrow();
  });

  it("captureException menangani non-Error types (string/object)", () => {
    expect(() => {
      captureException("Plain string error", { userId: "user-123" });
    }).not.toThrow();
  });

  it("isErrorTrackingConfigured membaca status SENTRY_DSN dengan benar", () => {
    const originalDsn = process.env.SENTRY_DSN;
    delete process.env.SENTRY_DSN;
    expect(isErrorTrackingConfigured()).toBe(false);

    process.env.SENTRY_DSN = "https://public@sentry.io/123456";
    expect(isErrorTrackingConfigured()).toBe(true);

    if (originalDsn) process.env.SENTRY_DSN = originalDsn;
    else delete process.env.SENTRY_DSN;
  });

  it("getActiveRateLimitDriver mengidentifikasi driver rate limit secara dinamis", () => {
    const originalUrl = process.env.UPSTASH_REDIS_REST_URL;
    const originalToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    expect(getActiveRateLimitDriver()).toBe("postgresql");

    process.env.UPSTASH_REDIS_REST_URL = "https://upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "secret-token";
    expect(getActiveRateLimitDriver()).toBe("redis");

    if (originalUrl) process.env.UPSTASH_REDIS_REST_URL = originalUrl;
    else delete process.env.UPSTASH_REDIS_REST_URL;
    if (originalToken) process.env.UPSTASH_REDIS_REST_TOKEN = originalToken;
    else delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it("in-memory rateLimit memblokir request saat limit terlampaui", () => {
    const testIp = `test-ip-${Date.now()}`;
    expect(rateLimit(testIp, 2, 60000)).toBe(true);
    expect(rateLimit(testIp, 2, 60000)).toBe(true);
    expect(rateLimit(testIp, 2, 60000)).toBe(false); // Over limit!
  });
});
