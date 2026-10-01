interface FunctionErrorPayload {
  error?: unknown;
  message?: unknown;
  code?: unknown;
  reference?: unknown;
}

function readablePayloadMessage(payload: FunctionErrorPayload): string | null {
  const message = typeof payload.error === "string"
    ? payload.error
    : typeof payload.message === "string" ? payload.message : null;
  if (!message) return null;
  const reference = typeof payload.reference === "string" && payload.reference
    ? ` Reference: ${payload.reference}.`
    : "";
  return `${message}${reference}`;
}

export async function extractFunctionError(
  error: unknown,
  fallback = "The service could not complete this request. Please try again.",
): Promise<string> {
  if (!error || typeof error !== "object") return fallback;
  const candidate = error as { context?: unknown; message?: unknown };

  if (candidate.context instanceof Response) {
    const response = candidate.context;
    try {
      const payload = await response.clone().json() as FunctionErrorPayload;
      const message = readablePayloadMessage(payload);
      if (message) return message;
    } catch {
      try {
        const text = (await response.clone().text()).trim();
        if (text && !/^edge function returned/i.test(text)) return text;
      } catch {
        // Use the status-aware fallback below.
      }
    }

    if (response.status === 401) return "Your session expired. Sign in again, then retry the payment.";
    if (response.status === 404) return "The payment service is still being updated. Please try again shortly.";
    if (response.status >= 500) return "The payment service could not start checkout. Please try again shortly.";
  }

  const message = typeof candidate.message === "string" ? candidate.message.trim() : "";
  if (message && !/^edge function returned a non-2xx status code$/i.test(message)) return message;
  return fallback;
}
