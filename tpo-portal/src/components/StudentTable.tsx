import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Download, Search } from "lucide-react";
import { READINESS_PILLARS, bandFor } from "../config";
import type { ScoredStudent } from "../types";

type SortKey = "readiness" | "avgAccuracy" | "questionsPracticed" | "currentStreak" | "name";

const COLUMNS: { key: SortKey; label: string; numeric: boolean }[] = [
    { key: "name", label: "Student", numeric: false },
    { key: "readiness", label: "Readiness", numeric: true },
    { key: "avgAccuracy", label: "Accuracy", numeric: true },
    { key: "questionsPracticed", label: "Practised", numeric: true },
    { key: "currentStreak", label: "Streak", numeric: true },
];

const pillarLabel = new Map(READINESS_PILLARS.map((p) => [p.id, p.label]));

function daysSince(date: string | null): string {
    if (!date) return "Never";
    const then = new Date(`${date}T00:00:00`);
    if (Number.isNaN(then.getTime())) return "Never";
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const days = Math.round((midnight.getTime() - then.getTime()) / 86_400_000);
    if (days <= 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 30) return `${days}d ago`;
    return `${Math.floor(days / 30)}mo ago`;
}

function toCsv(students: ScoredStudent[], engagementAvailable: boolean): string {
    const header = [
        "Name",
        "Roll number",
        "Branch",
        "Readiness",
        "Avg accuracy",
        "Questions practised",
        "Categories attempted",
        "Current streak",
        "Last active",
        ...READINESS_PILLARS.map((p) => p.label),
    ];

    const escape = (value: unknown) => {
        const text = value === null || value === undefined ? "" : String(value);
        if (!/[",\n]/.test(text)) return text;
        const doubled = text.split('"').join('""');
        return `"${doubled}"`;
    };

    const rows = students.map((s) =>
        [
            s.name,
            s.rollNumber ?? "",
            s.branch ?? "",
            s.readiness,
            s.avgAccuracy,
            s.questionsPracticed,
            s.categoriesAttempted,
            engagementAvailable ? s.currentStreak : "unknown",
            engagementAvailable ? (s.lastActiveDate ?? "") : "unknown",
            ...READINESS_PILLARS.map((p) => s.pillarScores[p.id] ?? 0),
        ].map(escape)
    );

    return [header.map(escape), ...rows].map((r) => r.join(",")).join("\n");
}

function downloadCsv(
    students: ScoredStudent[],
    institutionName: string,
    engagementAvailable: boolean
) {
    const blob = new Blob([toCsv(students, engagementAvailable)], {
        type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const slug = institutionName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    link.href = url;
    link.download = `${slug || "cohort"}-readiness-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * The roster. Sorting, search and branch filter are all client-side because a
 * cohort is a few hundred rows at most — round-tripping to Postgres for a sort
 * would be slower than the render.
 */
export function StudentTable({
    students,
    institutionName,
    bandFilter,
    onClearBandFilter,
    engagementAvailable = true,
}: {
    students: ScoredStudent[];
    institutionName: string;
    bandFilter: string | null;
    onClearBandFilter: () => void;
    /** When false, streak and last-active read as unknown rather than zero. */
    engagementAvailable?: boolean;
}) {
    const [sortKey, setSortKey] = useState<SortKey>("readiness");
    const [ascending, setAscending] = useState(false);
    const [query, setQuery] = useState("");
    const [branch, setBranch] = useState("all");

    const branches = useMemo(
        () => [...new Set(students.map((s) => s.branch).filter(Boolean))].sort() as string[],
        [students]
    );

    const visible = useMemo(() => {
        const needle = query.trim().toLowerCase();
        const filtered = students.filter((s) => {
            if (bandFilter && bandFor(s.readiness).id !== bandFilter) return false;
            if (branch !== "all" && s.branch !== branch) return false;
            if (!needle) return true;
            return (
                s.name.toLowerCase().includes(needle) ||
                (s.rollNumber ?? "").toLowerCase().includes(needle)
            );
        });

        return filtered.sort((a, b) => {
            if (sortKey === "name") {
                return ascending
                    ? a.name.localeCompare(b.name)
                    : b.name.localeCompare(a.name);
            }
            const diff = (a[sortKey] as number) - (b[sortKey] as number);
            return ascending ? diff : -diff;
        });
    }, [students, query, branch, bandFilter, sortKey, ascending]);

    const toggleSort = (key: SortKey) => {
        if (key === sortKey) {
            setAscending((prev) => !prev);
        } else {
            setSortKey(key);
            // Names read best A-Z; every number reads best worst-or-best first.
            setAscending(key === "name");
        }
    };

    return (
        <section className="rounded-xl border border-border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
                <div>
                    <h2 className="font-display text-base font-semibold text-foreground">Students</h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        {visible.length} of {students.length} shown
                        {bandFilter && (
                            <>
                                {" · "}
                                <button
                                    type="button"
                                    onClick={onClearBandFilter}
                                    className="text-primary underline underline-offset-2"
                                >
                                    clear band filter
                                </button>
                            </>
                        )}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Name or roll no."
                            aria-label="Search students"
                            className="h-9 w-44 rounded-md border border-input bg-background pl-8 pr-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                        />
                    </div>

                    {branches.length > 1 && (
                        <select
                            value={branch}
                            onChange={(e) => setBranch(e.target.value)}
                            aria-label="Filter by branch"
                            className="h-9 rounded-md border border-input bg-background px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                        >
                            <option value="all">All branches</option>
                            {branches.map((b) => (
                                <option key={b} value={b}>
                                    {b}
                                </option>
                            ))}
                        </select>
                    )}

                    <button
                        type="button"
                        onClick={() => downloadCsv(visible, institutionName, engagementAvailable)}
                        className="flex h-9 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-muted"
                    >
                        <Download className="h-3.5 w-3.5" />
                        CSV
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-sm">
                    <thead>
                        <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground">
                            {COLUMNS.map((col) => (
                                <th
                                    key={col.key}
                                    className={`px-4 py-2.5 font-medium ${col.numeric ? "text-right" : "text-left"}`}
                                >
                                    <button
                                        type="button"
                                        onClick={() => toggleSort(col.key)}
                                        className={`inline-flex items-center gap-1 transition-colors hover:text-foreground ${
                                            sortKey === col.key ? "text-foreground" : ""
                                        }`}
                                    >
                                        {col.label}
                                        {sortKey === col.key &&
                                            (ascending ? (
                                                <ArrowUp className="h-3 w-3" />
                                            ) : (
                                                <ArrowDown className="h-3 w-3" />
                                            ))}
                                    </button>
                                </th>
                            ))}
                            <th className="px-4 py-2.5 text-left font-medium">Weakest rounds</th>
                            <th className="px-4 py-2.5 text-right font-medium">Last active</th>
                        </tr>
                    </thead>
                    <tbody>
                        {visible.map((student) => {
                            const band = bandFor(student.readiness);
                            return (
                                <tr
                                    key={student.userId}
                                    className="border-b border-border/60 last:border-0 hover:bg-muted/40"
                                >
                                    <td className="px-4 py-3">
                                        <span className="block text-[13px] font-medium text-foreground">
                                            {student.name}
                                        </span>
                                        <span className="block text-[11px] text-muted-foreground">
                                            {[student.rollNumber, student.branch].filter(Boolean).join(" · ") || "—"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <span className="inline-flex items-center gap-2">
                                            <span className="h-1.5 w-12 overflow-hidden rounded-full bg-muted">
                                                <span
                                                    className={`block h-full rounded-full ${band.bar}`}
                                                    style={{ width: `${Math.max(3, student.readiness)}%` }}
                                                />
                                            </span>
                                            <span
                                                className={`font-display text-sm font-semibold tabular-nums ${band.text}`}
                                            >
                                                {student.readiness.toFixed(0)}
                                            </span>
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                                        {student.categoriesAttempted > 0
                                            ? `${student.avgAccuracy.toFixed(0)}%`
                                            : "—"}
                                    </td>
                                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                                        {student.questionsPracticed}
                                    </td>
                                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                                        {!engagementAvailable
                                            ? "?"
                                            : student.currentStreak > 0
                                              ? `${student.currentStreak}d`
                                              : "—"}
                                    </td>
                                    <td className="px-4 py-3">
                                        {student.weakestPillars.length === 0 ? (
                                            <span className="text-xs text-emerald-600">None flagged</span>
                                        ) : (
                                            <span className="flex flex-wrap gap-1">
                                                {student.weakestPillars.slice(0, 2).map((id) => (
                                                    <span
                                                        key={id}
                                                        className="rounded border border-border bg-muted/60 px-1.5 py-0.5 text-[11px] text-muted-foreground"
                                                    >
                                                        {pillarLabel.get(id) ?? id}
                                                    </span>
                                                ))}
                                                {student.weakestPillars.length > 2 && (
                                                    <span className="px-1 py-0.5 text-[11px] text-muted-foreground">
                                                        +{student.weakestPillars.length - 2}
                                                    </span>
                                                )}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                                        {engagementAvailable ? daysSince(student.lastActiveDate) : "Unknown"}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {visible.length === 0 && (
                <p className="p-8 text-center text-sm text-muted-foreground">
                    No students match these filters.
                </p>
            )}
        </section>
    );
}
