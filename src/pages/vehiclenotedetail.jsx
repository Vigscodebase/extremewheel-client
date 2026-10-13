import { ArrowLeft, Camera, Car, CircleAlert, FileText, Images, MessageSquare, Wrench } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Lightbox from "../components/lightbox";
import PageHeader from "../components/pageheader";
import { useAuth } from "../context/authcontext";
import { useVehicleNoteQuery } from "../hooks/queries/useVehicleNotes";

const has = (n) => n !== undefined && n !== null && n !== "";

function formatDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString();
}

function formatDateTime(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleString();
}

// "205/55 R16" — only when all three numbers are present, otherwise the
// individual Width / Aspect / Rim rows below carry whatever was recorded.
function tyreSize(tyre) {
  return has(tyre?.width) && has(tyre?.aspect) && has(tyre?.rim) ? `${tyre.width}/${tyre.aspect} R${tyre.rim}` : null;
}

function Detail({ label, wide = false, children }) {
  const empty = children === null || children === undefined || children === "";
  return (
    <div className={`vnd-detail${wide ? " is-wide" : ""}`}>
      <dt>{label}</dt>
      <dd className={empty ? "is-empty" : ""}>{empty ? "—" : children}</dd>
    </div>
  );
}

function SpecRow({ label, value }) {
  const empty = !has(value);
  return (
    <div className="vnd-spec-row">
      <dt>{label}</dt>
      <dd className={empty ? "is-empty" : ""}>{empty ? "—" : value}</dd>
    </div>
  );
}

function SpecColumn({ title, spec, upgraded = false }) {
  const tyre = spec?.tyre || {};
  return (
    <div className={`vnd-spec${upgraded ? " is-upgraded" : ""}`}>
      <h4 className="vnd-spec-title">{title}</h4>
      <dl className="vnd-spec-list">
        <SpecRow label="Engine" value={spec?.engine} />
        <SpecRow label="Tyre size" value={tyreSize(tyre)} />
        <SpecRow label="Width" value={tyre.width} />
        <SpecRow label="Aspect" value={tyre.aspect} />
        <SpecRow label="Rim" value={tyre.rim} />
      </dl>
    </div>
  );
}

function PhotoTile({ src, alt, onOpen, emptyLabel }) {
  if (!src) {
    return (
      <div className="vnd-photo is-empty">
        <span className="text-muted fs-11">{emptyLabel}</span>
      </div>
    );
  }
  return (
    <button type="button" className="vnd-photo" onClick={onOpen} aria-label={`View ${alt} full size`}>
      <img src={src} alt={alt} loading="lazy" />
    </button>
  );
}

