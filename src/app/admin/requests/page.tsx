"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import LoadingSpinner from "@/components/LoadingSpinner";

interface Submitter {
  _id: string;
  name: string;
  email: string;
}

interface RequestData {
  _id: string;
  name: string;
  address: string;
  tel: string;
  opentime: string;
  closetime: string;
  description: string;
  proofOfOwnership: string;
  status: "pending" | "approved" | "rejected";
  submitter: Submitter;
  createdAt: string;
}

export default function AdminRequestsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [requests, setRequests] = useState<RequestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<{ [key: string]: string }>({});

  const fetchAllRequests = useCallback(async () => {
    if (!session?.user?.token || session.user.role !== 'admin') return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/coworkingSpaceRequests`, {
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
  }, [session?.user?.token, session?.user?.role]);

  useEffect(() => {
    if (session && session.user.role !== 'admin') {
      router.push("/");
      return;
    }
    fetchAllRequests();
  }, [session, router, fetchAllRequests]);

  async function handleApprove(id: string) {
    if (!session?.user?.token) return;
    if (!confirm("Are you sure you want to approve this request?")) return;

    setActionLoading(id);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/coworkingSpaceRequests/${id}/approve`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${session.user.token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Approval failed");
      
      await fetchAllRequests();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Approval failed");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(id: string) {
    if (!session?.user?.token) return;
    const reason = rejectionReason[id];
    if (!reason?.trim()) {
      alert("Please provide a reason for rejection.");
      return;
    }

    if (!confirm("Are you sure you want to reject this request?")) return;

    setActionLoading(id);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/coworkingSpaceRequests/${id}/reject`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.user.token}`,
        },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Rejection failed");
      
      await fetchAllRequests();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Rejection failed");
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="bg-slate-50 min-h-screen py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-8">Pending Approval Requests</h1>

        {error && (
          <div className="bg-red-50 text-red-600 border border-red-200 px-4 py-3 rounded text-sm mb-6">
            {error}
          </div>
        )}

        {requests.filter(r => r.status === 'pending').length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-500">
            No pending requests to show.
          </div>
        ) : (
          <div className="space-y-8">
            {requests.filter(r => r.status === 'pending').map((req) => (
              <div key={req._id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold">{req.name}</h2>
                    <p className="text-gray-500 text-sm">Submitted by: {req.submitter.name} ({req.submitter.email})</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleApprove(req._id)}
                      disabled={!!actionLoading}
                      className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                    >
                      {actionLoading === req._id ? "Processing..." : "Approve"}
                    </button>
                    <button
                      onClick={() => handleReject(req._id)}
                      disabled={!!actionLoading}
                      className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
                
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">Space Details</h3>
                    <div className="space-y-2 text-sm">
                      <p><strong>Address:</strong> {req.address}</p>
                      <p><strong>Telephone:</strong> {req.tel}</p>
                      <p><strong>Hours:</strong> {req.opentime} - {req.closetime}</p>
                      <p><strong>Proof:</strong> <a href={req.proofOfOwnership} target="_blank" className="text-primary hover:underline">View Document</a></p>
                    </div>
                    <div className="pt-2">
                      <p className="text-sm font-bold text-gray-700 mb-1">Description:</p>
                      <p className="text-sm text-gray-600 italic">"{req.description}"</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">Decision Reason</h3>
                    <p className="text-xs text-gray-500">Required if rejecting the request.</p>
                    <textarea
                      value={rejectionReason[req._id] || ""}
                      onChange={(e) => setRejectionReason({ ...rejectionReason, [req._id]: e.target.value })}
                      placeholder="Enter reason for approval or rejection..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm min-h-[100px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <h2 className="text-xl font-bold mt-16 mb-6">Recent History</h2>
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-6 py-3">Space Name</th>
                <th className="px-6 py-3">Submitter</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {requests.filter(r => r.status !== 'pending').map((req) => (
                <tr key={req._id}>
                  <td className="px-6 py-4 font-semibold">{req.name}</td>
                  <td className="px-6 py-4">{req.submitter.name}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      req.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {req.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500">{new Date(req.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
