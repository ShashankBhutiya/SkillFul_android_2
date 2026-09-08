import { CALL_CONSENT_TEXT } from "@/config/callConsent";

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export default function CallConsentCheckbox({ checked, onChange, disabled }: Props) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-muted/20 p-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        disabled={disabled}
        className="mt-0.5 h-5 w-5 shrink-0 accent-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      />
      <span>
        <span className="block text-xs font-semibold leading-relaxed text-foreground">{CALL_CONSENT_TEXT}</span>
        <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
          Optional. You can use Skillful without agreeing to calls. Turn this off in Profile Settings and save, or tell us during a call.
        </span>
      </span>
    </label>
  );
}
