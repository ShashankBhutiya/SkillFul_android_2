import { supabase } from "@/lib/supabase";
import { CALL_CONSENT_VERSION, isValidCallPhone, normalizeCallPhone } from "@/config/callConsent";

export interface CallConsent {
  enabled: boolean;
  phone: string | null;
  updated_at: string;
  consent_version: string;
}

export async function getCallConsent(userId: string): Promise<CallConsent | null> {
  if (!supabase) throw new Error("Call preferences are unavailable. Please try again later.");
  const { data, error } = await supabase.from("call_consents")
    .select("enabled, phone, updated_at, consent_version").eq("user_id", userId).maybeSingle();
  if (error) throw new Error("Could not load call preferences. Please try again later.");
  return data as CallConsent | null;
}

export async function saveCallConsent(enabled: boolean, phone: string): Promise<void> {
  if (enabled && !isValidCallPhone(phone)) {
    throw new Error("For phone calls, enter a valid number with its country code, such as +919876543210.");
  }
  if (!supabase) throw new Error("Call preferences are unavailable. Please try again later.");
  const { error } = await supabase.rpc("set_call_consent", {
    p_enabled: enabled,
    p_phone: enabled ? normalizeCallPhone(phone) : null,
    p_version: CALL_CONSENT_VERSION,
  });
  if (error) throw new Error("Could not save call preferences. Please try again before leaving this screen.");
}
