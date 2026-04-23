"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import LoadingSpinner from "@/components/LoadingSpinner";
<<<<<<< HEAD
=======
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
>>>>>>> aa0ec94 (dashboard-stat-1)

type Severity = "info" | "warning" | "highlight";

interface RoomUtilization {
  roomId: string;
  roomName: string;
  roomType: string;
  totalHoursBooked: number;
  bookingCount: number;
}

interface PeakHour {
  hour: number;
  count: number;
}

interface DemographicItem {
  count: number;
  percentage: number;
}

interface GenderBreakdown extends DemographicItem {
  gender: string;
}

interface OccupationBreakdown extends DemographicItem {
  occupation: string;
}

interface AgeBreakdown extends DemographicItem {
  ageGroup: string;
}

interface RevenueBreakdown extends DemographicItem {
  range: string;
}

interface DashboardStats {
  totalBookings: number;
  totalUniqueUsers: number;
  avgBookingDurationMinutes: number;
  roomUtilization: RoomUtilization[];
  peakHours: PeakHour[];
  demographicBreakdown: {
    byGender: GenderBreakdown[];
    byOccupation: OccupationBreakdown[];
    byAgeGroup: AgeBreakdown[];
    byRevenueRange: RevenueBreakdown[];
  };
}

interface DashboardInsight {
  type: string;
  message: string;
  severity: Severity;
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

const getDateInputValue = (date: Date) => date.toISOString().split("T")[0];

const getDefaultFromDate = () => {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return getDateInputValue(date);
};

const formatHourRange = (hour: number) => {
  const start = `${String(hour).padStart(2, "0")}:00`;
  const endHour = (hour + 1) % 24;
  const end = `${String(endHour).padStart(2, "0")}:00`;
  return `${start}-${end}`;
};

const formatPercent = (value: number) => `${Number.isFinite(value) ? value : 0}%`;

const EmptyState = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-lg border border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-gray-500">
    {children}
  </div>
);

const MetricCard = ({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: "blue" | "emerald" | "amber";
}) => {
  const tones = {
    blue: "border-blue-100 bg-blue-50 text-blue-700",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
  };

  return (
    <div className={`rounded-lg border p-5 ${tones[tone]}`}>
      <p className="text-xs font-semibold uppercase text-current">{label}</p>
      <p className="mt-2 text-3xl font-bold text-gray-950">{value}</p>
    </div>
  );
};

