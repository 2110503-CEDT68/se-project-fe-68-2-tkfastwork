"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import LoadingSpinner from "@/components/LoadingSpinner";
import { CoworkingSpaceRequest } from "@/types";

export default function RequestStatusPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000";

  const [requests, setRequests] = useState<CoworkingSpaceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchRequests();
    }
  }, [status]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${BACKEND_URL}/api/v1/coworkingSpaceRequests/mine`,
        {
          headers: {
            Authorization: `Bearer ${session?.user.token}`,
          },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to fetch requests");
      }

      setRequests(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loading) return <LoadingSpinner />;
  if (error) return <div className="text-center py-20 text-red-500">{error}</div>;

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Requests</h1>
        <button
          onClick={() => router.push("/owner/request")}
          className="bg-primary text-white px-4 py-2 rounded-lg font-semibold hover:bg-primary-dark transition-colors"
        >
          New Request
        </button>
      </div>

      {requests.length === 0 ? (
        <div className="bg-white p-10 rounded-xl shadow-sm border border-gray-100 text-center">
          <p className="text-gray-500 mb-4">You haven't submitted any requests yet.</p>
          <button
            onClick={() => router.push("/owner/request")}
            className="text-primary font-bold hover:underline"
          >
            Submit your first request
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <div
              key={request._id}
              className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div>
                <h3 className="text-xl font-bold text-gray-800">{request.name}</h3>
                <p className="text-gray-500 text-sm">{request.address}</p>
                <p className="text-gray-400 text-xs mt-1">
                  Submitted on {new Date(request.createdAt).toLocaleDateString()}
                </p>
              </div>

              <div className="flex items-center gap-4">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                    request.status === "approved"
                      ? "bg-green-100 text-green-700"
                      : request.status === "rejected"
                      ? "bg-red-100 text-red-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {request.status}
                </span>

                {request.status === "rejected" && request.rejectionReason && (
                  <div className="group relative">
                    <span className="cursor-help text-gray-400 border border-gray-400 rounded-full w-5 h-5 flex items-center justify-center text-xs">
                      ?
                    </span>
                    <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block w-48 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-10">
                      Reason: {request.rejectionReason}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
