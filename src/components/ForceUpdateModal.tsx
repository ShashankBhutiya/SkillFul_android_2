import { PLAY_STORE_URL } from "@/config/appVersion";

interface ForceUpdateModalProps {
  currentVersion: string;
  minimumVersion: string;
  updateMessage: string;
}

export default function ForceUpdateModal({
  currentVersion,
  minimumVersion,
  updateMessage,
}: ForceUpdateModalProps) {
  const handleUpdate = () => {
    window.open(PLAY_STORE_URL, "_system");
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        padding: "24px",
      }}
    >
      <div
        style={{
          backgroundColor: "#fff",
          borderRadius: "16px",
          padding: "32px 24px",
          maxWidth: "380px",
          width: "100%",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔄</div>
        <h2
          style={{
            fontSize: "22px",
            fontWeight: 700,
            color: "#1a1a1a",
            margin: "0 0 12px",
          }}
        >
          Update Required
        </h2>
        <p
          style={{
            fontSize: "15px",
            color: "#555",
            lineHeight: 1.5,
            margin: "0 0 8px",
          }}
        >
          {updateMessage ||
            "A new version of Skillful is available. Please update to continue using the app."}
        </p>
        <p
          style={{
            fontSize: "13px",
            color: "#999",
            margin: "0 0 24px",
          }}
        >
          Your version: {currentVersion} — Required: {minimumVersion}+
        </p>
        <button
          onClick={handleUpdate}
          style={{
            width: "100%",
            padding: "14px",
            fontSize: "16px",
            fontWeight: 600,
            color: "#fff",
            backgroundColor: "#4F46E5",
            border: "none",
            borderRadius: "12px",
            cursor: "pointer",
          }}
        >
          Update Now
        </button>
      </div>
    </div>
  );
}
