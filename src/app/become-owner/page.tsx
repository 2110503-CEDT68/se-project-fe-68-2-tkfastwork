"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function BecomeOwnerPage() {
  const router = useRouter();
  const { data: session } = useSession();

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [tel, setTel] = useState("");
  const [opentime, setOpentime] = useState("08:00");
  const [closetime, setClosetime] = useState("18:00");
  const [description, setDescription] = useState("");
  const [proofOfOwnership, setProofOfOwnership] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

  function validate(): string | null {
    if (!name.trim() || !/[a-zA-Z]/.test(name)) return "Name is required and must contain at least one alphabet.";
    if (!address.trim() || !/[a-zA-Z]/.test(address)) return "Address is required and must contain at least one alphabet.";
    if (!/^\d{10}$/.test(tel)) return "Telephone must be exactly 10 digits.";
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(opentime)) return "Opening time must be in HH:MM format.";
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(closetime)) return "Closing time must be in HH:MM format.";
    
    if (!description.trim() || !/[a-zA-Z]/.test(description)) return "Description must contain at least one alphabet.";
    const wc = wordCount(description);
    if (wc < 10 || wc > 1000) return `Description must be between 10 and 1000 words (got ${wc}).`;
    
    if (!proofOfOwnership.trim()) return "Proof of ownership is required.";
    try {
      new URL(proofOfOwnership);
    } catch {
      return "Proof of ownership must be a valid URL.";
    }

    return null;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!session?.user?.token) {
      setError("You must be logged in to submit a request.");
      return;
    }

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/coworkingSpaceRequests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.user.token}`,
        },
        body: JSON.stringify({
          name,
          address,
          tel,
          opentime,
          closetime,
          description,
          proofOfOwnership,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to submit request");

      setSuccess("Your request has been submitted successfully! Redirecting to your requests...");
      setTimeout(() => {
        router.push("/my-requests");
      }, 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setLoading(false);
    }
  }

  const isValid = !validate();

  return (
    <div className="bg-slate-50 text-gray-900 min-h-screen py-12 px-6">
      <div className="max-w-2xl mx-auto bg-white border border-gray-200 rounded-xl shadow-sm p-8">
        <h1 className="text-2xl font-bold mb-2">Register your Co-working Space</h1>
        <p className="text-gray-500 mb-8">Submit a request to list your space on CoWork and become an owner.</p>

        {error && (
          <div className="bg-red-50 text-red-600 border border-red-200 px-4 py-3 rounded text-sm font-medium mb-6">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 text-green-700 border border-green-200 px-4 py-3 rounded text-sm font-medium mb-6">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700">Space Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="px-3.5 py-2.5 border border-gray-200 rounded text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                placeholder="e.g. The Creative Hub"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700">Telephone</label>
              <input
                type="tel"
                value={tel}
                onChange={(e) => setTel(e.target.value)}
                className="px-3.5 py-2.5 border border-gray-200 rounded text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                placeholder="10 digits number"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-700">Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="px-3.5 py-2.5 border border-gray-200 rounded text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
              placeholder="Full address of your space"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700">Opening Time</label>
              <input
                type="time"
                value={opentime}
                onChange={(e) => setOpentime(e.target.value)}
                className="px-3.5 py-2.5 border border-gray-200 rounded text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700">Closing Time</label>
              <input
                type="time"
                value={closetime}
                onChange={(e) => setClosetime(e.target.value)}
                className="px-3.5 py-2.5 border border-gray-200 rounded text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-700">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="px-3.5 py-2.5 border border-gray-200 rounded text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 min-h-[150px]"
              placeholder="Describe your space (min 10 words, max 1000 words)..."
              required
            />
            <p className={`text-xs ${wordCount(description) < 10 || wordCount(description) > 1000 ? 'text-red-500' : 'text-gray-400'}`}>
              Word count: {wordCount(description)}
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-700">Proof of Ownership URL</label>
            <input
              type="url"
              value={proofOfOwnership}
              onChange={(e) => setProofOfOwnership(e.target.value)}
              className="px-3.5 py-2.5 border border-gray-200 rounded text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
              placeholder="https://example.com/proof.pdf"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !isValid}
            className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-4"
          >
            {loading ? "Submitting..." : "Submit Request"}
          </button>
        </form>
      </div>
    </div>
  );
}
