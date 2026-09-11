import { Info } from "lucide-react";
import type { CohortSource } from "../types";

/**
 * Says out loud where the numbers came from.
 *
 * The dashboard renders a sample cohort when no institution is wired up yet,
 * which is genuinely useful for evaluating the thing — but a placement officer
 * must never mistake fixture data for their own batch, so the banner is
 * unmissable and names the exact reason.
 */
const REASONS: Record<
    Extract<CohortSource, { kind: "sample" }>["reason"],
    { headline: string; detail: string }
> = {
    unconfigured: {
        headline: "Sample data — Supabase is not configured",
        detail:
            "Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then reload to see your own cohort.",
    },
    not_provisioned: {
        headline: "Sample data — institution tables not created yet",
        detail:
            "Apply the 20260825020012_tpo_dashboard migration from the app repo to enable live cohorts.",
    },
    no_institution: {
        headline: "Sample data — you are not registered as a TPO",
        detail:
            "Ask an administrator to add your account to institution_members with role 'tpo'.",
    },
    empty: {
        headline: "Sample data — no students have joined yet",
        detail:
            "Generate one-time student codes above. Their figures appear here after they claim a code and practise.",
    },
};

export function SourceBanner({ source }: { source: CohortSource }) {
    if (source.kind === "live") return null;

    const { headline, detail } = REASONS[source.reason];

    return (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
            <div>
                <p className="text-sm font-semibold text-amber-900">{headline}</p>
                <p className="mt-0.5 text-xs text-amber-800">
                    Every figure below is generated placeholder data for layout purposes. {detail}
                </p>
            </div>
        </div>
    );
}
