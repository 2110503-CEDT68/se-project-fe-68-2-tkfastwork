"use client";

import { useState } from "react";
import { CoworkingSpace } from "@/types";
import SpaceCard from "./SpaceCard";
import SearchBar from "./SearchBar";

interface SpacesBrowserProps {
  spaces: CoworkingSpace[];
}

function isCurrentlyOpen(space: CoworkingSpace): boolean {
  if (!space.opentime || !space.closetime) return true; // fail-open

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const currentTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

  return currentTime >= space.opentime && currentTime < space.closetime;
}

export default function SpacesBrowser({ spaces }: SpacesBrowserProps) {
  const [query, setQuery] = useState("");
  const [hideClosedSpaces, setHideClosedSpaces] = useState(false);

  const afterSearch =
    query.trim() === ""
      ? spaces
      : spaces.filter(
          (s) =>
            s.name.toLowerCase().includes(query.toLowerCase()) ||
            (s.address || "").toLowerCase().includes(query.toLowerCase())
        );

  const filtered = hideClosedSpaces
    ? afterSearch.filter(isCurrentlyOpen)
    : afterSearch;

  return (
    <>
      <section className="bg-gradient-to-br from-primary to-primary-dark py-14 px-4 text-center">
        <div className="max-w-lg mx-auto">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Find Your Perfect Workspace
          </h1>
          <p className="text-white/70 mt-3 text-base">
            Browse and book co-working spaces near you
          </p>
          <SearchBar value={query} onChange={setQuery} />

          {/* US1-7: Toggle to hide currently-closed spaces */}
          <div className="mt-4 flex items-center justify-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer select-none text-white/90 text-sm font-medium">
              <input
                type="checkbox"
                checked={hideClosedSpaces}
                onChange={(e) => setHideClosedSpaces(e.target.checked)}
                className="w-4 h-4 rounded accent-white cursor-pointer"
              />
              Show open spaces only
            </label>
          </div>
        </div>
      </section>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {filtered.length === 0 ? (
          <div className="col-span-full text-center py-16 text-gray-500">
            <div className="font-semibold text-gray-900 mb-1.5">
              No spaces found
            </div>
            <div className="text-sm">
              {hideClosedSpaces
                ? 'No spaces are currently open. Try unchecking "Show open spaces only".'
                : "Try a different search term."}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((space) => (
              <SpaceCard key={space._id} space={space} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
