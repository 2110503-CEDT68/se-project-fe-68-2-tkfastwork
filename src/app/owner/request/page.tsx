"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function RequestOwnerPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000";

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    tel: "",
    opentime: "",
    closetime: "",
    description: "",
    proofOfOwnership: "",
    pics: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === "loading") return <LoadingSpinner />;
  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      ...formData,
      pics: formData.pics.split(",").map((p) => p.trim()).filter(Boolean),
    };

    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/coworkingSpaceRequests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.user.token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.errors?.[0] || "Failed to submit request");
      }

      alert("Request submitted successfully!");
      router.push("/owner/status");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-6">Become an Owner</h1>
      <p className="text-gray-600 mb-8">
        Apply to become a space owner by providing details about your co-working space and proof of ownership.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-xl shadow-sm border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Space Name</label>
            <input
              type="text"
              name="name"
              required
              placeholder="e.g. My Awesome Space"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              onChange={handleChange}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Telephone</label>
            <input
              type="tel"
              name="tel"
              required
              pattern="[0-9]{10}"
              placeholder="0812345678"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Address</label>
          <input
            type="text"
            name="address"
            required
            placeholder="123 Street, City, Country"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
            onChange={handleChange}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Open Time (HH:MM)</label>
            <input
              type="text"
              name="opentime"
              required
              pattern="^([01]\d|2[0-3]):[0-5]\d$"
              placeholder="08:00"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              onChange={handleChange}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Close Time (HH:MM)</label>
            <input
              type="text"
              name="closetime"
              required
              pattern="^([01]\d|2[0-3]):[0-5]\d$"
              placeholder="18:00"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Description</label>
          <textarea
            name="description"
            required
            rows={4}
            placeholder="Describe your space (at least 10 words)..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
            onChange={handleChange}
          ></textarea>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Proof of Ownership (URL)</label>
          <input
            type="url"
            name="proofOfOwnership"
            required
            placeholder="https://example.com/proof.pdf"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
            onChange={handleChange}
          />
          <p className="text-xs text-gray-500 italic">Provide a link to a document or image proving you own this space.</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Space Pictures (URLs, comma-separated)</label>
          <input
            type="text"
            name="pics"
            placeholder="https://img1.jpg, https://img2.jpg"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
            onChange={handleChange}
          />
        </div>

        {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-primary text-white font-bold py-3 rounded-lg hover:bg-primary-dark transition-colors disabled:bg-gray-400"
        >
          {submitting ? "Submitting..." : "Submit Request"}
        </button>
      </form>
    </div>
  );
}
