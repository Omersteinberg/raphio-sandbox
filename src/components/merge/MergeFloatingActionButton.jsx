import React from "react";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";

export default function MergeFloatingActionButton({
  size = 40,
  icon,
  padding = 8,
  className,
  ...props
}) {
  const sizePx = typeof size === "number" ? size : parseInt(size, 10);
  const paddingPx = typeof padding === "number" ? padding : parseInt(padding, 10);
  const iconSize = sizePx - paddingPx * 2;
  const iconSizePx = `${iconSize}px`;
  const buttonSizePx = `${sizePx}px`;

  const iconWithSize = React.isValidElement(icon)
    ? React.cloneElement(icon, {
        style: { width: iconSizePx, height: iconSizePx },
      })
    : icon;

  return (
    <Button
      className={cn("rounded-full flex items-center justify-center", className)}
      style={{ width: buttonSizePx, height: buttonSizePx, padding: `${paddingPx}px` }}
      {...props}
    >
      {iconWithSize}
    </Button>
  );
}
