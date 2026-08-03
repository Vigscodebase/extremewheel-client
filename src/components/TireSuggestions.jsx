import { Car, ImageOff, Sparkles } from "lucide-react";
import { useTireSuggestions } from "../hooks/queries/useActivity";

function specText(spec) {
  const tyre = spec?.tyre;
  const tyreText = tyre?.width && tyre?.aspect && tyre?.rim ? `${tyre.width}/${tyre.aspect} R${tyre.rim}` : "—";
  return { engine: spec?.engine || "—", tyre: tyreText };
}

function VehicleSuggestionCard({ vehicle }) {
  const photo = vehicle.beforeImage || vehicle.afterImage || vehicle.image || vehicle.gallery?.[0] || "";
  const existing = specText(vehicle.existingSpec);
  const upgraded = specText(vehicle.upgradedSpec);

  return (
    <div className="card suggestion-card">
      {photo ? (
        <div className="suggestion-photo-row">
          <div className="suggestion-photo">
            <img src={vehicle.beforeImage || vehicle.image || photo} alt={`${vehicle.name} before`} />
            <span className="suggestion-photo-tag">Before</span>
          </div>
          <div className="suggestion-photo">
            {vehicle.afterImage ? (
              <img src={vehicle.afterImage} alt={`${vehicle.name} after`} />
            ) : (
              <span className="suggestion-photo-fallback">
                <ImageOff size={16} />
              </span>
            )}
            <span className="suggestion-photo-tag">After</span>
          </div>
        </div>
      ) : (
        <div className="suggestion-photo-fallback suggestion-photo-fallback-block">
          <Car size={20} />
          <span>No photo saved for this vehicle</span>
        </div>
      )}

      <p className="suggestion-vehicle-name">
        {vehicle.name} <span className="text-muted fs-11">· {vehicle.type} · {vehicle.model}</span>
      </p>

      <div className="suggestion-spec-grid">
        <div className="suggestion-spec-col">
          <p className="suggestion-spec-col-title">Existing</p>
          <p className="suggestion-spec-row"><span>Engine</span>{existing.engine}</p>
          <p className="suggestion-spec-row"><span>Tyre</span>{existing.tyre}</p>
        </div>
        <div className="suggestion-spec-col upgraded">
          <p className="suggestion-spec-col-title">Upgraded</p>
          <p className="suggestion-spec-row"><span>Engine</span>{upgraded.engine}</p>
          <p className="suggestion-spec-row"><span>Tyre</span>{upgraded.tyre}</p>
        </div>
      </div>
    </div>
  );
}

// Preset / past-comparison / plus-size matches never have a photo or an
// existing/upgraded spec (they aren't vehicle records) — rendered as a
// compact chip instead of a full card, with the image column hidden
// entirely rather than showing an empty placeholder.
function ChipSuggestion({ icon: Icon, text }) {
  return (
    <div className="suggestion-chip">
      <Icon size={13} />
      <span>{text}</span>
    </div>
  );
}

/**
 * Renders "you've already saved something like this" suggestions for a
 * given tire spec — matching Tire Size Option presets, past Tire Size
 * Comparison / Calculator runs, past Plus Size saves, and Vehicle Notes
 * (the latter shown with before/after photos + existing/upgraded engine &
 * tyre spec). Renders nothing when there's no match, so it never clutters
 * a fresh/unmatched result.
 */
export default function TireSuggestions({ tire, label }) {
  const { data, isLoading } = useTireSuggestions(tire);

  const presets = data?.presets || [];
  const comparisons = data?.comparisons || [];
  const plusSizeSaves = data?.plusSizeSaves || [];
  const vehicles = data?.vehicles || [];
  const hasMatches = presets.length || comparisons.length || plusSizeSaves.length || vehicles.length;

  if (isLoading || !hasMatches) return null;

  return (
    <div className="suggestion-panel">
      <div className="suggestion-panel-head">
        <Sparkles size={15} />
        <h4>Matches found in your saved data{label ? ` for ${label}` : ""}</h4>
      </div>

      {vehicles.length > 0 && (
        <div className="suggestion-grid">
          {vehicles.map((v) => (
            <VehicleSuggestionCard key={v._id} vehicle={v} />
          ))}
        </div>
      )}

      {(presets.length > 0 || comparisons.length > 0 || plusSizeSaves.length > 0) && (
        <div className="suggestion-chip-row">
          {presets.map((p) => (
            <ChipSuggestion key={p._id} icon={Sparkles} text={`Saved preset — ${p.label}`} />
          ))}
          {comparisons.map((c) => (
            <ChipSuggestion key={c._id} icon={Sparkles} text={`Past comparison — ${c.summary}`} />
          ))}
          {plusSizeSaves.map((s) => (
            <ChipSuggestion key={s._id} icon={Sparkles} text={`Saved plus-size match — ${s.summary}`} />
          ))}
        </div>
      )}
    </div>
  );
}
