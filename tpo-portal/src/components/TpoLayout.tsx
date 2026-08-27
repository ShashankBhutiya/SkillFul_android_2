import { ReactNode } from "react";
import { GraduationCap, LogOut } from "lucide-react";

/**
 * The portal shell.
 *
 * A placement officer is at a desk with a spreadsheet open, so this is a plain
 * wide page with a masthead and nothing competing for attention — no bottom
 * tabs, no streak badge, none of the student app's furniture.
 */
export function TpoLayout({
    children,
    institutionName,
    subtitle,
    email,
    onSignOut,
}: {
    children: ReactNode;
    institutionName: string;
    subtitle?: string;
    email?: string | null;
    onSignOut?: () => void;
}) {
    return (
        <div className="min-h-screen bg-muted/30">
            <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
                <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
                    <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <GraduationCap className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                            <p className="truncate font-display text-[15px] font-semibold leading-tight text-foreground">
                                {institutionName}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                                {subtitle ?? "Placement readiness dashboard"}
                            </p>
                        </div>
                    </div>

                    {onSignOut && (
                        <div className="flex shrink-0 items-center gap-3">
                            {email && (
                                <span className="hidden text-xs text-muted-foreground sm:inline">
                                    {email}
                                </span>
                            )}
                            <button
                                type="button"
                                onClick={onSignOut}
                                className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            >
                                <LogOut className="h-3.5 w-3.5" />
                                Sign out
                            </button>
                        </div>
                    )}
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>

            <footer className="mx-auto max-w-7xl px-4 pb-10 text-xs text-muted-foreground sm:px-6">
                SkillFul for institutions · figures update as students practise
            </footer>
        </div>
    );
}
