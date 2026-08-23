"use client";

/**
 * The root boundary. It replaces <html>, so it cannot rely on the app's fonts
 * or token sheet — everything here is inline and self-sufficient.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#131417",
          color: "#f2f3ef",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          padding: "1rem",
        }}
      >
        <main style={{ maxWidth: "32rem", border: "1px solid rgba(242,243,239,0.11)", padding: "1.25rem" }}>
          <p
            style={{
              margin: 0,
              fontSize: "0.6875rem",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#767c83",
            }}
          >
            Application error
          </p>
          <h1 style={{ margin: "0.5rem 0 0", fontSize: "1.375rem" }}>
            PinHub could not start
          </h1>
          <p style={{ margin: "0.5rem 0 0", fontSize: "0.8125rem", lineHeight: 1.6, color: "#a2a8ae" }}>
            The application failed before any page could render. Reloading
            usually clears it; if it does not, the deployment needs attention.
          </p>
          {error.digest ? (
            <p style={{ margin: "0.5rem 0 0", fontSize: "0.6875rem", color: "#767c83" }}>
              Reference {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1rem",
              minHeight: "2.25rem",
              padding: "0 0.75rem",
              background: "#292c31",
              color: "#f2f3ef",
              border: "1px solid rgba(242,243,239,0.26)",
              cursor: "pointer",
              font: "inherit",
              fontSize: "0.8125rem",
            }}
          >
            Reload PinHub
          </button>
        </main>
      </body>
    </html>
  );
}
