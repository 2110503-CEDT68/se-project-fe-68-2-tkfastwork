"use client";

import { useState, useEffect, useMemo } from "react";
import { CoworkingSpace, Room } from "@/types";
import SpaceCard from "./SpaceCard";
import SearchBar from "./SearchBar";

interface SpacesBrowserProps {
  spaces: CoworkingSpace[];
}

export default function SpacesBrowser({ spaces }: SpacesBrowserProps) {
  const [query, setQuery] = useState("");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);

  useEffect(() => {
    async function fetchAllRooms() {
      setLoadingRooms(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/rooms?select=facilities,coworkingSpace`);
        const data = await res.json();
        if (data.success) {
          setRooms(data.data);
        }
      } catch (err) {
        console.error("Failed to fetch rooms for filtering", err);
      } finally {
        setLoadingRooms(false);
      }
    }
    fetchAllRooms();
  }, []);

  const allFacilities = useMemo(() => {
    const facilities = new Set<string>();
    rooms.forEach(r => r.facilities?.forEach(f => facilities.add(f)));
    return Array.from(facilities).sort();
  }, [rooms]);

  const toggleFacility = (facility: string) => {
    setSelectedFacilities(prev =>
      prev.includes(facility) ? prev.filter(f => f !== facility) : [...prev, facility]
    );
  };

  const filtered = useMemo(() => {
    let result = spaces;

    if (query.trim() !== "") {
      const q = query.toLowerCase();
      result = result.filter(s => s.name.toLowerCase().includes(q) || (s.address || "").toLowerCase().includes(q));
    }

    if (selectedFacilities.length > 0) {
      result = result.filter(space => {
        const spaceRooms = rooms.filter(r => {
          const sid = r.coworkingSpace && typeof r.coworkingSpace === 'object' 
            ? (r.coworkingSpace as any)._id || (r.coworkingSpace as any).id
            : r.coworkingSpace;
          return sid === space._id;
        });
        return spaceRooms.some(room => selectedFacilities.every(f => room.facilities?.includes(f)));
      });
    }

    return result;
  }, [spaces, query, rooms, selectedFacilities]);

  return (
    <>
      <section className="bg-gradient-to-br from-primary to-primary-dark py-14 px-4 text-center">
        <div className="max-w-lg mx-auto">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">Find Your Perfect Workspace</h1>
          <p className="text-white/70 mt-3 text-base">Browse and book co-working spaces near you</p>
          <SearchBar value={query} onChange={setQuery} />
        </div>
      </section>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {allFacilities.length > 0 && (
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Filter by Room Facilities:</h3>
            <div className="flex flex-wrap gap-2">
              {allFacilities.map(f => (
                <button
                  key={f}
                  onClick={() => toggleFacility(f)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    selectedFacilities.includes(f) ? "bg-primary text-white border-primary" : "bg-white text-gray-600 border-gray-200 hover:border-primary hover:text-primary"
                  }`}
                >
                  {f}
                </button>
              ))}
              {selectedFacilities.length > 0 && (
                <button onClick={() => setSelectedFacilities([])} className="px-3 py-1.5 rounded-full text-xs font-medium text-red-600 hover:bg-red-50 transition-colors">
                  Clear all
                </button>
              )}
            </div>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="col-span-full text-center py-16 text-gray-500">
            <div className="font-semibold text-gray-900 mb-1.5">No spaces found</div>
            <div className="text-sm">Try a different search term or filters.</div>
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