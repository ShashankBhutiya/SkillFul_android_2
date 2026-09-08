/**
 * Pull the human-readable message out of a failed `supabase.functions.invoke`.
 *
 * supabase-js rejects a non-2xx edge function response with a FunctionsHttpError
 * whose own `.message` is always the generic "Edge Function returned a non-2xx
 * status code" — the useful text is in the unread `Response` on `.context`.
 * Without unwrapping it, every server-side failure looks identical to the user,
 * including a 429 that needs to say "wait and try again" rather than "payment
 * failed".
 *
 * The response is cloned before reading because the body can only be consumed
 * once and the caller may want it too.
 */
export const extractEdgeFunctionError = async (
  error: any,
  fallback = "An unknown error occurred.",
): Promise<string> => {
  if (!error) return fallback;

  if (error.context instanceof Response) {
    try {
      const data = await error.context.clone().json();
      return data.error || data.message || error.message || fallback;
    } catch {
      try {
        const text = await error.context.clone().text();
        return text || error.message || fallback;
      } catch {
        return error.message || fallback;
      }
    }
  }

  return error.message || fallback;
};

/** True when the edge function rejected the call as rate limited. */
export const isRateLimited = (error: any): boolean =>
  error?.context instanceof Response && error.context.status === 429;
