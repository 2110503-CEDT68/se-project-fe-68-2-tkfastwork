"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import LoadingSpinner from "@/components/LoadingSpinner";

interface RequestData {
  _id: string;
  name: string;
  address: string;
  status: "pending" | "approved" | "rejected";
  rejectionReason?: string;
  createdAt: string;
}

export default function MyRequestsPage() {
  const { data: session } = useSession();
  const [requests, setRequests] = useState<RequestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchRequests = useCallback(async () => {
    if (!session?.user?.token) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/coworkingSpaceRequests/mine`, {
        headers: {
          Authorization: `Bearer ${session.user.token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fetch requests");
      setRequests(data.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [session?.user?.token]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="bg-slate-50 min-h-screen py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-8">My Co-working Space Requests</h1>

        {error && (
          <div className="bg-red-50 text-red-600 border border-red-200 px-4 py-3 rounded text-sm mb-6">
            {error}
          </div>
        )}

        {requests.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <p className="text-gray-500 mb-4">You haven't submitted any requests yet.</p>
            <a href="/become-owner" className="text-primary font-semibold hover:underline">
              Submit your first request
            </a>
          </div>
        ) : (
          <div className="grid gap-6">
            {requests.map((req) => (
              <div key={req._id} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-bold">{req.name}</h2>
                    <p className="text-gray-500 text-sm">{req.address}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                    req.status === 'approved' ? 'bg-green-100 text-green-700' :
                    req.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {req.status}
                  </span>
                </div>
                
                <div className="text-sm text-gray-500 mb-2">
                  Submitted on {new Date(req.createdAt).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </div>

                {req.status === 'rejected' && req.rejectionReason && (
                  <div className="mt-4 p-4 bg-red-50 border-l-4 border-red-400 text-red-700 text-sm">
                    <strong>Rejection Reason:</strong> {req.rejectionReason}
                  </div>
                )}
                
                {req.status === 'approved' && (
                  <div className="mt-4 p-4 bg-green-50 border-l-4 border-green-400 text-green-700 text-sm">
                    Your request has been approved! You are now an owner.
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