export default function VehicleNoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  // Same rule the list page and the server use for internal staff notes.
  const isStaffOrAdmin = user?.role === "staff" || user?.role === "admin";

  const { data: vehicle, isLoading, isError, error } = useVehicleNoteQuery(id);
  const [lightboxIndex, setLightboxIndex] = useState(null);

  // Every photo on the record, in one ordered list, so the lightbox can step
  // through all of them: main photo (only if it's separate from "before"),
  // before, after, then the gallery.
  const photos = useMemo(() => {
    if (!vehicle) return [];
    const list = [];
    const name = vehicle.name || "Vehicle";
    if (vehicle.image && vehicle.image !== vehicle.beforeImage) {
      list.push({ key: "main", src: vehicle.image, label: `${name} — main photo` });
    }
    if (vehicle.beforeImage) list.push({ key: "before", src: vehicle.beforeImage, label: `${name} — before` });
    if (vehicle.afterImage) list.push({ key: "after", src: vehicle.afterImage, label: `${name} — after` });
    (vehicle.gallery || []).forEach((src, i) => {
      list.push({ key: `gallery-${i}`, src, label: `${name} — photo ${i + 1}` });
    });
    return list;
  }, [vehicle]);

  const lightboxImages = useMemo(() => photos.map(({ src, label }) => ({ src, label })), [photos]);

  const openPhoto = (key) => {
    const idx = photos.findIndex((p) => p.key === key);
    if (idx >= 0) setLightboxIndex(idx);
  };

  const backButton = (
    <button type="button" className="btn btn-ghost" onClick={() => navigate("/vehicle-notes")}>
      <ArrowLeft size={16} /> Back to list
    </button>
  );

  if (!vehicle) {
    const notFound = error?.response?.status === 404;
    return (
      <div>
        <PageHeader eyebrow="Extremewheel records" title="Vehicle details" action={backButton} />
        {isLoading ? (
          <p className="text-muted">Loading vehicle…</p>
        ) : (
          <div className="card vnd-state" role="alert">
            <CircleAlert size={22} />
            <p>
              {notFound
                ? "This vehicle couldn't be found. It may have been deleted."
                : error?.response?.data?.message || (isError ? "Couldn't load this vehicle. Please try again." : "Vehicle not found.")}
            </p>
          </div>
        )}
      </div>
    );
  }

  const heroSrc = vehicle.image || vehicle.beforeImage;
  const heroKey = vehicle.image && vehicle.image !== vehicle.beforeImage ? "main" : "before";
  const gallery = vehicle.gallery || [];
  const createdByName = typeof vehicle.createdBy === "object" ? vehicle.createdBy?.name : null;
  const notes = (vehicle.staffNotes || []).slice().reverse();
  const hasAnySpec = [vehicle.existingSpec, vehicle.upgradedSpec].some(
    (s) => s?.engine || has(s?.tyre?.width) || has(s?.tyre?.aspect) || has(s?.tyre?.rim)
  );

  return (
    <div className="vnd-page">
      <PageHeader
        eyebrow="Extremewheel records"
        title={vehicle.name}
        subtitle="Full details for this vehicle note."
        action={backButton}
      />

      <div className="vnd-stack">
        {/* ---------- Overview ---------- */}
        <section className="card vnd-card" aria-labelledby="vnd-overview-title">
          <div className="vnd-overview">
            {heroSrc ? (
              <button type="button" className="vnd-hero" onClick={() => openPhoto(heroKey)} aria-label="View main photo full size">
                <img src={heroSrc} alt={vehicle.name} />
              </button>
            ) : (
              <div className="vnd-hero is-empty" aria-hidden="true">
                <Car size={40} color="#C6C9D6" />
              </div>
            )}

            <div className="vnd-overview-info">
              <h3 id="vnd-overview-title" className="vnd-card-title">
                <FileText size={16} className="icon-inline" />
                Overview
              </h3>
              <div className="vnd-tags">
                {vehicle.make && <span className="badge badge-live">{vehicle.make}</span>}
                {vehicle.model && <span className="badge badge-model">{vehicle.model}</span>}
                {vehicle.type && <span className="badge badge-model">{vehicle.type}</span>}
              </div>

              <dl className="vnd-details">
                <Detail label="Vehicle name">{vehicle.name}</Detail>
                <Detail label="Make">{vehicle.make}</Detail>
                <Detail label="Model">{vehicle.model}</Detail>
                <Detail label="Type">{vehicle.type}</Detail>
                <Detail label="Year">{vehicle.year}</Detail>
                <Detail label="Event date">{formatDate(vehicle.eventDate)}</Detail>
                <Detail label="Added">{formatDateTime(vehicle.createdAt)}</Detail>
                <Detail label="Last updated">{formatDateTime(vehicle.updatedAt)}</Detail>
                {isStaffOrAdmin && <Detail label="Added by">{createdByName}</Detail>}
                {isStaffOrAdmin && <Detail label="Customer">{vehicle.customer?.fullName}</Detail>}
                {isStaffOrAdmin && <Detail label="Customer email">{vehicle.customer?.email}</Detail>}
                {isStaffOrAdmin && <Detail label="Customer phone">{vehicle.customer?.phone}</Detail>}
                {vehicle.offsetNotes && (
                  <Detail label="Offset / fitment notes" wide>
                    <span className="vnd-prewrap">{vehicle.offsetNotes}</span>
                  </Detail>
                )}
              </dl>
            </div>
          </div>
        </section>

        {/* ---------- Specifications ---------- */}
        <section className="card vnd-card" aria-labelledby="vnd-spec-title">
          <h3 id="vnd-spec-title" className="vnd-card-title">
            <Wrench size={16} className="icon-inline" />
            Existing vs. upgraded specification
          </h3>
          {hasAnySpec ? (
            <div className="vnd-spec-grid">
              <SpecColumn title="Existing (before)" spec={vehicle.existingSpec} />
              <SpecColumn title="Upgraded (after)" spec={vehicle.upgradedSpec} upgraded />
            </div>
          ) : (
            <p className="text-muted fs-11">No engine or tyre specification recorded.</p>
          )}
        </section>

        {/* ---------- Before & after ---------- */}
        <section className="card vnd-card" aria-labelledby="vnd-compare-title">
          <h3 id="vnd-compare-title" className="vnd-card-title">
            <Camera size={16} className="icon-inline" />
            Before &amp; after photos
          </h3>
          <div className="vnd-compare">
            <figure className="vnd-figure">
              <PhotoTile src={vehicle.beforeImage} alt="Before" emptyLabel="No before photo" onOpen={() => openPhoto("before")} />
              <figcaption>Before</figcaption>
            </figure>
            <figure className="vnd-figure">
              <PhotoTile src={vehicle.afterImage} alt="After" emptyLabel="No after photo" onOpen={() => openPhoto("after")} />
              <figcaption>After</figcaption>
            </figure>
          </div>
        </section>

        {/* ---------- Gallery ---------- */}
        <section className="card vnd-card" aria-labelledby="vnd-gallery-title">
          <h3 id="vnd-gallery-title" className="vnd-card-title">
            <Images size={16} className="icon-inline" />
            Image gallery ({gallery.length})
          </h3>
          {gallery.length === 0 ? (
            <p className="text-muted fs-11">No gallery photos yet.</p>
          ) : (
            <div className="vnd-gallery">
              {gallery.map((src, i) => (
                <PhotoTile key={`${i}-${src.slice(-24)}`} src={src} alt={`Gallery photo ${i + 1}`} onOpen={() => openPhoto(`gallery-${i}`)} />
              ))}
            </div>
          )}
        </section>

        {/* ---------- Internal staff notes (staff / admin only) ---------- */}
        {isStaffOrAdmin && (
          <section className="card vnd-card" aria-labelledby="vnd-notes-title">
            <h3 id="vnd-notes-title" className="vnd-card-title">
              <MessageSquare size={16} className="icon-inline" />
              Internal staff notes &amp; comments ({notes.length})
            </h3>
            {notes.length === 0 ? (
              <p className="text-muted fs-11">No internal notes yet.</p>
            ) : (
              <div className="staff-notes-list">
                {notes.map((n, i) => (
                  <div key={n._id || i} className="staff-note-row">
                    <div>
                      <p className="staff-note-text vnd-prewrap">{n.text}</p>
                      <p className="staff-note-meta">
                        {n.authorName || "Staff"} · {formatDateTime(n.createdAt) || "Unknown time"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      <Lightbox
        images={lightboxImages}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onIndexChange={setLightboxIndex}
      />
    </div>
  );
}
