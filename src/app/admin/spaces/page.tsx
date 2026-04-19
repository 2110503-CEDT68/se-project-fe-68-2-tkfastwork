"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import LoadingSpinner from "@/components/LoadingSpinner";
import { CoworkingSpace, User } from "@/types";
import EditSpaceModal from "@/components/EditSpaceModal";
import VisibilityToggle from "@/components/VisibilityToggle";
import RoomsModal from "@/components/RoomsModal";

interface SpaceWithOwner extends CoworkingSpace {
  ownerInfo?: User;
}

export default function AdminSpacesPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [spaces, setSpaces] = useState<SpaceWithOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingSpace, setEditingSpace] = useState<SpaceWithOwner | null>(null);
  const [roomsSpaceId, setRoomsSpaceId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterVisible, setFilterVisible] = useState<"all" | "visible" | "hidden">("all");

  const fetchSpaces = useCallback(async () => {
    if (!session?.user?.token) return;

    // Redirect if not admin
    if (session?.user?.role !== "admin") {
      router.push("/");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/coworkingSpaces?showAll=true&limit=100`,
        {
          headers: {
            Authorization: `Bearer ${session.user.token}`,
          },
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fetch spaces");
      setSpaces(data.data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [session?.user?.token, session?.user?.role, router]);

  useEffect(() => {
    fetchSpaces();
  }, [fetchSpaces]);

  const handleEdit = (space: SpaceWithOwner) => {
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
    setSpaces(prev =>
      prev.map(space =>
        space._id === spaceId ? { ...space, isVisible: newVisible } : space
      )
    );
  };

  const filteredSpaces = spaces.filter((space) => {
    const matchesSearch =
      space.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      space.address.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter =
      filterVisible === "all" ||
      (filterVisible === "visible" && space.isVisible !== false) ||
      (filterVisible === "hidden" && space.isVisible === false);

    return matchesSearch && matchesFilter;
  });

  if (loading) return <LoadingSpinner />;

  return (
    <div className="bg-slate-50 min-h-screen py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-8">All Co-working Spaces</h1>

        {error && (
          <div className="bg-red-50 text-red-600 border border-red-200 px-4 py-3 rounded text-sm mb-6">
            {error}
          </div>
        )}

        {/* Search & Filter Bar */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <input
                type="text"
                placeholder="Search by name or address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilterVisible("all")}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterVisible === "all"
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                All ({spaces.length})
              </button>
              <button
                onClick={() => setFilterVisible("visible")}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterVisible === "visible"
                    ? "bg-green-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Visible
              </button>
              <button
                onClick={() => setFilterVisible("hidden")}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterVisible === "hidden"
                    ? "bg-amber-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Hidden
              </button>
            </div>
          </div>
        </div>

        {filteredSpaces.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <p className="text-gray-500 mb-4">
              {searchTerm || filterVisible !== "all"
                ? "No spaces match your filters."
                : "No spaces found."}
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredSpaces.map((space) => (
              <div
                key={space._id}
                className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-gray-900">{space.name}</h2>
                    <p className="text-gray-500 text-sm">{space.address}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <VisibilityToggle
                      spaceId={space._id}
                      initialVisible={space.isVisible !== false}
                      token={session?.user?.token ?? ""}
                      onToggle={(newVisible) =>
                        handleVisibilityToggle(space._id, newVisible)
                      }
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
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-semibold text-gray-900">Telephone:</span>
                    <span className="text-gray-500 ml-2">{space.tel}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-900">Hours:</span>
                    <span className="text-gray-500 ml-2">
                      {space.opentime} – {space.closetime}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-900">Owner:</span>
                    <span className="text-gray-500 ml-2">
                      {typeof space.owner === "string" ? space.owner : "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-900">Status:</span>
                    <span
                      className={`ml-2 px-2 py-1 rounded text-xs font-bold ${
                        space.isVisible !== false
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {space.isVisible !== false ? "Visible" : "Hidden"}
                    </span>
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
            spaceName={filteredSpaces.find((s) => s._id === roomsSpaceId)?.name || "Space"}
            isOpen={true}
            onClose={() => setRoomsSpaceId(null)}
            token={session?.user?.token ?? ""}
          />
        )}
      </div>
    </div>
  );
}
