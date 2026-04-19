"use client";

import { useState } from "react";

interface VisibilityToggleProps {
  spaceId: string;
  initialVisible: boolean;
  token: string;
  onToggle?: (newVisible: boolean) => void;
}

export default function VisibilityToggle({ spaceId, initialVisible, token, onToggle }: VisibilityToggleProps) {
  const [isVisible, setIsVisible] = useState(initialVisible);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleToggle() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/coworkingSpaces/${spaceId}/visibility`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update visibility");
      setIsVisible(data.data.isVisible);
      onToggle?.(data.data.isVisible);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1 shrink-0">
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors disabled:opacity-50 ${
          isVisible
            ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
            : "bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200"
        }`}
      >
        {/* Simple circle indicator */}
        <span className={`w-2 h-2 rounded-full ${isVisible ? "bg-green-500" : "bg-gray-400"}`} />
        {loading ? "Saving…" : isVisible ? "Visible" : "Hidden"}
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
