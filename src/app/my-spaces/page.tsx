"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { CoworkingSpace, Room } from "@/types";
import EditSpaceModal from "@/components/EditSpaceModal";
import VisibilityToggle from "@/components/VisibilityToggle";
import RoomsModal from "@/components/RoomsModal";

export default function MySpacesPage() {
  const { data: session } = useSession();
  const [spaces, setSpaces] = useState<CoworkingSpace[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [error, setError] = useState("");
  const [editingSpace, setEditingSpace] = useState<CoworkingSpace | null>(null);
  const [roomsSpaceId, setRoomsSpaceId] = useState<string | null>(null);
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);

  const fetchSpaces = useCallback(async () => {
    if (!session?.user?.token) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/coworkingSpaces/owner/mine`, {
        headers: {
          Authorization: `Bearer ${session.user.token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fetch spaces");
      setSpaces(data.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [session?.user?.token]);

  const fetchRooms = useCallback(async () => {
    setLoadingRooms(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/rooms`);
      const data = await res.json();
      if (data.success) {
        setRooms(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch rooms", err);
    } finally {
      setLoadingRooms(false);
    }
  }, []);

  useEffect(() => {
    fetchSpaces();
    fetchRooms();
  }, [fetchSpaces, fetchRooms]);

  const allFacilities = useMemo(() => {
    const facilities = new Set<string>();
    rooms.forEach(r => r.facilities?.forEach(f => facilities.add(f)));
    return Array.from(facilities).sort();
  }, [rooms]);

  const toggleFacility = (facility: string) => {
    setSelectedFacilities(prev =>
      prev.includes(facility)
        ? prev.filter(f => f !== facility)
        : [...prev, facility]
    );
  };

  const filteredSpaces = useMemo(() => {
    if (selectedFacilities.length === 0) return spaces;
    
    return spaces.filter(space => {
      const spaceRooms = rooms.filter(r => {
        const sid = r.coworkingSpace && typeof r.coworkingSpace === 'object' 
          ? (r.coworkingSpace as any)._id || (r.coworkingSpace as any).id
          : r.coworkingSpace;
        return sid === space._id;
      });
      
      return spaceRooms.some(room => 
        selectedFacilities.every(f => room.facilities?.includes(f))
      );
    });
  }, [spaces, rooms, selectedFacilities]);

  const handleEdit = (space: CoworkingSpace) => {
    setEditingSpace(space);
  };

  const handleCloseEdit = () => {
    setEditingSpace(null);
  };

    const handleUpdated = () => {
    setEditingSpace(null);
    fetchSpaces();
  };

  const handleVisibilityToggle = (spaceId: string, newVisible: boolean) => {
    setSpaces(prev => prev.map(space => 
      space._id === spaceId ? { ...space, isVisible: newVisible } : space
    ));
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="bg-slate-50 min-h-screen py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-8">
          <h1 className="text-2xl font-bold">My Co-working Spaces</h1>
          <a
            href="/become-owner"
            className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
          >
            + Add New Space
          </a>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 border border-red-200 px-4 py-3 rounded text-sm mb-6">
            {error}
          </div>
        )}

        {/* Facilities Filter UI */}
        {allFacilities.length > 0 && (
          <div className="mb-8 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 text-center sm:text-left">Filter your spaces by room facilities:</h3>
            <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
              {allFacilities.map(f => (
                <button
                  key={f}
                  onClick={() => toggleFacility(f)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    selectedFacilities.includes(f)
                      ? "bg-primary text-white border-primary"
                      : "bg-white text-gray-600 border-gray-200 hover:border-primary hover:text-primary"
                  }`}
                >
                  {f}
                </button>
              ))}
              {selectedFacilities.length > 0 && (
                <button
                  onClick={() => setSelectedFacilities([])}
                  className="px-3 py-1.5 rounded-full text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>
        )}

        {filteredSpaces.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <p className="text-gray-500 mb-4">
              {spaces.length === 0 
                ? "You don't have any spaces yet." 
                : "No spaces match your selected filters."}
            </p>
            {spaces.length === 0 && (
              <a href="/become-owner" className="text-primary font-semibold hover:underline">
                Submit a request to become an owner
              </a>
            )}
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredSpaces.map((space) => (
              <div key={space._id} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-bold">{space.name}</h2>
                    <p className="text-gray-500 text-sm">{space.address}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <VisibilityToggle
                      spaceId={space._id}
                      initialVisible={space.isVisible !== false}
                      token={session?.user?.token ?? ""}
                      onToggle={(newVisible) => handleVisibilityToggle(space._id, newVisible)}
                    />
                    <button
                      onClick={() => handleEdit(space)}
                      className="bg-primary text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-primary-dark transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setRoomsSpaceId(space._id)}
                      className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      Rooms
                    </button>
                    <a
                      href={`/my-spaces/${space._id}/dashboard`}
                      className="bg-teal-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-teal-700 transition-colors"
                    >
                      Dashboard
                    </a>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-semibold text-gray-900">Telephone:</span>
                    <span className="text-gray-500 ml-2">{space.tel}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-900">Hours:</span>
                    <span className="text-gray-500 ml-2">{space.opentime} – {space.closetime}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {editingSpace && (
          <EditSpaceModal
            space={editingSpace}
            isOpen={true}
            onClose={handleCloseEdit}
            onUpdated={handleUpdated}
          />
        )}

        {roomsSpaceId && (
          <RoomsModal
            spaceId={roomsSpaceId}
            spaceName={spaces.find(s => s._id === roomsSpaceId)?.name || "Space"}
            isOpen={true}
            onClose={() => setRoomsSpaceId(null)}
            token={session?.user?.token ?? ""}
          />
        )}
      </div>
    </div>
  );
}