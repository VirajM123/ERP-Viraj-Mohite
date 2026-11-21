import React, { useLayoutEffect } from "react";
import { startVisualLoading } from "./loadingTracker";

export default function ScreenLoading({ title, message, variant = "module" }) {
  useLayoutEffect(() => startVisualLoading({ title, message, variant }), [title, message, variant]);
  return null;
}
