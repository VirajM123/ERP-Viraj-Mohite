import React, { useLayoutEffect } from "react";
import { startVisualLoading } from "./loadingTracker";

export default function ReportLoading({ loading }) {
  useLayoutEffect(() => {
    if (loading) return startVisualLoading({ variant: "report", title: "Generating your report...", message: "This may take a moment." });
  }, [loading]);
  return null;
}
