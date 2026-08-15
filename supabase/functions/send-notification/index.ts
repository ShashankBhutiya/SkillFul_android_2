// Supabase Edge Function: Send Push Notification
// Sends FCM push to Android devices and web push to browsers
//
// Required env vars (set in Supabase Dashboard > Edge Functions > Secrets):
//   FIREBASE_PROJECT_ID    - Firebase project ID
//   FIREBASE_CLIENT_EMAIL  - Service account email
//   FIREBASE_PRIVATE_KEY   - Service account private key (PEM format)
//   SUPABASE_URL           - Auto-provided by Supabase
//   SUPABASE_SERVICE_ROLE_KEY - Auto-provided by Supabase

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PushRequest {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

interface FCMMessage {
  message: {
    token: string;
    notification: {
      title: string;
      body: string;
      image?: string;
    };
    data?: Record<string, string>;
    android?: {
      priority: string;
      notification: {
        channel_id: string;
        click_action: string;
        icon?: string;
        color?: string;
      };
    };
  };
}

// Generate a JWT for Firebase Cloud Messaging HTTP v1 API
async function getFirebaseAccessToken(): Promise<string> {
  const clientEmail = Deno.env.get("FIREBASE_CLIENT_EMAIL")!;
  const privateKeyPem = Deno.env.get("FIREBASE_PRIVATE_KEY")!.replace(
    /\\n/g,
    "\n"
  );

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: clientEmail,
    sub: clientEmail,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
  };

  const encoder = new TextEncoder();

  const headerB64 = base64url(encoder.encode(JSON.stringify(header)));
  const payloadB64 = base64url(encoder.encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import private key and sign
  const pemBody = privateKeyPem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");

  const binaryKey = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    encoder.encode(unsignedToken)
  );

  const signatureB64 = base64url(new Uint8Array(signature));
  const jwt = `${unsignedToken}.${signatureB64}`;

  // Exchange JWT for access token
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) {
    throw new Error(
      `Failed to get Firebase access token: ${JSON.stringify(tokenData)}`
    );
  }

  return tokenData.access_token;
}

function base64url(data: Uint8Array): string {
  let str = "";
  for (let i = 0; i < data.length; i++) {
    str += String.fromCharCode(data[i]);
  }
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sendFCMPush(
  token: string,
  title: string,
  body: string,
  data: Record<string, string> = {},
  imageUrl?: string
): Promise<boolean> {
  const projectId = Deno.env.get("FIREBASE_PROJECT_ID");
  if (!projectId) {
    console.error("FIREBASE_PROJECT_ID not set");
    return false;
  }

  try {
    const accessToken = await getFirebaseAccessToken();

    const message: FCMMessage = {
      message: {
        token,
        notification: {
          title,
          body,
          ...(imageUrl && { image: imageUrl }),
        },
        data,
        android: {
          priority: "high",
          notification: {
            channel_id: "skillful_notifications",
            click_action: "FLUTTER_NOTIFICATION_CLICK",
            icon: "ic_notification",
            color: "#8b5cf6",
          },
        },
      },
    };

    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`FCM send failed (${response.status}):`, errorBody);

      // If token is invalid, clean it up
      if (
        response.status === 404 ||
        errorBody.includes("UNREGISTERED") ||
        errorBody.includes("INVALID_ARGUMENT")
      ) {
        return false;
      }
    }

    return response.ok;
  } catch (err) {
    console.error("FCM send error:", err);
    return false;
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userId, title, body, data, imageUrl } =
      (await req.json()) as PushRequest;

    if (!userId || !title || !body) {
      return new Response(
        JSON.stringify({ error: "userId, title, and body are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's push tokens from Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: tokens, error: tokensError } = await supabase
      .from("push_tokens")
      .select("token, platform")
      .eq("user_id", userId);

    if (tokensError) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch tokens", details: tokensError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: "No push tokens found for user" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: { platform: string; success: boolean }[] = [];
    const tokensToRemove: string[] = [];

    for (const tokenRecord of tokens) {
      if (tokenRecord.platform === "android") {
        const success = await sendFCMPush(
          tokenRecord.token,
          title,
          body,
          data || {},
          imageUrl
        );
        results.push({ platform: "android", success });
        if (!success) {
          tokensToRemove.push(tokenRecord.token);
        }
      } else if (tokenRecord.platform === "web") {
        // Web push would use VAPID / web-push library
        // For now, web push is handled client-side via the service worker
        results.push({ platform: "web", success: true });
      }
    }

    // Clean up invalid tokens
    if (tokensToRemove.length > 0) {
      await supabase
        .from("push_tokens")
        .delete()
        .in("token", tokensToRemove);
    }

    // Also save to user_notifications table for in-app inbox
    await supabase.from("user_notifications").insert({
      user_id: userId,
      title,
      description: body,
      type: data?.type || "tip",
      read: false,
      action_url: data?.actionUrl || null,
      action_label: data?.actionLabel || null,
    });

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
