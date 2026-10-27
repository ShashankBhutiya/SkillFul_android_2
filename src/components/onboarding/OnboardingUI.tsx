import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import "@/components/onboarding/onboarding.css";

export function Brand({ centered = false, asset = "welcome" }: { centered?: boolean; asset?: string }) {
  return <div key={asset} className={`onboarding-brand ${centered ? "is-centered" : ""}`}><img src={`/onboarding/logo-${asset}.png`} width={40} height={40} alt="" /><span>Skillful</span></div>;
}
export function OnboardingShell({ children, kind = "", back }: { children: ReactNode; kind?: string; back?: () => void }) {
  return <main id="main-content" className="skillful-design onboarding-background"><div className={`onboarding-screen ${kind}`}>
    {back && <Button type="button" variant="ghost" size="icon" className="onboarding-back" onClick={back} aria-label="Go back"><ArrowLeft /></Button>}
    {children}
  </div></main>;
}
export function DetailField({ label, value, onChange, placeholder, options }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; options?: string[] }) {
  const id = `onboarding-${label.toLowerCase().replace(/[^a-z]+/g, "-")}`;
  return <div className="onboarding-field"><label htmlFor={id}>{label}</label>{options
    ? <Select value={value} onValueChange={onChange} required><SelectTrigger id={id} className="onboarding-input"><SelectValue placeholder={placeholder} /></SelectTrigger><SelectContent>{options.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select>
    : <Input id={id} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required maxLength={160} className="onboarding-input" />}</div>;
}
