import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Avatar } from "./Avatar";

describe("Avatar", () => {
  describe("empty name guard", () => {
    it("renders '?' initials for empty string", () => {
      render(<Avatar name="" />);
      expect(screen.getByText("?")).toBeInTheDocument();
    });

    it("renders '?' initials for whitespace-only string", () => {
      render(<Avatar name="   " />);
      expect(screen.getByText("?")).toBeInTheDocument();
    });
  });

  describe("initials extraction", () => {
    it("extracts single initial for single-word name", () => {
      render(<Avatar name="Alice" />);
      expect(screen.getByText("A")).toBeInTheDocument();
    });

    it("extracts first + last initials for two-word name", () => {
      render(<Avatar name="Lisa Chen" />);
      expect(screen.getByText("LC")).toBeInTheDocument();
    });

    it("uses first and last word only for 3+ word name", () => {
      render(<Avatar name="James Wei Lin" />);
      expect(screen.getByText("JL")).toBeInTheDocument();
    });

    it("returns uppercase initials", () => {
      render(<Avatar name="john doe" />);
      expect(screen.getByText("JD")).toBeInTheDocument();
    });
  });

  describe("color stability", () => {
    it("same name always produces the same aria-label", () => {
      const { rerender } = render(<Avatar name="Marcus Johnson" />);
      const el1 = screen.getByLabelText("Marcus Johnson");
      rerender(<Avatar name="Marcus Johnson" />);
      const el2 = screen.getByLabelText("Marcus Johnson");
      // same DOM element = same color (deterministic)
      expect(el1.className).toBe(el2.className);
    });

    it("different names produce different colors (for common cases)", () => {
      const { rerender } = render(<Avatar name="Alice" />);
      const alice = screen.getByLabelText("Alice").className;
      rerender(<Avatar name="David" />);
      const david = screen.getByLabelText("David").className;
      // 'A' charCode 65 % 6 = 5, 'D' charCode 68 % 6 = 2 → different
      expect(alice).not.toBe(david);
    });
  });

  describe("size prop", () => {
    it("renders sm size with correct classes", () => {
      render(<Avatar name="Test" size="sm" />);
      expect(screen.getByLabelText("Test").className).toContain("w-8");
    });

    it("renders lg size with correct classes", () => {
      render(<Avatar name="Test" size="lg" />);
      expect(screen.getByLabelText("Test").className).toContain("w-14");
    });
  });
});
