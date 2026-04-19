"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import LoadingSpinner from "@/components/LoadingSpinner";
import { CoworkingSpaceRequest, User } from "@/types";

export default function AdminRequestsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [requests, setRequests] = useState<CoworkingSpaceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectionReasons, setRejectionReasons] = useState<{ [key: string]: string }>({});

  const fetchAllRequests = useCallback(async () => {
    if (!session?.user?.token || session.user.role !== 'admin') return;

    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/coworkingSpaceRequests/admin/all`, {
        headers: {
          Authorization: `Bearer ${session.user.token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fetch requests");
      
      setRequests(data.data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred while fetching requests");
    } finally {
      setLoading(false);
    }
  }, [session?.user?.token, session?.user?.role]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated" && session.user.role !== 'admin') {
      router.push("/");
      return;
    }
    if (status === "authenticated") {
      fetchAllRequests();
    }
  }, [status, session, router, fetchAllRequests]);

  async function handleReview(id: string, newStatus: "approved" | "rejected") {
    if (!session?.user?.token) return;

    const rejectionReason = rejectionReasons[id];
    if (newStatus === "rejected" && !rejectionReason?.trim()) {
      alert("Please provide a reason for rejection.");
      return;
    }

    const confirmMsg = newStatus === "approved" 
      ? "Are you sure you want to approve this request? A new coworking space will be created."
      : "Are you sure you want to reject this request?";
    
    if (!confirm(confirmMsg)) return;

    setActionLoading(id);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/coworkingSpaceRequests/${id}/review`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.user.token}`,
        },
        body: JSON.stringify({ 
          status: newStatus,
          rejectionReason: newStatus === "rejected" ? rejectionReason : undefined
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `${newStatus} failed`);
      
      if (newStatus === "rejected") {
        setRejectionReasons(prev => {
          const updated = { ...prev };
          delete updated[id];
          return updated;
        });
      }

      await fetchAllRequests();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : `${newStatus} failed`);
    } finally {
      setActionLoading(null);
    }
  }

  if (status === "loading" || (loading && requests.length === 0)) {
    return <LoadingSpinner />;
  }

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const pastRequests = requests.filter(r => r.status !== 'pending');

  return (
    <div className="bg-slate-50 min-h-screen py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Admin — Requests</h1>
            <p className="text-sm text-gray-500 mt-1">
              Review and manage coworking space submissions
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchAllRequests()}
              className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
            >
              Refresh
            </button>
            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-full">
              Admin View
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 border border-red-200 px-4 py-3 rounded text-sm mb-6 shadow-sm">
            {error}
          </div>
        )}

        <section>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            Pending Approval
            <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
              {pendingRequests.length}
            </span>
          </h2>
          {pendingRequests.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-500 shadow-sm">
              No pending requests to show.
            </div>
          ) : (
            <div className="space-y-8">
              {pendingRequests.map((req) => {
                const submitter = req.submitter as User;
                return (
                  <div key={req._id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{req.name}</h3>
                        <p className="text-gray-500 text-sm">
                          Submitted by: <span className="font-semibold">{submitter?.name || "Unknown"}</span> ({submitter?.email || "No email"})
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleReview(req._id, "approved")}
                          disabled={!!actionLoading}
                          className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 shadow-sm"
                        >
                          {actionLoading === req._id ? "Processing..." : "Approve"}
                        </button>
                        <button
                          onClick={() => handleReview(req._id, "rejected")}
                          disabled={!!actionLoading}
                          className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 shadow-sm"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                    
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 bg-white">
                      <div className="space-y-4">
                        <h4 className="text-[0.7rem] font-bold uppercase tracking-widest text-gray-400">Space Details</h4>
                        <div className="space-y-2 text-sm text-gray-700">
                          <p><strong className="text-gray-900">Address:</strong> {req.address}</p>
                          <p><strong className="text-gray-900">Telephone:</strong> {req.tel}</p>
                          <p><strong className="text-gray-900">Hours:</strong> {req.opentime} - {req.closetime}</p>
                          <p>
                            <strong className="text-gray-900">Proof of Ownership:</strong>{" "}
                            <a href={req.proofOfOwnership} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium inline-flex items-center gap-1">
                              View Document
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          </p>
                        </div>
                        <div className="pt-2">
                          <p className="text-[0.7rem] font-bold uppercase tracking-widest text-gray-400 mb-1">Description</p>
                          <p className="text-sm text-gray-600 leading-relaxed italic border-l-2 border-gray-100 pl-3">
                            "{req.description}"
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-[0.7rem] font-bold uppercase tracking-widest text-gray-400">Review Note</h4>
                        <p className="text-xs text-gray-500 italic">Provide a reason if you are rejecting this request. It will be sent via email.</p>
                        <textarea
                          value={rejectionReasons[req._id] || ""}
                          onChange={(e) => setRejectionReasons({ ...rejectionReasons, [req._id]: e.target.value })}
                          placeholder="Why are you rejecting this? (Required for rejections)..."
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm min-h-[120px] focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-16">
          <h2 className="text-xl font-bold mb-6">Recent History</h2>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Space Name</th>
                    <th className="px-6 py-4">Submitter</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Reviewed By</th>
                    <th className="px-6 py-4">Decision Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pastRequests.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No past requests.</td>
                    </tr>
                  ) : (
                    pastRequests.map((req) => {
                      const submitter = req.submitter as User;
                      const reviewer = req.reviewedBy as User;
                      return (
                        <tr key={req._id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-semibold text-gray-900">{req.name}</div>
                            {req.rejectionReason && (
                              <div className="text-[11px] text-red-500 mt-0.5 italic max-w-xs truncate" title={req.rejectionReason}>
                                Reason: {req.rejectionReason}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-gray-600">{submitter?.name || "Unknown"}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                              req.status === 'approved' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
                            }`}>
                              {req.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-600">{reviewer?.name || "N/A"}</td>
                          <td className="px-6 py-4 text-gray-500">
                            {req.reviewedAt ? new Date(req.reviewedAt).toLocaleDateString() : (req.createdAt ? new Date(req.createdAt).toLocaleDateString() : "N/A")}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
