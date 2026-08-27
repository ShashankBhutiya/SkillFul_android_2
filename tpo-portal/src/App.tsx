import { Loader2 } from "lucide-react";
import { useAuth, signOut } from "./auth";
import { Dashboard } from "./Dashboard";
import { SignIn } from "./components/SignIn";
import { isSupabaseConfigured } from "./lib/supabase";

export default function App() {
    const { userId, email, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-muted/30">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
        );
    }

    // Without Supabase there is nothing to sign in against, so go straight to
    // the dashboard — it renders its sample cohort behind an explicit banner.
    if (!userId && isSupabaseConfigured()) {
        return <SignIn />;
    }

    return <Dashboard userId={userId} email={email} onSignOut={signOut} />;
}
