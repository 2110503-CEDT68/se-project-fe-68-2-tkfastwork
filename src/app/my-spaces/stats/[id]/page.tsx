"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import LoadingSpinner from "@/components/LoadingSpinner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface StatsData {
  totalBookings: number;
  totalUniqueUsers: number;
  roomUtilization: Array<{
    roomId: string;
    roomName: string;
    roomType: string;
    totalHoursBooked: number;
    bookingCount: number;
  }>;
  peakHours: Array<{ hour: number; count: number }>;
  avgBookingDurationMinutes: number;
  demographicBreakdown: {
    byGender: Array<{ gender: string; count: number; percentage: number }>;
    byOccupation: Array<{ occupation: string; count: number; percentage: number }>;
    byAgeGroup: Array<{ ageGroup: string; count: number; percentage: number }>;
    byRevenueRange: Array<{ range: string; count: number; percentage: number }>;
  };
}

interface Insight {
  type: string;
  message: string;
  metric: any;
  severity: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function StatsPage() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const spaceId = params.id as string;

  useEffect(() => {
    if (!session?.user?.token) {
      router.push('/login');
      return;
    }

    const fetchData = async () => {
      try {
        const [statsRes, insightsRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/coworkingSpaces/${spaceId}/stats`, {
            headers: { Authorization: `Bearer ${session.user.token}` },
          }),
          fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/coworkingSpaces/${spaceId}/insights`, {
            headers: { Authorization: `Bearer ${session.user.token}` },
          }),
        ]);

        const statsData = await statsRes.json();
        const insightsData = await insightsRes.json();

        if (!statsRes.ok) throw new Error(statsData.message || "Failed to fetch stats");
        if (!insightsRes.ok) throw new Error(insightsData.message || "Failed to fetch insights");

        setStats(statsData.data);
        setInsights(insightsData.data.insights);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [session, spaceId, router]);

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="text-red-500 text-center mt-10">{error}</div>;
  if (!stats) return <div className="text-center mt-10">No data available</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Space Statistics Dashboard</h1>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-700">Total Bookings</h3>
          <p className="text-3xl font-bold text-blue-600">{stats.totalBookings}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-700">Unique Users</h3>
          <p className="text-3xl font-bold text-green-600">{stats.totalUniqueUsers}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-700">Avg Booking Duration</h3>
          <p className="text-3xl font-bold text-purple-600">{stats.avgBookingDurationMinutes} min</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Room Utilization */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold mb-4">Room Utilization</h3>
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

        {/* Peak Hours */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold mb-4">Peak Booking Hours</h3>
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
        </div>
      </div>

      {/* Demographics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Gender */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold mb-4">Demographics by Gender</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={stats.demographicBreakdown.byGender}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ payload }) => `${payload.gender}: ${payload.percentage}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {stats.demographicBreakdown.byGender.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Occupation */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold mb-4">Demographics by Occupation</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={stats.demographicBreakdown.byOccupation}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ payload }) => `${payload.occupation}: ${payload.percentage}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {stats.demographicBreakdown.byOccupation.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Age Group */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold mb-4">Demographics by Age Group</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={stats.demographicBreakdown.byAgeGroup}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ payload }) => `${payload.ageGroup}: ${payload.percentage}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {stats.demographicBreakdown.byAgeGroup.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue Range */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold mb-4">Demographics by Revenue Range</h3>
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
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Insights */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-semibold mb-4">Insights</h3>
        {insights.length === 0 ? (
          <p className="text-gray-500">No insights available. Need more data.</p>
        ) : (
          <div className="space-y-4">
            {insights.map((insight, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border-l-4 ${
                  insight.severity === 'highlight'
                    ? 'border-yellow-500 bg-yellow-50'
                    : insight.severity === 'warning'
                    ? 'border-red-500 bg-red-50'
                    : 'border-blue-500 bg-blue-50'
                }`}
              >
                <p className="font-medium">{insight.message}</p>
                <p className="text-sm text-gray-600 mt-1">Type: {insight.type}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}