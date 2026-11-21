import React, { useLayoutEffect } from "react";
import { startVisualLoading } from "./loadingTracker";

export default function VisualActivity({ active, title, message, variant }) {
  useLayoutEffect(() => {
    if (active) return startVisualLoading({ title, message, variant }, 1000);
  }, [active, title, message, variant]);
  return null;
}