export default function DashboardPage() {
  const params = useParams();
  const router = useRouter();
  const spaceId = params.id as string;
  const { data: session, status } = useSession();

  const defaultTo = useMemo(() => getDateInputValue(new Date()), []);
  const defaultFrom = useMemo(() => getDefaultFromDate(), []);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [insights, setInsights] = useState<DashboardInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(defaultTo);
  const [appliedFrom, setAppliedFrom] = useState(defaultFrom);
  const [appliedTo, setAppliedTo] = useState(defaultTo);
  const [filterError, setFilterError] = useState("");

  const fetchDashboardData = useCallback(async () => {
    if (!session?.user?.token) return;

    try {
      setLoading(true);
      setError("");

      const queryParams = new URLSearchParams({
        from: appliedFrom,
        to: appliedTo,
      });

      const headers = {
        Authorization: `Bearer ${session.user.token}`,
      };

      const [statsRes, insightsRes] = await Promise.all([
        fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/coworkingSpaces/${spaceId}/stats?${queryParams}`,
          { headers }
        ),
        fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/coworkingSpaces/${spaceId}/insights?${queryParams}`,
          { headers }
        ),
      ]);

      const statsData = (await statsRes.json()) as ApiResponse<DashboardStats>;
      const insightsData = (await insightsRes.json()) as ApiResponse<{ insights: DashboardInsight[] }>;

      if (!statsRes.ok) throw new Error(statsData.message || "Failed to fetch dashboard stats");
      if (!insightsRes.ok) throw new Error(insightsData.message || "Failed to fetch dashboard insights");

      setStats(statsData.data);
      setInsights(insightsData.data.insights || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error fetching dashboard data");
    } finally {
      setLoading(false);
    }
  }, [appliedFrom, appliedTo, session?.user?.token, spaceId]);

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user?.token) {
      router.push("/login");
      return;
    }

    fetchDashboardData();
  }, [fetchDashboardData, router, session?.user?.token, status]);

  const handleApplyFilter = () => {
    if (!fromDate || !toDate) {
      setFilterError("Please select both dates.");
      return;
    }

    if (new Date(fromDate) > new Date(toDate)) {
      setFilterError("From date must be before or equal to To date.");
      return;
    }

    setFilterError("");
    setAppliedFrom(fromDate);
    setAppliedTo(toDate);
  };

  const maxPeakCount = useMemo(() => {
    if (!stats?.peakHours.length) return 0;
    return Math.max(...stats.peakHours.map((peak) => peak.count));
  }, [stats?.peakHours]);

  if (loading) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="max-w-md rounded-lg border border-red-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-bold text-gray-950">Dashboard unavailable</h1>
          <p className="mt-2 text-sm text-red-600">{error}</p>
          <div className="mt-5 flex justify-center gap-3">
            <button
              onClick={fetchDashboardData}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
            >
              Retry
            </button>
            <button
              onClick={() => router.push("/my-spaces")}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-20 text-center text-gray-500">
        No dashboard data available.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Owner analytics</p>
            <h1 className="mt-1 text-3xl font-bold text-gray-950">Business Dashboard</h1>
            <p className="mt-2 text-sm text-gray-600">
              Showing data from {appliedFrom} to {appliedTo}.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <span className="font-semibold">From</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(event) => setFromDate(event.target.value)}
                  className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-primary focus:outline-none"
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <span className="font-semibold">To</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(event) => setToDate(event.target.value)}
                  className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-primary focus:outline-none"
                />
              </label>
              <button
                onClick={handleApplyFilter}
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
              >
                Apply
              </button>
              <button
                onClick={() => router.push("/my-spaces")}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Back
              </button>
            </div>
            {filterError && <p className="text-sm text-red-600">{filterError}</p>}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard label="Total bookings" value={stats.totalBookings} tone="blue" />
          <MetricCard label="Unique users" value={stats.totalUniqueUsers} tone="emerald" />
          <MetricCard
            label="Avg booking duration"
            value={`${stats.avgBookingDurationMinutes} mins`}
            tone="amber"
          />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-gray-950">Customer Demographics</h2>

            <div className="mt-5 space-y-6">
              <div>
                <h3 className="text-sm font-semibold uppercase text-gray-500">Age group</h3>
                {stats.demographicBreakdown.byAgeGroup.length === 0 ? (
                  <div className="mt-3">
                    <EmptyState>No age data available.</EmptyState>
                  </div>
                ) : (
                  <div className="mt-3 flex h-32 items-end gap-2 border-b border-gray-200 pb-2">
                    {stats.demographicBreakdown.byAgeGroup.map((item) => (
                      <div key={item.ageGroup} className="flex min-w-0 flex-1 flex-col items-center justify-end">
                        <span className="mb-1 text-xs font-semibold text-gray-600">
                          {formatPercent(item.percentage)}
                        </span>
                        <div
                          className="w-full rounded-t bg-blue-500"
                          style={{ height: `${Math.max(item.percentage, 2)}%` }}
                        />
                        <span className="mt-2 w-full truncate text-center text-xs text-gray-600">
                          {item.ageGroup}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

<<<<<<< HEAD
              <BreakdownBars
                title="Gender"
                items={stats.demographicBreakdown.byGender}
                getKey={(item) => item.gender}
                getLabel={(item) => item.gender}
                barClassName="bg-emerald-500"
                emptyText="No gender data available."
              />

              <BreakdownBars
                title="Occupation"
                items={stats.demographicBreakdown.byOccupation}
                getKey={(item) => item.occupation}
                getLabel={(item) => item.occupation}
                barClassName="bg-amber-500"
                emptyText="No occupation data available."
              />

              <BreakdownBars
                title="Revenue range"
                items={stats.demographicBreakdown.byRevenueRange}
                getKey={(item) => item.range}
                getLabel={(item) => item.range}
                barClassName="bg-violet-500"
                emptyText="No revenue-range data available."
              />
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-gray-950">Peak Hours</h2>
            <p className="mt-1 text-sm text-gray-500">Top booking start times in the selected date range.</p>

            {stats.peakHours.length === 0 ? (
              <div className="mt-5">
                <EmptyState>No peak-hour data available.</EmptyState>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {stats.peakHours.map((peak) => {
                  const width = maxPeakCount ? Math.max((peak.count / maxPeakCount) * 100, 6) : 0;
                  return (
                    <div key={peak.hour}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-800">{formatHourRange(peak.hour)}</span>
                        <span className="text-gray-500">{peak.count} bookings</span>
                      </div>
                      <div className="h-3 rounded-full bg-gray-100">
                        <div className="h-3 rounded-full bg-blue-600" style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-8">
              <h2 className="text-lg font-bold text-gray-950">Insights</h2>
              {insights.length === 0 ? (
                <div className="mt-5">
                  <EmptyState>Not enough data to generate insights yet.</EmptyState>
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {insights.map((insight, index) => (
                    <InsightCard key={`${insight.type}-${index}`} insight={insight} />
                  ))}
                </div>
              )}
=======
            {/* Revenue Range Pie Chart */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/></svg>
                Revenue Range Distribution
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats.demographicBreakdown.byRevenueRange}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ payload }) => `${payload.range}: ${payload.percentage}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {stats.demographicBreakdown.byRevenueRange.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#0088FE', '#00C49F', '#FFBB28', '#FF8042'][index % 4]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
            {/* Room Utilization Chart */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                Room Utilization (Hours Booked)
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.roomUtilization}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="roomName" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="totalHoursBooked" fill="#8884d8" name="Hours Booked" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Peak Hours Chart */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                Peak Booking Hours
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.peakHours}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#82ca9d" name="Bookings" />
                </BarChart>
              </ResponsiveContainer>
>>>>>>> aa0ec94 (dashboard-stat-1)
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-950">Room Performance</h2>
          <p className="mt-1 text-sm text-gray-500">Bookings and booked hours by room.</p>

          <div className="mt-5 overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Room</th>
                  <th className="px-5 py-3 font-semibold">Type</th>
                  <th className="px-5 py-3 font-semibold">Bookings</th>
                  <th className="px-5 py-3 text-right font-semibold">Hours Booked</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {stats.roomUtilization.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-gray-500">
                      No room data available.
                    </td>
                  </tr>
                ) : (
                  stats.roomUtilization.map((room) => (
                    <tr key={room.roomId} className="hover:bg-slate-50">
                      <td className="px-5 py-4 font-semibold text-gray-950">{room.roomName}</td>
                      <td className="px-5 py-4">
                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium capitalize text-gray-700">
                          {room.roomType}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-gray-700">{room.bookingCount}</td>
                      <td className="px-5 py-4 text-right font-semibold text-gray-800">
                        {room.totalHoursBooked} hrs
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function BreakdownBars<T extends DemographicItem>({
  title,
  items,
  getKey,
  getLabel,
  barClassName,
  emptyText,
}: {
  title: string;
  items: T[];
  getKey: (item: T) => string;
  getLabel: (item: T) => string;
  barClassName: string;
  emptyText: string;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase text-gray-500">{title}</h3>
      {items.length === 0 ? (
        <div className="mt-3">
          <EmptyState>{emptyText}</EmptyState>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          {items.map((item) => (
            <div key={getKey(item)}>
              <div className="mb-1 flex items-center justify-between gap-4 text-sm">
                <span className="truncate font-medium capitalize text-gray-800">{getLabel(item)}</span>
                <span className="shrink-0 text-gray-500">
                  {formatPercent(item.percentage)} ({item.count})
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-gray-100">
                <div
                  className={`h-2.5 rounded-full ${barClassName}`}
                  style={{ width: `${Math.max(item.percentage, 2)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InsightCard({ insight }: { insight: DashboardInsight }) {
  const tone = {
    info: "border-blue-500 bg-blue-50 text-blue-900",
    warning: "border-red-500 bg-red-50 text-red-900",
    highlight: "border-amber-500 bg-amber-50 text-amber-900",
  }[insight.severity];

  return (
    <div className={`rounded-lg border-l-4 p-4 ${tone}`}>
      <p className="text-sm font-semibold leading-6">{insight.message}</p>
      <p className="mt-1 text-xs font-medium capitalize opacity-75">{insight.type.replace(/_/g, " ")}</p>
    </div>
  );
}
