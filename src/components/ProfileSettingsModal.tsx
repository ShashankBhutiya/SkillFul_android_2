import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertCircle, Loader2, CheckCircle2, Unlink } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import UserModeSelect from "@/components/UserModeSelect";
import { useUserMode } from "@/hooks/useUserMode";
import type { UserMode } from "@/config/userMode";
import ThemeToggle from "@/components/ThemeToggle";
import {
    emptyInstitutionEnrollment,
    InstitutionEnrollmentFields,
    toStudentCodeClaim,
    validateInstitutionEnrollment,
    type InstitutionEnrollmentErrors,
    type InstitutionEnrollmentValue,
} from "@/components/InstitutionEnrollmentFields";
import {
    claimStudentCode,
    clearPendingStudentCodeClaim,
    formatStudentCodeClaimError,
    leaveStudentCollege,
} from "@/services/institutionService";
import { toast } from "@/hooks/use-toast";

const ACADEMIC_YEARS = ["1st year", "2nd year", "3rd year", "4th year", "5th year", "Postgraduate"];

interface ProfileSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    requireAcademicDetails?: boolean;
}

const ProfileSettingsModal = ({ isOpen, onClose, requireAcademicDetails = false }: ProfileSettingsModalProps) => {
    const { user, refreshProfile, updateProfileSettings, updateUserMode } = useAuth();
    const { mode } = useUserMode();
    const [modeSaving, setModeSaving] = useState(false);

    // Applied immediately rather than on Save — switching modes only changes
    // which categories are visible, and nothing about it is destructive.
    const handleModeChange = async (next: UserMode) => {
        if (next === mode || modeSaving) return;
        setModeSaving(true);
        try {
            await updateUserMode(next);
        } finally {
            setModeSaving(false);
        }
    };

    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [degree, setDegree] = useState("");
    const [academicYear, setAcademicYear] = useState("");
    const [phone, setPhone] = useState("");
    const [phoneConsent, setPhoneConsent] = useState(false);
    const [emailConsent, setEmailConsent] = useState(false);
    const [whatsappConsent, setWhatsappConsent] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);
    const [institutionEnrollment, setInstitutionEnrollment] = useState<InstitutionEnrollmentValue>(emptyInstitutionEnrollment);
    const [institutionErrors, setInstitutionErrors] = useState<InstitutionEnrollmentErrors>({});
    const [institutionLoading, setInstitutionLoading] = useState(false);
    const [collegeResetLoading, setCollegeResetLoading] = useState(false);

    // Initialize state when modal opens or user profile loads
    useEffect(() => {
        if (isOpen && user) {
            setFirstName(user.firstName || "");
            setLastName(user.lastName || "");
            setDegree(user.degree || "");
            setAcademicYear(user.academicYear || "");
            setPhone(user.phone || "");
            setPhoneConsent(!!user.phoneConsent);
            setEmailConsent(!!user.emailConsent);
            setWhatsappConsent(!!user.whatsappConsent);
            setError("");
            setSuccess("");
            setInstitutionEnrollment(emptyInstitutionEnrollment);
        }
    }, [isOpen, user]);

    const saveProfileFields = () => updateProfileSettings(
        phone.trim(),
        phoneConsent,
        emailConsent,
        whatsappConsent,
        firstName.trim(),
        lastName.trim(),
        degree.trim(),
        academicYear,
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        // Optional basic format check: if they entered a phone number, make sure it has some digits
        if (phone.trim() && !/^\+?[0-9\s\-()]{7,20}$/.test(phone.trim())) {
            setError("Please enter a valid phone number (e.g. +15550000000)");
            return;
        }

        if (requireAcademicDetails && (!degree.trim() || !academicYear.trim())) {
            setError("Enter your degree and select your current year to generate questions.");
            return;
        }

        const hasCollegeEntry = !!(
            institutionEnrollment.institutionId ||
            institutionEnrollment.code.trim() ||
            institutionEnrollment.rollNumber.trim()
        );
        if (hasCollegeEntry) {
            const validationErrors = validateInstitutionEnrollment(institutionEnrollment);
            setInstitutionErrors(validationErrors);
            if (Object.keys(validationErrors).length) {
                setError("Check the highlighted college details and try again.");
                return;
            }
        }
        const collegeClaim = hasCollegeEntry
            ? toStudentCodeClaim(institutionEnrollment, { degree, academicYear })
            : null;
        if (hasCollegeEntry && !collegeClaim) {
            setError("Select your college, enter your roll number, and enter the student code from your TPO.");
            return;
        }

        setLoading(true);

        try {
            const result = await saveProfileFields();
            if (result.error) {
                throw new Error(result.error);
            }

            let institutionName = "";
            if (collegeClaim) {
                institutionName = await claimStudentCode(collegeClaim, user.id);
                clearPendingStudentCodeClaim();
                await refreshProfile();
                setInstitutionEnrollment(emptyInstitutionEnrollment);
                setInstitutionErrors({});
            }

            const message = institutionName
                ? `Your settings were saved and you are now linked to ${institutionName}.`
                : "Your changes have been saved.";
            setSuccess(institutionName ? `College linked to ${institutionName}.` : "Settings updated successfully! ✨");
            toast({
                title: institutionName ? "College linked" : "Profile updated",
                description: message,
            });
            if (requireAcademicDetails) onClose();
        } catch (err: any) {
            const message = collegeClaim
                ? formatStudentCodeClaimError(err)
                : err?.message || "Your changes could not be saved. Please try again.";
            setError(message);
            toast({
                title: collegeClaim ? "College was not linked" : "Changes were not saved",
                description: message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleClaimCollege = async () => {
        if (loading || institutionLoading) return;
        setError("");
        setSuccess("");
        const validationErrors = validateInstitutionEnrollment(institutionEnrollment);
        setInstitutionErrors(validationErrors);
        if (Object.keys(validationErrors).length) {
            setError("Check the highlighted college details and try again.");
            return;
        }
        const claim = toStudentCodeClaim(institutionEnrollment, {
            degree,
            academicYear,
        });
        if (!claim) return;

        setInstitutionLoading(true);
        try {
            if (phone.trim() && !/^\+?[0-9\s\-()]{7,20}$/.test(phone.trim())) {
                throw new Error("Please enter a valid phone number before linking your college.");
            }
            const profileResult = await saveProfileFields();
            if (profileResult.error) throw new Error(profileResult.error);
            const institutionName = await claimStudentCode(claim, user.id);
            clearPendingStudentCodeClaim();
            await refreshProfile();
            setInstitutionEnrollment(emptyInstitutionEnrollment);
            setInstitutionErrors({});
            setSuccess(`You are now linked to ${institutionName}.`);
            toast({ title: "College linked", description: `You are now linked to ${institutionName}.` });
        } catch (err: any) {
            const message = formatStudentCodeClaimError(err);
            setError(message);
            toast({ title: "College was not linked", description: message, variant: "destructive" });
        } finally {
            setInstitutionLoading(false);
        }
    };

    const handleLeaveCollege = async () => {
        if (!window.confirm("Exit your linked college? Your college access will be removed and you will need a fresh student code to link again.")) {
            return;
        }

        setError("");
        setSuccess("");
        setCollegeResetLoading(true);
        try {
            const institutionName = await leaveStudentCollege();
            await refreshProfile();
            setSuccess(`You exited ${institutionName}. You can link another college with a fresh student code.`);
        } catch (err: any) {
            setError(err?.message || "Could not reset your college link. Please try again.");
        } finally {
            setCollegeResetLoading(false);
        }
    };

    if (user.isGuest) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.9, y: 30, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 0.9, y: 30, opacity: 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        onClick={(e) => e.stopPropagation()}
                        className="relative w-full max-w-sm max-h-[90vh] overflow-y-auto bg-card/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/10"
                    >
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 rounded-full bg-muted/50 hover:bg-muted transition-colors z-10"
                        >
                            <X className="w-4 h-4 text-muted-foreground" />
                        </button>

                        {/* Header */}
                        <div className="px-6 pt-8 pb-4 text-center">
                            <h2 className="text-2xl font-display font-bold text-foreground mb-1">
                                Profile Settings
                            </h2>
                            <p className="text-sm text-muted-foreground font-body">
                                Update your academic details and preferences
                            </p>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
                            {/* Student / Professional mode */}
                            <div className="space-y-2 rounded-2xl border border-border bg-muted/30 p-3">
                                <div className="flex items-center justify-between gap-2 px-1">
                                    <label className="text-xs font-bold text-muted-foreground">
                                        I am a
                                    </label>
                                    {modeSaving && (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                                    )}
                                </div>
                                <UserModeSelect
                                    value={mode}
                                    onChange={handleModeChange}
                                    variant="rows"
                                    disabled={modeSaving}
                                />
                                <p className="px-1 text-[11px] leading-relaxed text-muted-foreground/70">
                                    Switching changes which skills you see. Your progress and streak
                                    are kept for both — nothing is lost.
                                </p>
                            </div>

                            {/* Theme / Appearance */}
                            <div className="space-y-2 rounded-2xl border border-border bg-muted/30 p-3">
                                <label className="px-1 text-xs font-bold text-muted-foreground block">
                                    Appearance
                                </label>
                                <ThemeToggle variant="segmented" />
                                <p className="px-1 text-[11px] leading-relaxed text-muted-foreground/70">
                                    Choose between light and dark appearance.
                                </p>
                            </div>

                            {mode === "student" && (
                                <div className="space-y-3 rounded-2xl border border-border bg-muted/20 p-4">
                                    <p className="text-xs font-bold text-foreground">Academic details</p>
                                    <label className="block text-xs font-semibold text-muted-foreground">
                                        Degree / programme
                                        <input value={degree} onChange={(event) => setDegree(event.target.value)} maxLength={80} placeholder="e.g. B.Tech Computer Science" className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50" />
                                    </label>
                                    <label className="block text-xs font-semibold text-muted-foreground">
                                        Current year
                                        <select value={academicYear} onChange={(event) => setAcademicYear(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/50">
                                            <option value="">Select your year</option>
                                            {ACADEMIC_YEARS.map((year) => <option key={year} value={year}>{year}</option>)}
                                        </select>
                                    </label>
                                    <p className="text-[11px] leading-relaxed text-muted-foreground">Used to tailor practice questions. Update these here when your year changes.</p>
                                </div>
                            )}

                            {mode === "student" && !user.hasLinkedCollege && (
                                <div className="space-y-2 rounded-2xl border border-primary/25 bg-primary/5 p-3">
                                    <p className="px-1 text-xs font-bold text-foreground">Link my college</p>
                                    <InstitutionEnrollmentFields
                                        value={institutionEnrollment}
                                        onChange={(next) => {
                                            setInstitutionEnrollment(next);
                                            setInstitutionErrors({});
                                            if (error) setError("");
                                        }}
                                        errors={institutionErrors}
                                        disabled={loading || institutionLoading}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleClaimCollege}
                                        disabled={loading || institutionLoading}
                                        className="flex h-10 w-full items-center justify-center rounded-xl border border-primary/30 bg-primary/10 px-3 text-xs font-bold text-primary transition-colors hover:bg-primary/15 disabled:opacity-60"
                                    >
                                        {institutionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Link my college"}
                                    </button>
                                </div>
                            )}

                            {mode === "student" && user.hasLinkedCollege && (
                                <div className="space-y-3 rounded-2xl border border-primary/25 bg-primary/5 p-3">
                                    <div className="flex items-start gap-2">
                                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-foreground">College linked</p>
                                            <p className="mt-0.5 break-words text-sm font-semibold text-foreground">
                                                {user.linkedCollege?.name || "Linked college"}
                                            </p>
                                            {(user.linkedCollege?.city || user.linkedCollege?.rollNumber) && (
                                                <p className="mt-0.5 text-[11px] text-muted-foreground">
                                                    {[user.linkedCollege.city, user.linkedCollege.rollNumber ? `Roll no. ${user.linkedCollege.rollNumber}` : ""].filter(Boolean).join(" · ")}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => void handleLeaveCollege()}
                                        disabled={loading || collegeResetLoading}
                                        className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 text-xs font-bold text-destructive transition-colors hover:bg-destructive/15 disabled:opacity-60"
                                    >
                                        {collegeResetLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlink className="h-4 w-4" />}
                                        Exit / reset college
                                    </button>
                                    <p className="text-[10px] leading-relaxed text-muted-foreground">
                                        This removes your roster link and eligibility for the college student price. Ask your TPO for a fresh code if you need to join again.
                                    </p>
                                </div>
                            )}

                            {/* Name Input Grid */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-muted-foreground ml-1">First Name</label>
                                    <input
                                        type="text"
                                        placeholder="First Name"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        className="w-full px-4 py-3 bg-muted/30 backdrop-blur-sm rounded-xl border border-white/10 text-foreground text-sm font-body placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-card transition-all"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-muted-foreground ml-1">Last Name</label>
                                    <input
                                        type="text"
                                        placeholder="Last Name"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        className="w-full px-4 py-3 bg-muted/30 backdrop-blur-sm rounded-xl border border-white/10 text-foreground text-sm font-body placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-card transition-all"
                                    />
                                </div>
                            </div>

                            {/* Phone Input */}
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-muted-foreground ml-1">Phone Number</label>
                                <div className="relative group">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground flex items-center justify-center">📱</div>
                                    <input
                                        type="tel"
                                        placeholder="+1 (555) 000-0000"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-muted/30 backdrop-blur-sm rounded-xl border border-white/10 text-foreground text-sm font-body placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-card transition-all"
                                    />
                                </div>
                                
                                <p className="text-[10px] text-muted-foreground ml-1 pt-0.5">
                                    Provide your phone number to receive learning notifications.
                                </p>
                            </div>

                            {/* WhatsApp Updates Consent */}
                            <div
                                className="flex items-start gap-3 cursor-pointer group p-3 rounded-xl bg-muted/20 border border-white/5 hover:bg-muted/30 transition-colors"
                                onClick={() => setWhatsappConsent(!whatsappConsent)}
                            >
                                <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${whatsappConsent
                                    ? "bg-primary border-primary"
                                    : "border-muted-foreground/40 bg-transparent"
                                    }`}>
                                    {whatsappConsent && <CheckCircle2 className="w-3.5 h-3.5 text-primary-foreground" />}
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-foreground leading-tight">
                                        I consent to receive WhatsApp updates
                                    </p>
                                    <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">
                                        Get periodic reminders and study updates on WhatsApp.
                                    </p>
                                </div>
                            </div>

                            {/* SMS Updates Consent */}
                            <div
                                className="flex items-start gap-3 cursor-pointer group p-3 rounded-xl bg-muted/20 border border-white/5 hover:bg-muted/30 transition-colors"
                                onClick={() => setPhoneConsent(!phoneConsent)}
                            >
                                <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${phoneConsent
                                    ? "bg-primary border-primary"
                                    : "border-muted-foreground/40 bg-transparent"
                                    }`}>
                                    {phoneConsent && <CheckCircle2 className="w-3.5 h-3.5 text-primary-foreground" />}
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-foreground leading-tight">
                                        I consent to receive SMS updates
                                    </p>
                                    <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">
                                        Get rapid daily scenario notifications to keep your streak alive. Reply STOP to unsubscribe.
                                    </p>
                                </div>
                            </div>

                            {/* Email Updates Consent */}
                            <div
                                className="flex items-start gap-3 cursor-pointer group p-3 rounded-xl bg-muted/20 border border-white/5 hover:bg-muted/30 transition-colors"
                                onClick={() => setEmailConsent(!emailConsent)}
                            >
                                <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${emailConsent
                                    ? "bg-primary border-primary"
                                    : "border-muted-foreground/40 bg-transparent"
                                    }`}>
                                    {emailConsent && <CheckCircle2 className="w-3.5 h-3.5 text-primary-foreground" />}
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-foreground leading-tight">
                                        I consent to receive emails
                                    </p>
                                    <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">
                                        Receive newsletters, skill tips, and features announcements. You can unsubscribe anytime.
                                    </p>
                                </div>
                            </div>

                            {/* Error / Success Alerts */}
                            <AnimatePresence mode="wait">
                                {error && (
                                    <motion.div
                                        key="error"
                                        initial={{ opacity: 0, y: -5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -5 }}
                                        className="flex items-start gap-2 px-3 py-2 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-xs font-body"
                                    >
                                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                        <span>{error}</span>
                                    </motion.div>
                                )}
                                {success && (
                                    <motion.div
                                        key="success"
                                        initial={{ opacity: 0, y: -5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -5 }}
                                        className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-500 text-xs font-body"
                                    >
                                        <span>{success}</span>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Submit Button */}
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                type="submit"
                                disabled={loading}
                                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-display font-bold text-base shadow-lg disabled:opacity-60 transition-all flex items-center justify-center gap-2 mt-2"
                            >
                                {loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    "Save Changes"
                                )}
                            </motion.button>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default ProfileSettingsModal;
