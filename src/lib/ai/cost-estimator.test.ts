import { describe, it, expect } from "vitest";
import { estimateCost, formatCostEstimate } from "./cost-estimator";
import type { Interaction } from "@/types/interaction";

function makeInteraction(rawContent: string, overrides: Partial<Interaction> = {}): Interaction {
  return {
    id: "test-id",
    contact_id: "contact-1",
    owner_id: "user-1",
    type: "text_note",
    raw_content: rawContent,
    media_url: null,
    source_context: null,
    ai_generated: false,
    created_at: "2026-04-17T12:00:00Z",
    ...overrides,
  };
}

describe("estimateCost", () => {
  it("returns a cost estimate with all required fields", () => {
    const result = estimateCost([], "debounced");
    expect(result).toHaveProperty("inputTokens");
    expect(result).toHaveProperty("outputTokens");
    expect(result).toHaveProperty("totalTokens");
    expect(result).toHaveProperty("usd");
    expect(result).toHaveProperty("model");
  });

  describe("0 interactions — minimum cost floor", () => {
    it("returns system prompt overhead as input tokens", () => {
      const result = estimateCost([], "debounced");
      expect(result.inputTokens).toBeGreaterThan(0);
      expect(result.inputTokens).toBe(800); // SYSTEM_PROMPT_TOKENS
    });

    it("has positive USD cost even with 0 interactions", () => {
      const result = estimateCost([], "debounced");
      expect(result.usd).toBeGreaterThan(0);
    });
  });

  describe("tier differences", () => {
    it("immediate tier uses gpt-4o-mini", () => {
      const result = estimateCost([], "immediate");
      expect(result.model).toBe("gpt-4o-mini");
    });

    it("debounced tier uses gpt-4o", () => {
      const result = estimateCost([], "debounced");
      expect(result.model).toBe("gpt-4o");
    });

    it("manual tier uses gpt-4o", () => {
      const result = estimateCost([], "manual");
      expect(result.model).toBe("gpt-4o");
    });

    it("immediate tier is cheaper than debounced for same interactions", () => {
      const interactions = [makeInteraction("Hello world")];
      const immediate = estimateCost(interactions, "immediate");
      const debounced = estimateCost(interactions, "debounced");
      expect(immediate.usd).toBeLessThan(debounced.usd);
    });
  });

  describe("100 interactions × 200 chars — mid-tier estimation", () => {
    it("estimates tokens proportional to content size", () => {
      const interactions = Array.from({ length: 100 }, (_, i) =>
        makeInteraction("A".repeat(200), { id: `id-${i}` }),
      );
      const result = estimateCost(interactions, "debounced");
      // 100 interactions × 200 chars / 4 chars-per-token = 5,000 interaction tokens
      // + 800 system prompt = 5,800 input tokens
      expect(result.inputTokens).toBe(5_800);
      expect(result.totalTokens).toBeGreaterThan(5_800); // + output tokens
    });

    it("USD cost is reasonable for 100 interactions (under $0.10)", () => {
      const interactions = Array.from({ length: 100 }, (_, i) =>
        makeInteraction("A".repeat(200), { id: `id-${i}` }),
      );
      const result = estimateCost(interactions, "debounced");
      expect(result.usd).toBeLessThan(0.1);
      expect(result.usd).toBeGreaterThan(0);
    });
  });

  describe("totalTokens = inputTokens + outputTokens", () => {
    it("totalTokens equals the sum of input and output", () => {
      const result = estimateCost([makeInteraction("test")], "debounced");
      expect(result.totalTokens).toBe(result.inputTokens + result.outputTokens);
    });
  });
});

describe("formatCostEstimate", () => {
  it("includes token count and model name", () => {
    const estimate = estimateCost([], "debounced");
    const formatted = formatCostEstimate(estimate);
    expect(formatted).toMatch(/tokens/);
    expect(formatted).toMatch(/gpt-4o/);
  });

  it("shows <$0.001 for very cheap estimates", () => {
    const estimate = estimateCost([], "immediate"); // gpt-4o-mini, 0 interactions
    const formatted = formatCostEstimate(estimate);
    expect(formatted).toMatch(/<\$0\.001/);
  });
});
