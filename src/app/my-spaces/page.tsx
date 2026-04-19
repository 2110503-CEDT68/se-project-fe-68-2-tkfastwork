"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { CoworkingSpace } from "@/types";
import EditSpaceModal from "@/components/EditSpaceModal";
import VisibilityToggle from "@/components/VisibilityToggle";

export default function MySpacesPage() {
  const { data: session } = useSession();
  const [spaces, setSpaces] = useState<CoworkingSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingSpace, setEditingSpace] = useState<CoworkingSpace | null>(null);

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

  useEffect(() => {
    fetchSpaces();
  }, [fetchSpaces]);

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
        <h1 className="text-2xl font-bold mb-8">My Co-working Spaces</h1>

        {error && (
          <div className="bg-red-50 text-red-600 border border-red-200 px-4 py-3 rounded text-sm mb-6">
            {error}
          </div>
        )}

        {spaces.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <p className="text-gray-500 mb-4">You don't have any spaces yet.</p>
            <a href="/become-owner" className="text-primary font-semibold hover:underline">
              Submit a request to become an owner
            </a>
          </div>
        ) : (
          <div className="grid gap-6">
            {spaces.map((space) => (
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
      </div>
    </div>
  );
}