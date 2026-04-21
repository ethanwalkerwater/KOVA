"use client";

/**
 * AlphaIndexSidebar
 *
 * A right-edge alphabet index for fast scrolling through a long contacts list.
 * Renders only the letters that actually appear in the data; tapping a letter
 * calls onLetterPress(letter) so the parent can scroll to the right section.
 *
 * Usage:
 *   <AlphaIndexSidebar letters={availableLetters} onLetterPress={handlePress} />
 *
 * The parent is responsible for maintaining section refs and scrolling.
 */

import { useRef, useCallback } from "react";

interface AlphaIndexSidebarProps {
  /** Letters that exist in the current dataset, e.g. ['A','B','D','M',...] */
  letters: string[];
  /** Called when the user taps or drags to a letter */
  onLetterPress: (letter: string) => void;
  /** Currently visible / highlighted letter (optional) */
  activeLetter?: string;
}

const ALL_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#".split("");

export function AlphaIndexSidebar({
  letters,
  onLetterPress,
  activeLetter,
}: AlphaIndexSidebarProps) {
  const available = new Set(letters);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  // Given a clientY position, determine which letter the finger/cursor is over.
  const letterFromY = useCallback(
    (clientY: number): string | null => {
      const el = containerRef.current;
      if (!el) return null;
      const { top, height } = el.getBoundingClientRect();
      const fraction = Math.max(0, Math.min(1, (clientY - top) / height));
      const index = Math.floor(fraction * ALL_LETTERS.length);
      return ALL_LETTERS[Math.min(index, ALL_LETTERS.length - 1)] ?? null;
    },
    [],
  );

  // Mouse handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      isDragging.current = true;
      const letter = letterFromY(e.clientY);
      if (letter && available.has(letter)) onLetterPress(letter);
      e.preventDefault();
    },
    [letterFromY, available, onLetterPress],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging.current) return;
      const letter = letterFromY(e.clientY);
      if (letter && available.has(letter)) onLetterPress(letter);
    },
    [letterFromY, available, onLetterPress],
  );

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  // Touch handlers (mobile)
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      const letter = letterFromY(touch.clientY);
      if (letter && available.has(letter)) onLetterPress(letter);
      e.preventDefault();
    },
    [letterFromY, available, onLetterPress],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      const letter = letterFromY(touch.clientY);
      if (letter && available.has(letter)) onLetterPress(letter);
      e.preventDefault();
    },
    [letterFromY, available, onLetterPress],
  );

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center justify-between py-2 select-none touch-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleMouseUp}
      style={{ userSelect: "none", WebkitUserSelect: "none" }}
      aria-label="Alphabet index"
      aria-hidden="true"
    >
      {ALL_LETTERS.map((letter) => {
        const isAvailable = available.has(letter);
        const isActive = activeLetter === letter;
        return (
          <span
            key={letter}
            className={`
              text-[10px] font-semibold leading-none py-[1.5px]
              transition-colors duration-75
              ${isActive
                ? "text-accent"
                : isAvailable
                ? "text-fg-secondary"
                : "text-fg-muted opacity-30"
              }
            `}
          >
            {letter}
          </span>
        );
      })}
    </div>
  );
}
