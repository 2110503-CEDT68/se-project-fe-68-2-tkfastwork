"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Room } from "@/types";

interface RoomsModalProps {
  spaceId: string;
  spaceName: string;
  isOpen: boolean;
  onClose: () => void;
  token: string;
}

export default function RoomsModal({ spaceId, spaceName, isOpen, onClose, token }: RoomsModalProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    capacity: "",
    roomType: "meeting",
    facilities: "",
  });

  const fetchRooms = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/coworkingSpaces/${spaceId}/rooms`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fetch rooms");
      setRooms(data.data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [spaceId, token]);

  useEffect(() => {
    if (isOpen) {
      fetchRooms();
      setFormData({ name: "", description: "", capacity: "", roomType: "meeting", facilities: "" });
      setEditingRoom(null);
    }
  }, [isOpen, fetchRooms]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({ name: "", description: "", capacity: "", roomType: "meeting", facilities: "" });
    setEditingRoom(null);
  };

  const handleEdit = (room: Room) => {
    setEditingRoom(room);
    setFormData({
      name: room.name,
      description: room.description || "",
      capacity: String(room.capacity),
      roomType: room.roomType || "meeting",
      facilities: (room.facilities || []).join(", "),
    });
  };

  const validate = () => {
    if (!formData.name.trim()) return "Room name is required";
    if (!/^\d+$/.test(formData.capacity) || parseInt(formData.capacity) < 1) {
      return "Capacity must be a positive number";
    }
    if (!["meeting", "private office", "phone booth"].includes(formData.roomType)) {
      return "Invalid room type";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: formData.name,
        description: formData.description || undefined,
        capacity: parseInt(formData.capacity),
        roomType: formData.roomType,
        facilities: formData.facilities.split(",").map(f => f.trim()).filter(f => f !== ""),
      };

      const url = editingRoom
        ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/rooms/${editingRoom._id}`
        : `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/coworkingSpaces/${spaceId}/rooms`;

      const method = editingRoom ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save room");

      resetForm();
      await fetchRooms();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save room");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (roomId: string) => {
    if (!confirm("Are you sure you want to delete this room? All associated reservations will be cancelled.")) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/rooms/${roomId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to delete room");

      await fetchRooms();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete room");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Manage Rooms</h2>
            <button
              onClick={onClose}
              disabled={loading}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none disabled:opacity-50"
            >
              ×
            </button>
          </div>

          <p className="text-sm text-gray-600 mb-4">Space: <strong>{spaceName}</strong></p>

          {error && (
            <div className="bg-red-50 text-red-600 border border-red-200 px-4 py-3 rounded text-sm mb-4">
              {error}
            </div>
          )}

          {/* Create/Edit Form */}
          <form onSubmit={handleSubmit} className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-sm mb-3 text-gray-900">
              {editingRoom ? "Edit Room" : "Create New Room"}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Room Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g., Meeting Room A"
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Optional description"
                  rows={2}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Capacity *
                </label>
                <input
                  type="number"
                  name="capacity"
                  value={formData.capacity}
                  onChange={handleChange}
                  placeholder="e.g., 10"
                  min="1"
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Room Type *
                </label>
                <select
                  name="roomType"
                  value={formData.roomType}
                  onChange={handleChange}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                >
                  <option value="meeting">Meeting</option>
                  <option value="private office">Private Office</option>
                  <option value="phone booth">Phone Booth</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Facilities (comma-separated)
                </label>
                <input
                  type="text"
                  name="facilities"
                  value={formData.facilities}
                  onChange={handleChange}
                  placeholder="e.g., WiFi, Projector, Whiteboard"
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-4 pt-3 border-t border-gray-200">
              {editingRoom && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-3 py-1.5 text-xs border border-gray-300 text-gray-700 rounded hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className={`${editingRoom ? "flex-1" : "w-full"} px-3 py-1.5 text-xs bg-primary text-white rounded hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading ? "Saving..." : editingRoom ? "Update" : "Create"}
              </button>
            </div>
          </form>

          {/* Rooms List */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="font-semibold text-sm mb-3 text-gray-900">Rooms ({rooms.length})</h3>

            {rooms.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-4">No rooms yet</p>
            ) : (
              <div className="space-y-2">
                {rooms.map((room) => (
                  <div key={room._id} className="bg-gray-50 border border-gray-200 rounded p-3">
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex-1">
                        <p className="font-semibold text-sm text-gray-900">{room.name}</p>
                        {room.description && (
                          <p className="text-xs text-gray-600">{room.description}</p>
                        )}
                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                          <p className="text-xs text-gray-500">Capacity: {room.capacity}</p>
                          <p className="text-xs text-gray-500 italic">Type: {room.roomType}</p>
                        </div>
                        {room.facilities && room.facilities.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {room.facilities.map((f, i) => (
                              <span key={i} className="text-[10px] bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded">
                                {f}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 ml-2">
                        <button
                          onClick={() => handleEdit(room)}
                          disabled={loading}
                          className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors disabled:opacity-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(room._id)}
                          disabled={loading}
                          className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200 transition-colors disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}