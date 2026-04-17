import { describe, it, expect } from "vitest";
import { getMockContact, getMockFollowupSuggestions } from "./mock-data";

describe("getMockContact", () => {
  it("returns undefined for a non-existent ID", () => {
    expect(getMockContact("non-existent-id-000")).toBeUndefined();
  });

  it("returns undefined for empty string ID", () => {
    expect(getMockContact("")).toBeUndefined();
  });

  it("returns a contact with sections and interactions for a known ID", () => {
    const result = getMockContact("contact-1");
    expect(result).toBeDefined();
    expect(result?.name).toBe("Lisa Chen");
    expect(Array.isArray(result?.sections)).toBe(true);
    expect(Array.isArray(result?.interactions)).toBe(true);
    expect(result!.sections.length).toBeGreaterThan(0);
    expect(result!.interactions.length).toBeGreaterThan(0);
  });

  it("returns only sections belonging to the requested contact", () => {
    const result = getMockContact("contact-1");
    result?.sections.forEach((s) => {
      expect(s.contact_id).toBe("contact-1");
    });
  });

  it("returns only interactions belonging to the requested contact", () => {
    const result = getMockContact("contact-1");
    result?.interactions.forEach((i) => {
      expect(i.contact_id).toBe("contact-1");
    });
  });
});

describe("getMockFollowupSuggestions", () => {
  it("returns an array (never throws)", () => {
    expect(Array.isArray(getMockFollowupSuggestions())).toBe(true);
  });

  it("returns at least 1 suggestion (mock data has due follow-ups)", () => {
    const suggestions = getMockFollowupSuggestions();
    expect(suggestions.length).toBeGreaterThanOrEqual(1);
  });

  it("all returned contacts have a next_followup_at in the past or today", () => {
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    const suggestions = getMockFollowupSuggestions();
    suggestions.forEach((c) => {
      expect(c.next_followup_at).not.toBeNull();
      expect(new Date(c.next_followup_at!).getTime()).toBeLessThanOrEqual(endOfToday.getTime());
    });
  });
});
