import Link from "next/link";
import { notFound } from "next/navigation";
import { CoworkingSpace, ApiResponse } from "@/types";
import BookingForm from "@/components/BookingForm";
import { getServerSession } from "@/libs/getServerSession";
import VisibilityToggle from "@/components/VisibilityToggle";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000";

async function getSpace(id: string, token?: string): Promise<CoworkingSpace | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/coworkingSpaces/${id}`, {
      cache: "no-store",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return null;
    const json: ApiResponse<CoworkingSpace> = await res.json();
    return json.data || null;
  } catch {
    return null;
  }
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5 py-2.5 border-b border-gray-100 last:border-0 text-sm">
      <span className="font-semibold text-gray-900 uppercase text-[0.8rem] tracking-wide min-w-[90px] shrink-0 pt-px">
        {label}
      </span>
      <span className="text-gray-500">{value}</span>
    </div>
  );
}

interface SpacePageProps {
  params: Promise<{ id: string }>;
}

export default async function SpacePage({ params }: SpacePageProps) {
  const { id } = await params;
  const session = await getServerSession();
  const space = await getSpace(id, session?.user?.token);

  if (!space) {
    notFound();
  }

  const isAdmin = session?.user?.role === "admin";
  const isOwner = session?.user?.id === space.owner;
  const canManage = isAdmin || isOwner;

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900">
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3.5">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-gray-500 hover:text-primary text-sm font-medium transition-colors"
          >
            ← Back
          </Link>
          <span className="text-gray-200 text-lg">|</span>
          <span className="font-bold text-gray-900 text-sm">{space.name}</span>

          {canManage && space.isVisible === false && (
            <span className="ml-auto text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full">
              Hidden from public
            </span>
          )}
        </div>
      </div>

      <div className="max-w-[680px] mx-auto px-4 sm:px-6 py-8 flex flex-col gap-5">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="font-bold text-[1.1rem] text-gray-900">
              {space.name}
            </div>
            {canManage && (
              <VisibilityToggle
                spaceId={space._id}
                initialVisible={space.isVisible !== false}
                token={session?.user?.token ?? ""}
              />
            )}
          </div>
          <InfoRow label="Address" value={space.address || "—"} />
          <InfoRow label="Telephone" value={space.tel || "—"} />
          <InfoRow
            label="Hours"
            value={`${space.opentime || "?"} – ${space.closetime || "?"}`}
          />
        </div>

        <BookingForm
          spaceId={space._id}
          spaceName={space.name}
          opentime={space.opentime}
          closetime={space.closetime}
        />
      </div>
    </div>
  );
}
