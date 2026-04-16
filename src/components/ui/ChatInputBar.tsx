"use client";

import { useState } from "react";
import { Mic, Camera, Plus, MessageSquare } from "lucide-react";

interface ChatInputBarProps {
  onSend?: (text: string) => void;
  onVoiceStart?: () => void;
  onVoiceEnd?: () => void;
  onCameraPress?: () => void;
  onPlusPress?: () => void;
  placeholder?: string;
}

export function ChatInputBar({
  onSend,
  onVoiceStart,
  onVoiceEnd,
  onCameraPress,
  onPlusPress,
  placeholder = "Ask anything...",
}: ChatInputBarProps) {
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [text, setText] = useState("");

  const handleSubmit = () => {
    if (text.trim()) {
      onSend?.(text.trim());
      setText("");
    }
  };

  return (
    <div className="px-4 pt-3 pb-[21px]">
      <div className="flex items-center gap-2 h-[54px] px-2.5 py-2 bg-surface-primary border border-border rounded-[30px] shadow-[0_1px_6px_#0000000a]">
        {/* Voice/Text toggle */}
        <button
          onClick={() => setIsVoiceMode(!isVoiceMode)}
          className="flex items-center justify-center w-10 h-full rounded-[22px] bg-surface-secondary shrink-0"
          aria-label={isVoiceMode ? "Switch to text" : "Switch to voice"}
        >
          {isVoiceMode ? (
            <MessageSquare className="w-[18px] h-[18px] text-fg-secondary" />
          ) : (
            <Mic className="w-[18px] h-[18px] text-fg-secondary" />
          )}
        </button>

        {/* Input area */}
        {isVoiceMode ? (
          <button
            className="flex-1 flex items-center justify-center h-full rounded-[22px] bg-surface-secondary px-3.5"
            onMouseDown={onVoiceStart}
            onMouseUp={onVoiceEnd}
            onMouseLeave={onVoiceEnd}
            onTouchStart={onVoiceStart}
            onTouchEnd={onVoiceEnd}
            aria-label="Hold to record voice"
          >
            <span className="text-fg-muted text-sm">Hold to talk</span>
          </button>
        ) : (
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder={placeholder}
            className="flex-1 h-full bg-surface-secondary rounded-[22px] px-3.5 text-sm text-fg-primary placeholder:text-fg-muted outline-none"
          />
        )}

        {/* Camera */}
        <button
          onClick={onCameraPress}
          className="flex items-center justify-center w-10 h-full rounded-[22px] shrink-0"
          aria-label="Camera"
        >
          <Camera className="w-[18px] h-[18px] text-fg-secondary" />
        </button>

        {/* Plus */}
        <button
          onClick={onPlusPress}
          className="flex items-center justify-center w-10 h-full rounded-[22px] shrink-0"
          aria-label="More options"
        >
          <Plus className="w-[18px] h-[18px] text-fg-secondary" />
        </button>
      </div>
    </div>
  );
}
