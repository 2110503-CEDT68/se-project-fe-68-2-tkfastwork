"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import LoadingSpinner from "@/components/LoadingSpinner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface StatData {
  totalBookings: number;
  totalUniqueUsers: number;
  avgBookingDurationMinutes: number;
  roomUtilization: any[];
  peakHours: any[];
  demographicBreakdown: {
    byGender: any[];
    byOccupation: any[];
    byAgeGroup: any[];
    byRevenueRange: any[];
  };
}

interface InsightData {
  type: string;
  message: string;
  severity: "info" | "warning" | "highlight";
}

export default function DashboardPage() {
  const params = useParams();
  const router = useRouter();
  const spaceId = params.id as string;
  const { data: session, status } = useSession();

  const [stats, setStats] = useState<StatData | null>(null);
  const [insights, setInsights] = useState<InsightData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  // Date Filter State
  const defaultTo = new Date().toISOString().split("T")[0];
  const defaultFrom = new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split("T")[0];
  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(defaultTo);
  const [appliedFrom, setAppliedFrom] = useState(defaultFrom);
  const [appliedTo, setAppliedTo] = useState(defaultTo);

  const dashboardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user?.token) {
      router.push("/login");
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const queryParams = `?from=${appliedFrom}&to=${appliedTo}`;
        const [statsRes, insightsRes] = await Promise.all([
          fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/coworkingSpaces/${spaceId}/stats${queryParams}`,
            {
              headers: { Authorization: `Bearer ${session.user.token}` },
            }
          ),
          fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/coworkingSpaces/${spaceId}/insights${queryParams}`,
            {
              headers: { Authorization: `Bearer ${session.user.token}` },
            }
          ),
        ]);

        const statsData = await statsRes.json();
        const insightsData = await insightsRes.json();

        if (!statsRes.ok) throw new Error(statsData.message || "Failed to fetch stats");
        if (!insightsRes.ok) throw new Error(insightsData.message || "Failed to fetch insights");

        setStats(statsData.data);
        setInsights(insightsData.data.insights || []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Error fetching dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [spaceId, session, status, router, appliedFrom, appliedTo]);

  const handleApplyFilter = () => {
    setAppliedFrom(fromDate);
    setAppliedTo(toDate);
  };

  const exportPDF = async () => {
    setIsExporting(true);
    try {
      if (!stats) return;

      const doc = new jsPDF();
      const margin = 14;
      
      // Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("Business Dashboard Report", margin, 22);
      
      // Content
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Report Period: ${appliedFrom} to ${appliedTo}`, margin, 31);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, margin, 37);
      
      // Section: Overview
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text("1. Overall Metrics", margin, 52);
      
      autoTable(doc, {
        startY: 57,
        head: [['Metric', 'Value']],
        body: [
          ['Total Bookings', stats.totalBookings.toString()],
          ['Total Unique Users', stats.totalUniqueUsers.toString()],
          ['Average Booking Duration', `${stats.avgBookingDurationMinutes} mins`]
        ],
        theme: 'grid',
        headStyles: { fillColor: [44, 62, 80] },
        styles: { fontSize: 11, cellPadding: 6 }
      });
      
      // Demographic
      let finalY = (doc as any).lastAutoTable.finalY || 57;
      doc.setFontSize(14);
      doc.text("2. Demographics", margin, finalY + 15);
      
      autoTable(doc, {
        startY: finalY + 20,
        head: [['Age Group', 'Percentage']],
        body: stats.demographicBreakdown.byAgeGroup.map(a => [a.ageGroup, `${a.percentage}%`]),
        theme: 'striped',
        margin: { top: 10, left: margin },
        tableWidth: 80,
      });

      autoTable(doc, {
        startY: finalY + 20,
        head: [['Gender', 'Percentage']],
        body: stats.demographicBreakdown.byGender.map(g => [g.gender, `${g.percentage}%`]),
        theme: 'striped',
        margin: { left: margin + 90 },
        tableWidth: 80,
      });

      finalY = Math.max((doc as any).lastAutoTable.finalY, finalY + 40);

      autoTable(doc, {
        startY: finalY + 10,
        head: [['Occupation', 'Percentage']],
        body: stats.demographicBreakdown.byOccupation.map(o => [o.occupation, `${o.percentage}%`]),
        theme: 'striped',
      });

      finalY = (doc as any).lastAutoTable.finalY || finalY;
      
      // Insights
      doc.addPage();
      doc.setFontSize(14);
      doc.text("3. AI Insights & Alerts", margin, 22);
      
      autoTable(doc, {
        startY: 28,
        head: [['Type', 'Message', 'Severity']],
        body: insights.map(i => [i.type.replace('_', ' ').toUpperCase(), i.message, i.severity.toUpperCase()]),
        theme: 'grid',
        styles: { cellWidth: 'wrap', cellPadding: 4 },
        columnStyles: {
            0: {cellWidth: 40},
            1: {cellWidth: 100},
            2: {cellWidth: 30, fontStyle: 'bold'}
        },
        headStyles: { fillColor: [243, 156, 18], textColor: 255 }
      });
      
      // Room utilization
      finalY = (doc as any).lastAutoTable.finalY || 30;
      doc.setFontSize(14);
      doc.text("4. Room Utilization", margin, finalY + 15);
      
      autoTable(doc, {
        startY: finalY + 22,
        head: [['Room Name', 'Type', 'Bookings', 'Hours Booked']],
        body: stats.roomUtilization.map(ru => [ru.roomName, ru.roomType, ru.bookingCount.toString(), ru.totalHoursBooked.toString()]),
        theme: 'striped',
        headStyles: { fillColor: [39, 174, 96] }
      });

      doc.save(`Space_Report_${spaceId}.pdf`);
    } catch (err) {
      console.error("PDF Export failed", err);
      alert("Failed to export PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error)
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white p-6 rounded-xl border border-red-200 text-red-600 max-w-md text-center shadow-lg">
          <h2 className="text-xl font-bold mb-2">Error</h2>
          <p>{error}</p>
          <button onClick={() => router.push("/my-spaces")} className="mt-4 px-4 py-2 bg-gray-100 text-gray-800 rounded mx-auto hover:bg-gray-200 transition-colors">Go Back</button>
        </div>
      </div>
    );

  if (!stats) return <div className="text-center py-20 text-gray-500">No data available</div>;

  return (
    <div className="min-h-screen bg-slate-100 pt-8 pb-16 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header section with Export Button */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Business Dashboard</h1>
            <p className="text-gray-500 mt-1">Key metrics and insights for your coworking space</p>
          </div>
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-300 shadow-sm">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-gray-500">FROM</span>
                <input 
                  type="date" 
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="text-sm text-gray-800 bg-transparent focus:outline-none"
                />
              </div>
              <div className="text-gray-300">|</div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-gray-500">TO</span>
                <input 
                  type="date" 
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="text-sm text-gray-800 bg-transparent focus:outline-none"
                />
              </div>
              <button 
                onClick={handleApplyFilter}
                disabled={loading}
                className="ml-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold px-2.5 py-1 rounded transition-colors disabled:opacity-50"
              >
                Apply
              </button>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/my-spaces")}
                className="px-4 py-2 bg-white text-gray-700 border border-gray-300 font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
              >
                Back to Spaces
              </button>
              <button
                onClick={exportPDF}
                disabled={isExporting}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg shadow hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExporting ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                )}
                {isExporting ? "Exporting..." : "Export PDF"}
              </button>
            </div>
          </div>
        </div>

        {/* The area to be exported into PDF */}
        <div ref={dashboardRef} className="bg-white p-6 sm:p-8 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 relative overflow-hidden">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {/* Quick Stat Cards */}
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-6 rounded-xl border border-indigo-100 relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-500 opacity-[0.03] rounded-full group-hover:scale-150 transition-transform duration-500"></div>
              <p className="text-sm font-semibold text-indigo-600 uppercase tracking-widest mb-1">Total Bookings</p>
              <h3 className="text-4xl font-extrabold text-gray-900">{stats.totalBookings}</h3>
            </div>
            
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-6 rounded-xl border border-emerald-100 relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500 opacity-[0.03] rounded-full group-hover:scale-150 transition-transform duration-500"></div>
              <p className="text-sm font-semibold text-emerald-600 uppercase tracking-widest mb-1">Unique Users</p>
              <h3 className="text-4xl font-extrabold text-gray-900">{stats.totalUniqueUsers}</h3>
            </div>
            
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-xl border border-amber-100 relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-500 opacity-[0.03] rounded-full group-hover:scale-150 transition-transform duration-500"></div>
              <p className="text-sm font-semibold text-amber-600 uppercase tracking-widest mb-1">Avg Duration (mins)</p>
              <h3 className="text-4xl font-extrabold text-gray-900">{stats.avgBookingDurationMinutes}</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
            {/* Demographic Breakdown */}
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                Demographics Profile
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2 uppercase">By Age Group</p>
                  <div className="flex gap-1.5 h-24 items-end border-b border-gray-200 pb-1">
                    {stats.demographicBreakdown.byAgeGroup.map(age => (
                      <div key={age.ageGroup} className="flex-1 flex flex-col justify-end group relative items-center">
                        <div className="text-[0.65rem] text-center text-white bg-gray-800 rounded px-1.5 py-0.5 mb-1 opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full pb-1 z-10 whitespace-nowrap">
                          {age.percentage}%
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-t-gray-800 border-x-transparent border-x-[3px] border-t-[3px]"></div>
                        </div>
                        <div 
                          className="bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-sm w-full transition-all group-hover:from-blue-700 group-hover:to-blue-500" 
                          style={{ height: `${Math.max(age.percentage, 2)}%` }}
                        ></div>
                        <div className="text-[0.65rem] text-center font-medium mt-1 text-gray-700 truncate w-full">{age.ageGroup}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2 uppercase">By Gender</p>
                  <div className="flex flex-col gap-2">
                    {stats.demographicBreakdown.byGender.map(gender => (
                      <div key={gender.gender} className="w-full bg-white p-2.5 rounded-lg border border-gray-200 relative overflow-hidden group">
                         <div className="absolute inset-y-0 left-0 bg-indigo-50 border-l-4 border-indigo-500 transition-all group-hover:bg-indigo-100" style={{width: `${gender.percentage}%`}}></div>
                         <div className="flex justify-between items-center relative z-10">
                           <div className="text-sm font-semibold text-gray-800 capitalize flex items-center gap-1.5">
                             {gender.gender === 'male' && <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m0-8h-8m8 0L8 16" /></svg>}
                             {gender.gender === 'female' && <svg className="w-4 h-4 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v6m-3-3h6M12 15a6 6 0 100-12 6 6 0 000 12z" /></svg>}
                             {gender.gender !== 'male' && gender.gender !== 'female' && <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
                             {gender.gender}
                           </div>
                           <div className="text-xs font-bold text-gray-600">{gender.percentage}% <span className="text-gray-400 font-normal">({gender.count})</span></div>
                         </div>
                      </div>
                    ))}
                    {stats.demographicBreakdown.byGender.length === 0 && (
                      <div className="text-xs text-gray-400 italic">No data</div>
                    )}
                  </div>
                </div>

                <div className="col-span-1 sm:col-span-2 mt-2">
                  <p className="text-xs font-semibold text-gray-500 mb-2 uppercase">Occupation Distribution</p>
                  {stats.demographicBreakdown.byOccupation.length > 0 ? (
                    <>
                      <div className="flex h-3 rounded-full overflow-hidden bg-gray-200">
                        {stats.demographicBreakdown.byOccupation.map((occ, i) => {
                          const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500', 'bg-rose-500', 'bg-teal-500'];
                          return (
                            <div key={occ.occupation} className={`${colors[i % colors.length]}`} style={{ width: `${occ.percentage}%` }} title={`${occ.occupation} - ${occ.percentage}%`}></div>
                          );
                        })}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3">
                        {stats.demographicBreakdown.byOccupation.map((occ, i) => {
                          const bgColors = ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500', 'bg-rose-500', 'bg-teal-500'];
                          return (
                            <div key={occ.occupation} className="flex items-center gap-1.5 align-middle text-xs text-gray-600">
                              <span className={`w-2.5 h-2.5 rounded-full shadow-sm ${bgColors[i % bgColors.length]}`}></span>
                              <span className="capitalize font-medium">{occ.occupation} <span className="text-gray-400 font-normal">({occ.percentage}%)</span></span>
                            </div>
                          )
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-gray-400 italic">No data</div>
                  )}
                </div>
              </div>
            </div>

            {/* Smart Insights generated by rule engine */}
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-6 flex flex-col">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                AI Insights & Alerts
              </h3>
              
              {insights.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-gray-400 text-sm italic">Not enough data to generate insights yet.</div>
              ) : (
                <div className="space-y-4 flex-1 overflow-y-auto pr-2">
                  {insights.map((insight, idx) => (
                    <div 
                      key={idx} 
                      className={`p-4 rounded-lg border-l-4 transition-transform hover:translate-x-1 ${
                        insight.severity === "highlight" 
                          ? "bg-amber-50 border-amber-500 text-amber-800" 
                          : insight.severity === "warning"
                          ? "bg-red-50 border-red-500 text-red-800"
                          : "bg-blue-50 border-blue-500 text-blue-800"
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className="mt-0.5">
                          {insight.severity === "highlight" && <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/></svg>}
                          {insight.severity === "warning" && <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>}
                          {insight.severity === "info" && <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/></svg>}
                        </div>
                        <div>
                          <p className={`text-sm font-semibold leading-snug`}>{insight.message}</p>
                          <p className="text-xs mt-1 opacity-75 capitalize">{insight.type.replace('_', ' ')}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Room Utilization Table */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
              Room Utilization
            </h3>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 font-semibold text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Room Name</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Bookings</th>
                    <th className="px-6 py-4 text-right">Total Hours Booked</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {stats.roomUtilization.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-400">No rooms or data available</td>
                    </tr>
                  ) : (
                    stats.roomUtilization.map((ru) => (
                      <tr key={ru.roomId} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-gray-900">{ru.roomName}</td>
                        <td className="px-6 py-4">
                          <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs capitalize">{ru.roomType}</span>
                        </td>
                        <td className="px-6 py-4">{ru.bookingCount}</td>
                        <td className="px-6 py-4 text-right font-semibold text-gray-700">{ru.totalHoursBooked} hrs</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
