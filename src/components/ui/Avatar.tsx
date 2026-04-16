import { cn } from "@/lib/utils/cn";

const COLOR_CLASSES = [
  "bg-accent",
  "bg-accent-green",
  "bg-accent-orange",
  "bg-purple-500",
  "bg-pink-500",
  "bg-teal-500",
];

function getColorClass(name: string): string {
  return COLOR_CLASSES[name.charCodeAt(0) % COLOR_CLASSES.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 1).toUpperCase();
}

const SIZE_CLASSES = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-14 h-14 text-lg",
};

interface AvatarProps {
  name: string;
  size?: keyof typeof SIZE_CLASSES;
  imageUrl?: string | null;
  className?: string;
}

export function Avatar({ name, size = "md", imageUrl, className }: AvatarProps) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className={cn(SIZE_CLASSES[size], "rounded-full object-cover shrink-0", className)}
      />
    );
  }

  return (
    <div
      className={cn(
        SIZE_CLASSES[size],
        getColorClass(name),
        "rounded-full flex items-center justify-center text-white font-semibold shrink-0",
        className
      )}
      aria-label={name}
    >
      {getInitials(name)}
    </div>
  );
}
