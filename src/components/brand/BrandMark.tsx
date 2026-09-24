import clsx from "clsx";
import { useTheme } from "../../hooks/useTheme";

/**
 * The Memora M-book + sparkle mark. Uses the blue icon in light mode and the
 * navy icon in dark mode. Decorative by default (the wordmark sits beside it);
 * pass `label` when it stands alone.
 */
export function BrandMark({
  size = 32,
  className,
  label,
}: {
  size?: number;
  className?: string;
  label?: string;
}) {
  const { theme } = useTheme();
  const src = theme === "light" ? "/branding/icon-light.svg" : "/branding/icon-dark.svg";
  return (
    <img
      src={src}
      width={size}
      height={size}
      alt={label ?? ""}
      aria-hidden={label ? undefined : true}
      draggable={false}
      className={clsx("flex-shrink-0 select-none", className)}
      style={{ width: size, height: size, borderRadius: size * 0.22 }}
    />
  );
}
