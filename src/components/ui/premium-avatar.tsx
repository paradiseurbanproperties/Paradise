import type { ReactNode } from "react";

type PremiumAvatarProps = {
  label: string;
  children: ReactNode;
  premium?: boolean;
  size?: "small" | "medium" | "large";
};

export function PremiumAvatar({
  children,
  label,
  premium = false,
  size = "medium",
}: PremiumAvatarProps) {
  return (
    <span
      aria-label={label}
      className={`avatar-frame avatar-frame--${size}${premium ? " avatar-frame--premium" : ""}`}
      role="img"
    >
      <span aria-hidden="true" className="avatar-frame__content">
        {children}
      </span>
    </span>
  );
}
