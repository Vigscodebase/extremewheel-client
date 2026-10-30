import { AlertCircle, CheckCircle2, Loader2, X } from "lucide-react";

// Floating "what is happening to my save" cards, bottom-right. The person can
// keep browsing, searching and even add the next vehicle while these update live.
//
// props:
//   saves      entries from hooks/useVehicleNoteSaves
//   onDismiss(clientRef)
//   onRetry(clientRef)     send the same save again
//   onReopen(save)         put the saved form back on screen to fix it
export default function SaveStatusTray({ saves, onDismiss, onRetry, onReopen }) {
  const visible = saves.filter((s) => !s.hidden);
  if (visible.length === 0) return null;

  return (
    <div className="save-tray" role="region" aria-label="Vehicle saves">
      {visible.map((s) => (
        <SaveCard key={s.clientRef} save={s} onDismiss={onDismiss} onRetry={onRetry} onReopen={onReopen} />
      ))}
    </div>
  );
}

const verb = (s) => (s.kind === "create" ? "Adding" : "Saving");

function describe(s) {
  switch (s.status) {
    case "sending":
      return { title: `${verb(s)} “${s.label}”`, detail: "Sending…" };
    case "queued":
      return { title: `${verb(s)} “${s.label}”`, detail: "In line — you can keep working." };
    case "processing":
      return {
        title: `${verb(s)} “${s.label}”`,
        detail: s.retrying ? "Hit a snag, trying again…" : "Saving photos and details…",
      };
    case "done":
      return { title: `“${s.label}” saved`, detail: s.kind === "create" ? "Added to your vehicles." : "Your changes are in." };
    default:
      return { title: `Couldn’t save “${s.label}”`, detail: s.message || "Something went wrong on our end." };
  }
}

function SaveCard({ save, onDismiss, onRetry, onReopen }) {
  const { title, detail } = describe(save);
  const working = save.status === "sending" || save.status === "queued" || save.status === "processing";
  const failed = save.status === "failed";

  return (
    <div className={`save-card save-card-${save.status}`} role={failed ? "alert" : "status"}>
      <span className="save-card-icon" aria-hidden="true">
        {working && <Loader2 size={18} className="save-spin" />}
        {save.status === "done" && <CheckCircle2 size={18} />}
        {failed && <AlertCircle size={18} />}
      </span>
      <div className="save-card-body">
        <p className="save-card-title">{title}</p>
        <p className="save-card-detail">{detail}</p>
        {working && <div className="save-card-bar" aria-hidden="true"><span /></div>}
        {failed && (
          <div className="save-card-actions">
            {save.payload && (
              <button type="button" className="save-card-btn primary" onClick={() => onRetry(save.clientRef)}>
                Try again
              </button>
            )}
            {save.formSnapshot && (
              <button type="button" className="save-card-btn" onClick={() => onReopen(save)}>
                Edit &amp; retry
              </button>
            )}
          </div>
        )}
      </div>
      {!working && (
        <button type="button" className="save-card-close" onClick={() => onDismiss(save.clientRef)} aria-label="Dismiss">
          <X size={14} />
        </button>
      )}
    </div>
  );
}
