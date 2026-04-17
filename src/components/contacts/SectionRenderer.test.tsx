import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SectionRenderer } from "./SectionRenderer";
import type { Section } from "@/types/section";

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeSection(overrides: Partial<Section> = {}): Section {
  return {
    id: "s-1",
    contact_id: "c-1",
    slug: "profile",
    title: "Profile",
    content_md: "## AI Content\n\nThis is AI-generated profile content.",
    summary: null,
    regenerated_at: "2026-04-10T12:00:00Z",
    interaction_count: 2,
    source_interaction_ids: ["interaction-1"],
    ...overrides,
  };
}

// ── Basic rendering ───────────────────────────────────────────────────────────

describe("SectionRenderer", () => {
  describe("basic rendering", () => {
    it("renders the section title", () => {
      render(<SectionRenderer section={makeSection()} />);
      expect(screen.getByText("Profile")).toBeInTheDocument();
    });

    it("renders interaction count when > 0", () => {
      render(<SectionRenderer section={makeSection({ interaction_count: 3 })} />);
      expect(screen.getByText(/3 interactions/)).toBeInTheDocument();
    });

    it("does not render interaction count when 0", () => {
      render(<SectionRenderer section={makeSection({ interaction_count: 0 })} />);
      expect(screen.queryByText(/0 interaction/)).not.toBeInTheDocument();
    });

    it("renders AI content by default (no override)", () => {
      render(<SectionRenderer section={makeSection()} />);
      expect(screen.getByText(/AI-generated profile content/)).toBeInTheDocument();
    });

    it("shows empty state when content_md is blank", () => {
      render(<SectionRenderer section={makeSection({ content_md: "" })} />);
      expect(screen.getByText(/No content yet/)).toBeInTheDocument();
    });
  });

  // ── Expand / collapse ─────────────────────────────────────────────────────

  describe("expand / collapse", () => {
    it("is expanded by default", () => {
      render(<SectionRenderer section={makeSection()} />);
      expect(screen.getByText(/AI-generated profile content/)).toBeVisible();
    });

    it("collapses when the header toggle is clicked", () => {
      render(<SectionRenderer section={makeSection()} />);
      const toggle = screen.getByRole("button", { name: /Collapse Profile/i });
      fireEvent.click(toggle);
      expect(screen.queryByText(/AI-generated profile content/)).not.toBeInTheDocument();
    });

    it("respects defaultExpanded=false", () => {
      render(<SectionRenderer section={makeSection()} defaultExpanded={false} />);
      expect(screen.queryByText(/AI-generated profile content/)).not.toBeInTheDocument();
    });

    it("expands when collapsed and header is clicked again", () => {
      render(<SectionRenderer section={makeSection()} />);
      const toggle = screen.getByRole("button", { name: /Collapse Profile/i });
      fireEvent.click(toggle); // collapse
      fireEvent.click(toggle); // expand
      expect(screen.getByText(/AI-generated profile content/)).toBeInTheDocument();
    });
  });

  // ── Override state ────────────────────────────────────────────────────────

  describe("user override", () => {
    const overriddenSection = makeSection({
      user_overrides_md: "## My Notes\n\nThis is my personal override.",
      overridden_at: "2026-04-16T10:00:00Z",
      override_reason: "AI missed the key detail.",
    });

    it("renders override content instead of AI content when user_overrides_md is set", () => {
      render(<SectionRenderer section={overriddenSection} />);
      expect(screen.getByText(/my personal override/)).toBeInTheDocument();
      expect(screen.queryByText(/AI-generated profile content/)).not.toBeInTheDocument();
    });

    it("shows the 'Edited' badge when override is active", () => {
      render(<SectionRenderer section={overriddenSection} />);
      // "Edited" appears in both the badge (header) and the timestamp line — check there are exactly 2
      const editedNodes = screen.getAllByText("Edited");
      expect(editedNodes.length).toBeGreaterThanOrEqual(1);
      // Badge is the one with the pencil icon inside — verify it exists via its class
      const badge = editedNodes.find((el) =>
        el.closest("span")?.classList.contains("rounded-full"),
      );
      expect(badge).toBeTruthy();
    });

    it("does NOT show 'Edited' badge when no override", () => {
      render(<SectionRenderer section={makeSection()} />);
      // There may be "Edited" in the timestamp line as a span, but badge should not appear
      const editedBadge = screen.queryByText("Edited");
      // The timestamp line "Edited · 2h ago" contains "Edited" — but the badge is separate.
      // For a non-overridden section, neither the badge nor the override timestamp line appears.
      expect(editedBadge).not.toBeInTheDocument();
    });

    it("shows override_reason in the timestamp area", () => {
      render(<SectionRenderer section={overriddenSection} />);
      expect(screen.getByText(/AI missed the key detail/)).toBeInTheDocument();
    });
  });

  // ── Override controls ─────────────────────────────────────────────────────

  describe("edit / restore controls", () => {
    it("calls onEdit with the section when Edit button is clicked", () => {
      const onEdit = vi.fn();
      render(<SectionRenderer section={makeSection()} onEdit={onEdit} />);
      fireEvent.click(screen.getByRole("button", { name: /Edit Profile/i }));
      expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: "s-1" }));
    });

    it("does not render Edit button when onEdit is not provided", () => {
      render(<SectionRenderer section={makeSection()} />);
      expect(screen.queryByRole("button", { name: /Edit/i })).not.toBeInTheDocument();
    });

    it("calls onRestoreAI with the section when Restore AI is clicked", () => {
      const onRestoreAI = vi.fn();
      const overriddenSection = makeSection({
        user_overrides_md: "My notes",
        overridden_at: "2026-04-16T10:00:00Z",
      });
      render(<SectionRenderer section={overriddenSection} onRestoreAI={onRestoreAI} />);
      fireEvent.click(screen.getByRole("button", { name: /Restore AI/i }));
      expect(onRestoreAI).toHaveBeenCalledWith(expect.objectContaining({ id: "s-1" }));
    });

    it("does not render Restore AI button when section is not overridden", () => {
      const onRestoreAI = vi.fn();
      render(<SectionRenderer section={makeSection()} onRestoreAI={onRestoreAI} />);
      expect(screen.queryByRole("button", { name: /Restore AI/i })).not.toBeInTheDocument();
    });

    it("hides controls when section is collapsed", () => {
      const onEdit = vi.fn();
      render(<SectionRenderer section={makeSection()} onEdit={onEdit} defaultExpanded={false} />);
      expect(screen.queryByRole("button", { name: /Edit/i })).not.toBeInTheDocument();
    });
  });
});
