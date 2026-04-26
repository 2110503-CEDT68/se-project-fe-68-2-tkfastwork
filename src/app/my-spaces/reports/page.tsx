"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import LoadingSpinner from "@/components/LoadingSpinner";

type Frequency = "daily" | "weekly" | "monthly";

interface ReportPreferences {
  enabled: boolean;
  frequency: Frequency;
  hour: number;
  minute: number;
  timezone: string;
  dayOfWeek: number;
  dayOfMonth: number;
  lookbackDays: number;
  lastRunAt: string | null;
  nextRunAt: string | null;
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

const WEEKDAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const TIMEZONES = [
  "UTC",
  "Asia/Bangkok",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
  "America/Los_Angeles",
];

const DEFAULT_PREFERENCES: ReportPreferences = {
  enabled: false,
  frequency: "weekly",
  hour: 8,
  minute: 0,
  timezone: "UTC",
  dayOfWeek: 1,
  dayOfMonth: 1,
  lookbackDays: 30,
  lastRunAt: null,
  nextRunAt: null,
};

const formatLocalDate = (value: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
};

export default function ReportSchedulePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [preferences, setPreferences] = useState<ReportPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [sendingNow, setSendingNow] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const fetchPreferences = useCallback(async () => {
    if (!session?.user?.token) return;

    try {
      setLoading(true);
      setError("");

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/reports/preferences`,
        {
          headers: { Authorization: `Bearer ${session.user.token}` },
        }
      );

      const data = (await res.json()) as ApiResponse<ReportPreferences>;
      if (!res.ok) {
        throw new Error(data.message || "Failed to load report preferences");
      }

      setPreferences({ ...DEFAULT_PREFERENCES, ...data.data });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading preferences");
    } finally {
      setLoading(false);
    }
  }, [session?.user?.token]);

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user?.token) {
      router.push("/login");
      return;
    }
    fetchPreferences();
  }, [fetchPreferences, router, session?.user?.token, status]);

  const handleChange = <K extends keyof ReportPreferences>(key: K, value: ReportPreferences[K]) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
    setSuccessMessage("");
  };

  const handleSave = async () => {
    if (!session?.user?.token) return;

    try {
      setSaving(true);
      setError("");
      setSuccessMessage("");

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/reports/preferences`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.user.token}`,
          },
          body: JSON.stringify({
            enabled: preferences.enabled,
            frequency: preferences.frequency,
            hour: preferences.hour,
            minute: preferences.minute,
            timezone: preferences.timezone,
            dayOfWeek: preferences.dayOfWeek,
            dayOfMonth: preferences.dayOfMonth,
            lookbackDays: preferences.lookbackDays,
          }),
        }
      );

      const data = (await res.json()) as ApiResponse<ReportPreferences>;
      if (!res.ok) {
        throw new Error(data.message || "Failed to save report preferences");
      }

      setPreferences({ ...DEFAULT_PREFERENCES, ...data.data });
      setSuccessMessage("Schedule saved.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error saving preferences");
    } finally {
      setSaving(false);
    }
  };

  const handleSendNow = async () => {
    if (!session?.user?.token) return;

    try {
      setSendingNow(true);
      setError("");
      setSuccessMessage("");

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/reports/send-now`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.user.token}`,
          },
          body: JSON.stringify({}),
        }
      );

      const data = (await res.json()) as ApiResponse<{ filename: string; sentTo: string }>;
      if (!res.ok) {
        throw new Error(data.message || "Failed to send report");
      }

      setSuccessMessage(`Report sent to ${data.data.sentTo}.`);
      fetchPreferences();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error sending report");
    } finally {
      setSendingNow(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!session?.user?.token) return;

    try {
      setDownloading(true);
      setError("");

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/reports/pdf`,
        {
          headers: { Authorization: `Bearer ${session.user.token}` },
        }
      );

      if (!res.ok) {
        throw new Error("Failed to download PDF report");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `owner-report-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error downloading PDF");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-500">Owner reports</p>
          <h1 className="mt-1 text-3xl font-bold text-gray-950">Email Report Schedule</h1>
          <p className="mt-2 text-sm text-gray-600">
            Receive PDF reports by email on a schedule you choose.
          </p>
        </div>

        {error && (
          <div
            data-testid="error-banner"
            className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {successMessage && (
          <div
            data-testid="success-banner"
            className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
          >
            {successMessage}
          </div>
        )}

        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              data-testid="enabled-toggle"
              checked={preferences.enabled}
              onChange={(event) => handleChange("enabled", event.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <span className="text-sm font-semibold text-gray-800">
              Enable scheduled email reports
            </span>
          </label>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-500">
                Frequency
              </label>
              <select
                data-testid="frequency-select"
                value={preferences.frequency}
                onChange={(event) => handleChange("frequency", event.target.value as Frequency)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-gray-500">
                Timezone
              </label>
              <select
                data-testid="timezone-select"
                value={preferences.timezone}
                onChange={(event) => handleChange("timezone", event.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-gray-500">
                Hour (0-23)
              </label>
              <input
                type="number"
                min={0}
                max={23}
                data-testid="hour-input"
                value={preferences.hour}
                onChange={(event) => handleChange("hour", Number(event.target.value))}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-gray-500">
                Minute (0-59)
              </label>
              <input
                type="number"
                min={0}
                max={59}
                data-testid="minute-input"
                value={preferences.minute}
                onChange={(event) => handleChange("minute", Number(event.target.value))}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            {preferences.frequency === "weekly" && (
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500">
                  Day of week
                </label>
                <select
                  data-testid="day-of-week-select"
                  value={preferences.dayOfWeek}
                  onChange={(event) => handleChange("dayOfWeek", Number(event.target.value))}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  {WEEKDAYS.map((day) => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {preferences.frequency === "monthly" && (
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500">
                  Day of month
                </label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  data-testid="day-of-month-input"
                  value={preferences.dayOfMonth}
                  onChange={(event) => handleChange("dayOfMonth", Number(event.target.value))}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase text-gray-500">
                Lookback window (days)
              </label>
              <input
                type="number"
                min={1}
                max={365}
                data-testid="lookback-input"
                value={preferences.lookbackDays}
                onChange={(event) => handleChange("lookbackDays", Number(event.target.value))}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="mt-6 grid gap-4 rounded-md bg-slate-50 p-4 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase text-gray-500">Last sent</p>
              <p data-testid="last-run" className="mt-1 text-gray-800">
                {formatLocalDate(preferences.lastRunAt)}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-gray-500">Next scheduled</p>
              <p data-testid="next-run" className="mt-1 text-gray-800">
                {formatLocalDate(preferences.nextRunAt)}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              data-testid="save-button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save schedule"}
            </button>

            <button
              data-testid="send-now-button"
              onClick={handleSendNow}
              disabled={sendingNow}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sendingNow ? "Sending..." : "Send report now"}
            </button>

            <button
              data-testid="download-pdf-button"
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {downloading ? "Preparing..." : "Download PDF now"}
            </button>

            <button
              onClick={() => router.push("/my-spaces")}
              className="ml-auto rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Back
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
