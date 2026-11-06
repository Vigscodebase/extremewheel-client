import { ArrowLeftRight, Download, FileSpreadsheet, Info, Layers, Ruler, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import PageHeader from "../components/pageheader";
import Tire3DVisualizer from "../components/Tire3DVisualizer";
import {
  useAppGuideFitment,
  useAppGuideMakes,
  useAppGuideModels,
  useAppGuideTypes,
  useAppGuideYears,
  useDownloadTechDataCsv,
  useImportTechDataCsv,
} from "../hooks/queries/useAppGuide";
import { useLogVehicleSearch } from "../hooks/queries/useActivity";
// import { useTireOptionsQuery } from "../hooks/queries/useTireOptions"; // hidden: Tire Size Option feature is switched off
import { useUpdateVehicleNote, useVehicleNotesQuery } from "../hooks/queries/useVehicleNotes";
import { usePermissions } from "../context/permissioncontext";
import { PERM } from "../utils/permissions";

const GLOSSARY = [
  { term: "Wheel Offset", def: "The distance (in mm) from the wheel's centerline to its mounting hub surface. Positive offset pulls the wheel face inward; negative pushes it outward." },
  { term: "Backspacing", def: "The distance from the mounting surface to the back edge of the rim - a quick way to estimate fender/suspension clearance." },
  { term: "Bolt Pattern", def: "Number of lugs and the diameter of the circle they sit on, e.g. 5x114.3 = 5 lugs on a 114.3mm circle." },
  { term: "Hub Bore", def: "The center hole diameter of the wheel - must be equal to or larger than the vehicle hub, with hub-centric rings used to take up any slack." },
  { term: "Wheel Code", def: "Manufacturer shorthand describing width, offset and bolt pattern together, printed on the back of the spoke." },
  { term: "Big Brake Clearance", def: "Whether the wheel/offset combination clears an upgraded (big) brake caliper - flagged per fitment where the source data has it." },
  { term: "Plus Size", def: "A larger wheel diameter paired with a lower-profile tire so the overall tire height stays close to the original. Listed per wheel diameter for each fitment." },
  { term: "Staggered Fitment", def: "Different tire sizes on the front and rear axle (usually wider at the rear). The Base size and Options 1-4 list each front / rear pair on file." },
  { term: "Load / Speed Rating", def: "The load index and speed symbol printed on the tire sidewall, shown together - e.g. 89H is a load index of 89 with a speed rating of H." },
];

// Wheel diameters covered by the Application Guide's F17..F30 upgrade-size
// columns (F17 = 15", ... F30 = 28" — see server/models/AppGuide.js).
const UPGRADE_DIAMETERS = Array.from({ length: 14 }, (_, i) => String(15 + i));

// Staggered fitment rows. "Base" is the OE staggered pair (Stagfront/Stagrear)
// and is the only pair that carries load / speed ratings in the source sheet.
const STAG_ROWS = [
  { label: "Base", front: "stagFront", rear: "stagRear", rated: true },
  { label: "Option 1", front: "stag1Front", rear: "stag1Rear" },
  { label: "Option 2", front: "stag2Front", rear: "stag2Rear" },
  { label: "Option 3", front: "stag3Front", rear: "stag3Rear" },
  { label: "Option 4", front: "stag4Front", rear: "stag4Rear" },
];

const has = (v) => v !== null && v !== undefined && String(v).trim() !== "";

// Parses tire size strings as they appear in the Application Guide workbook
// ("205 55 16", "245 35  20") as well as the usual "265/70R17" / "225/65 R17"
// spellings into {width, aspect, rim}. Returns null when the string doesn't
// match (free text etc.).
function parseTireSizeString(str) {
  if (!has(str)) return null;
  const match = String(str).match(/(\d{3})\s*[/\s]\s*(\d{2,3})\s*R?\s*(\d{2})/i);
  if (!match) return null;
  return { width: Number(match[1]), aspect: Number(match[2]), rim: Number(match[3]) };
}

const sizeLabel = (t) => (t ? `${t.width}/${t.aspect}R${t.rim}` : null);

// "205 55 16" -> "205/55R16" (same spelling the Tire Size Calculator uses).
// Anything that can't be parsed is shown as-is rather than hidden.
function formatTireSize(str) {
  const parsed = parseTireSizeString(str);
  if (parsed) return sizeLabel(parsed);
  return has(str) ? String(str).trim() : null;
}

// Load index + speed symbol are two separate columns in the sheet; they read
// as one value on a tire ("89H").
function loadSpeed(load, speed) {
  if (!has(load) && !has(speed)) return null;
  return `${has(load) ? String(load).trim() : ""}${has(speed) ? String(speed).trim() : ""}`;
}

const withUnit = (v, unit) => (has(v) ? `${String(v).trim()} ${unit}` : null);

function offsetRange(min, max) {
  if (!has(min) && !has(max)) return null;
  if (!has(min) || !has(max)) return `${String(has(min) ? min : max).trim()} mm`;
  return `${String(min).trim()} – ${String(max).trim()} mm`;
}

// Source sheet stores 0 for "no" and a non-zero code (50) when the fitment is a
// large-brake application.
function bigBrakeLabel(v) {
  if (!has(v)) return null;
  return Number(v) === 0 ? "No" : `Yes (${String(v).trim()})`;
}

function SpecTable({ rows }) {
  return (
    <div className="table-responsive">
      <table className="compare-table techdata-table">
        <thead>
          <tr>
            <th>Spec</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label}>
              <td className="compare-table-label">{label}</td>
              <td className="compare-table-value">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// A tire size that can be clicked to preview it in the 3D view (sizes that
// can't be parsed render as plain text).
function SizeButton({ size, activeSize, onPick, className = "", children }) {
  const parsed = parseTireSizeString(size);
  if (!parsed) return <span className={className}>{children}</span>;
  const isActive = activeSize && sizeLabel(parsed) === sizeLabel(activeSize);
  return (
    <button
      type="button"
      className={`techdata-size ${className}${isActive ? " is-active" : ""}`}
      onClick={() => onPick(parsed)}
      title="Preview in 3D"
      aria-pressed={!!isActive}
    >
      {children}
    </button>
  );
}

// Everything the Application Guide has for one fitment record, laid out in the
// same three-column card as the Tire Size Calculator (inputs | 3D tire |
// spec table) with the plus-size and staggered fitments underneath, so the
// whole record fits on one laptop screen without scrolling.
function FitmentDetails({ record, preview, onPreview }) {
  const baseSize = parseTireSizeString(record.txtTireSize);

  const plusRows = UPGRADE_DIAMETERS
    .map((d) => ({ diameter: d, size: record.upgradeSizeByDiameter?.[d] }))
    .filter((row) => has(row.size));

  const stagRows = STAG_ROWS
    .map((row) => ({
      label: row.label,
      front: record[row.front],
      rear: record[row.rear],
      frontRating: row.rated ? loadSpeed(record.loadStagFront, record.speedStagFront) : null,
      rearRating: row.rated ? loadSpeed(record.loadStagRear, record.speedStagRear) : null,
    }))
    .filter((row) => has(row.front) || has(row.rear));

  // Which size the 3D view is showing: whatever was last clicked, otherwise the
  // base size (falling back to the next best size on file for rows that don't
  // have a base size).
  const fallbackSize =
    baseSize ||
    parseTireSizeString(record.txtOptTireSize) ||
    parseTireSizeString(record.stagFront) ||
    parseTireSizeString(plusRows[0]?.size);
  const shown = preview || fallbackSize;

  // Every spec the record has, split into two balanced Spec | Value tables so
  // the column stays short enough for a laptop screen.
  const specRows = [
    ["Tire size", formatTireSize(record.txtTireSize)],
    ["Load / speed", loadSpeed(record.loadTireSize, record.speedTireSize)],
    ["Optional tire size", formatTireSize(record.txtOptTireSize)],
    ["Opt. load / speed", loadSpeed(record.loadOptTireSize, record.speedOptTireSize)],
    ["Bolt pattern", record.txtBolt],
    ["Lug", record.txtLug],
    ["Hub bore", withUnit(record.txtHub, "mm")],
    ["Offset", withUnit(record.txtOffset, "mm")],
    ["Front offset range", offsetRange(record.minOffset, record.maxOffset)],
    ["Rear offset range", offsetRange(record.minOffsetRear, record.maxOffsetRear)],
    ["Big brake", bigBrakeLabel(record.bigBrake)],
  ].filter(([, value]) => has(value));
  const specColumns =
    specRows.length > 4
      ? [specRows.slice(0, Math.ceil(specRows.length / 2)), specRows.slice(Math.ceil(specRows.length / 2))]
      : [specRows];

  const refIds = [
    ["Record ID", record.sourceId],
    ["Make ID", record.makeId],
    ["Model ID", record.modelId],
    ["Year ID", record.yearId],
    ["Submodel ID", record.submodelId],
    ["Option ID", record.optionId],
  ].filter(([, v]) => has(v));

  return (
    <>
      <div className="techdata-tire">
        {shown ? (
          <>
            <Tire3DVisualizer tire={shown} label={sizeLabel(shown)} accent="#FF6F91" height={190} variant="calculator" />
            <p className="techdata-tire-hint">Click any size below to preview it</p>
          </>
        ) : (
          <div className="techdata-empty techdata-empty--small">No tire size on file to preview.</div>
        )}
      </div>

      <div className="techdata-specs">
        <div className="techdata-spec-tables">
          {specColumns.map((rows, i) => (
            <SpecTable key={i} rows={rows} />
          ))}
        </div>
      </div>

      <div className="techdata-fit">
        <section className="techdata-panel">
          <h4>
            <Layers size={14} className="icon-inline-sm" />
            Plus size recommendations — single
          </h4>
          {plusRows.length === 0 ? (
            <p className="techdata-none">No plus-size recommendations on file for this fitment.</p>
          ) : (
            <ul className="techdata-plus-grid">
              {plusRows.map((row) => (
                <li key={row.diameter}>
                  <SizeButton size={row.size} activeSize={shown} onPick={onPreview} className="techdata-plus">
                    <span className="techdata-plus-dia">
                      {row.diameter}"
                      {baseSize && sizeLabel(baseSize) === formatTireSize(row.size) && <em>OE</em>}
                    </span>
                    <span className="techdata-plus-size">{formatTireSize(row.size)}</span>
                  </SizeButton>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="techdata-panel">
          <h4>
            <ArrowLeftRight size={14} className="icon-inline-sm" />
            Plus size recommendations — staggered (front / rear)
          </h4>
          {stagRows.length === 0 ? (
            <p className="techdata-none">No staggered fitments on file for this fitment.</p>
          ) : (
            <div className="table-responsive">
              <table className="compare-table techdata-table techdata-stag-table">
                <thead>
                  <tr>
                    <th>Option</th>
                    <th>Front</th>
                    <th>Rear</th>
                  </tr>
                </thead>
                <tbody>
                  {stagRows.map((row) => (
                    <tr key={row.label}>
                      <td className="compare-table-label">{row.label}</td>
                      <td className="compare-table-value">
                        {has(row.front) ? (
                          <>
                            <SizeButton size={row.front} activeSize={shown} onPick={onPreview}>{formatTireSize(row.front)}</SizeButton>
                            {row.frontRating && <span className="techdata-rating">{row.frontRating}</span>}
                          </>
                        ) : "—"}
                      </td>
                      <td className="compare-table-value">
                        {has(row.rear) ? (
                          <>
                            <SizeButton size={row.rear} activeSize={shown} onPick={onPreview}>{formatTireSize(row.rear)}</SizeButton>
                            {row.rearRating && <span className="techdata-rating">{row.rearRating}</span>}
                          </>
                        ) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {(has(record.wheelCode) || refIds.length > 0) && (
        <div className="techdata-foot">
          {has(record.wheelCode) && (
            <p className="techdata-note">
              <Info size={14} className="icon-inline-sm" />
              <span>
                <strong>Wheel code / note:</strong> {record.wheelCode}
              </span>
            </p>
          )}
          {/* {refIds.length > 0 && (
            <p className="techdata-refs">{refIds.map(([label, v]) => `${label} ${String(v).trim()}`).join(" · ")}</p>
          )} */}
        </div>
      )}
    </>
  );
}

export default function TechData() {
  const [tab, setTab] = useState("lookup"); // "lookup" | "manual" | "csv" | "guide"
  // The second tab (CSV import / export) is its own per-user permission.
  const { can } = usePermissions();
  const canUseCsvTab = can(PERM.TECH_DATA_CSV_TAB);

  return (
    <div className="techdata-page">
      <PageHeader
        eyebrow="Wheel fitment"
        title="Tech Data"
        // subtitle="Static fitment reference plus wheel offset lookups sourced from the Application Guide, Vehicle Notes and Tire Size Options." // hidden: Tire Size Option is switched off
        subtitle="Static fitment reference plus wheel offset lookups sourced from the Application Guide and Vehicle Notes."
      />

      <div className="range-toggle">
        <button type="button" className={tab === "lookup" ? "active" : ""} onClick={() => setTab("lookup")}>Vehicle lookup</button>
        {/* <button type="button" className={tab === "manual" ? "active" : ""} onClick={() => setTab("manual")}>Manual reference</button> */}
        {/* {canUseCsvTab && <button type="button" className={tab === "csv" ? "active" : ""} onClick={() => setTab("csv")}>CSV import / export</button>} */}
        <button type="button" className={tab === "guide" ? "active" : ""} onClick={() => setTab("guide")}>Guide</button>
      </div>

      {/* The glossary only renders on the Guide tab now — on every other tab it
          was pushing results below the fold, so results on those tabs now fit
          in one screen without a vertical scrollbar. */}
      {tab === "guide" && (
        <div className="card mb-20">
          <h3 className="mb-10">
            <Info size={16} className="icon-inline" />
            Wheel & offset glossary
          </h3>
          <div className="preset-grid">
            {GLOSSARY.map((g) => (
              <div key={g.term} className="card p-14">
                <p className="preset-label">{g.term}</p>
                <p className="text-muted fs-13 leading-relaxed">{g.def}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "lookup" && <VehicleLookupTab />}
      {tab === "manual" && <ManualReferenceTab />}
      {tab === "csv" && canUseCsvTab && <CsvImportExportTab />}
    </div>
  );
}

function VehicleLookupTab() {
  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [typeOption, setTypeOption] = useState("");
  const [recordIndex, setRecordIndex] = useState(0); // when one selection matches several fitment rows
  const [preview, setPreview] = useState(null); // { recordId, tire } — size clicked for the 3D view
  const logSearch = useLogVehicleSearch();
  const loggedKey = useRef("");

  const { data: years, isLoading: loadingYears } = useAppGuideYears();
  const { data: makes, isLoading: loadingMakes } = useAppGuideMakes(year);
  const { data: models, isLoading: loadingModels } = useAppGuideModels(year, make);
  const { data: types, isLoading: loadingTypes } = useAppGuideTypes(year, make, model);

  const [selType, selOption] = typeOption ? typeOption.split("|") : [null, null];
  const { data: fitment, isLoading: loadingFitment } = useAppGuideFitment(year, make, model, selType, selOption);

  const onYearChange = (e) => {
    setYear(e.target.value);
    setMake("");
    setModel("");
    setTypeOption("");
    setRecordIndex(0);
  };
  const onMakeChange = (e) => {
    setMake(e.target.value);
    setModel("");
    setTypeOption("");
    setRecordIndex(0);
  };
  const onModelChange = (e) => {
    setModel(e.target.value);
    setTypeOption("");
    setRecordIndex(0);
  };
  const onTypeChange = (e) => {
    setTypeOption(e.target.value);
    setRecordIndex(0);
  };

  useEffect(() => {
    if (!fitment || fitment.length === 0) return;
    const key = `${year}|${make}|${model}|${selType}|${selOption || ""}`;
    if (loggedKey.current === key) return;
    loggedKey.current = key;
    logSearch.mutate({ year, make, model, type: selType, option: selOption || undefined });
  }, [fitment]); // eslint-disable-line react-hooks/exhaustive-deps

  const step = !year ? 1 : !make ? 2 : !model ? 3 : !typeOption ? 4 : 5;

  const records = fitment || [];
  const record = records.length > 0 ? records[Math.min(recordIndex, records.length - 1)] : null;
  // A clicked size only applies to the record it was clicked on.
  const previewTire = record && preview?.recordId === record._id ? preview.tire : null;

  let emptyMessage = null;
  if (step === 1) emptyMessage = "Start by selecting a year.";
  else if (step === 2) emptyMessage = "Now select a make.";
  else if (step === 3) emptyMessage = "Now select a model.";
  else if (step === 4) emptyMessage = "Now select a type to see the wheel offset chart.";
  else if (loadingFitment) emptyMessage = "Loading wheel offset data…";
  else if (!record) emptyMessage = "No tech data on file for this fitment.";

  return (
    <div className="card techdata-card">
      <div className={`techdata-grid${emptyMessage ? " techdata-grid--empty" : ""}`}>
        <div className="techdata-select">
          <h3>
            <Ruler size={16} className="icon-inline" />
            Find a vehicle
          </h3>
          <div className="techdata-fields">
            <div className="field">
              <label>Year</label>
              <select value={year} onChange={onYearChange} disabled={loadingYears}>
                <option value="">{loadingYears ? "Loading…" : "Select year"}</option>
                {(years || []).map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Make</label>
              <select value={make} onChange={onMakeChange} disabled={!year || loadingMakes}>
                <option value="">{!year ? "Select year first" : loadingMakes ? "Loading…" : "Select make"}</option>
                {(makes || []).map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Model</label>
              <select value={model} onChange={onModelChange} disabled={!make || loadingModels}>
                <option value="">{!make ? "Select make first" : loadingModels ? "Loading…" : "Select model"}</option>
                {(models || []).map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Type / Option</label>
              <select value={typeOption} onChange={onTypeChange} disabled={!model || loadingTypes} title={typeOption ? typeOption.replace("|", " — ").replace(/ — $/, "") : undefined}>
                <option value="">{!model ? "Select model first" : loadingTypes ? "Loading…" : "Select type"}</option>
                {(types || []).map((t) => (
                  <option key={`${t.type}|${t.option}`} value={`${t.type}|${t.option || ""}`}>
                    {t.type}{t.option ? ` — ${t.option}` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {emptyMessage ? (
          <div className="techdata-empty">{emptyMessage}</div>
        ) : (
          <>
            <div className="techdata-heading">
              <h3>
                {year} {make} {model} — {selType}{selOption ? ` (${selOption})` : ""}
              </h3>
              {records.length > 1 && (
                <div className="range-toggle techdata-records" role="tablist" aria-label="Fitment records">
                  {records.map((r, i) => (
                    <button
                      key={r._id}
                      type="button"
                      role="tab"
                      aria-selected={i === recordIndex}
                      className={i === recordIndex ? "active" : ""}
                      onClick={() => setRecordIndex(i)}
                    >
                      {[r.txtOption, formatTireSize(r.txtTireSize)].filter(has).join(" · ") || `Fitment ${i + 1}`}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <FitmentDetails
              key={record._id}
              record={record}
              preview={previewTire}
              onPreview={(tire) => setPreview({ recordId: record._id, tire })}
            />
          </>
        )}
      </div>
    </div>
  );
}

function ManualReferenceTab() {
  const { data: vehicles, isLoading } = useVehicleNotesQuery();
  // Hidden: no Tire Size Option data is fetched or checked any more.
  // const { data: tireOptions } = useTireOptionsQuery();
  const updateVehicle = useUpdateVehicleNote();
  const [selectedId, setSelectedId] = useState("");
  const [notes, setNotes] = useState("");
  const [savedMsg, setSavedMsg] = useState("");

  const vehicle = (vehicles || []).find((v) => v._id === selectedId);

  const onSelectVehicle = (e) => {
    const id = e.target.value;
    setSelectedId(id);
    const v = (vehicles || []).find((x) => x._id === id);
    setNotes(v?.offsetNotes || "");
    setSavedMsg("");
  };

  const save = async () => {
    if (!vehicle) return;
    await updateVehicle.mutateAsync({ id: vehicle._id, offsetNotes: notes });
    setSavedMsg("Saved.");
  };

  return (
    <div className="card">
      {/* Hidden: "or tire preset" (Tire Size Option presets are switched off)
      <h3 className="mb-4">Reference an existing vehicle note or tire preset</h3>
      */}
      <h3 className="mb-4">Reference an existing vehicle note</h3>
      <p className="text-muted mb-16">
        For fitments not yet in the Application Guide dataset, record offset/backspacing reference notes directly against a Vehicle Note.
      </p>

      <div className="field field-mb">
        <label>Vehicle Note</label>
        <select value={selectedId} onChange={onSelectVehicle} disabled={isLoading}>
          <option value="">{isLoading ? "Loading…" : "Select a vehicle"}</option>
          {(vehicles || []).map((v) => (
            <option key={v._id} value={v._id}>{v.name} — {v.make} {v.model} ({v.type})</option>
          ))}
        </select>
      </div>

      {vehicle && (
        <>
          <div className="vehicle-tags mb-14">
            <span className="badge badge-live">{vehicle.make}</span>
            <span className="badge badge-model">{vehicle.model}</span>
            <span className="badge badge-model">{vehicle.type}</span>
          </div>

          {/* Hidden: "Related tire size preset" (Tire Size Option presets are switched off)
          <div className="field field-mb">
            <label>Related tire size preset (reference only)</label>
            <select defaultValue="">
              <option value="">— none —</option>
              {(tireOptions || []).map((p) => (
                <option key={p._id} value={p._id}>{p.label} — {p.width}/{p.aspect} R{p.rim}</option>
              ))}
            </select>
          </div>
          */}

          <div className="field field-mb-lg">
            <label>Wheel offset / fitment notes</label>
            <textarea
              rows={5}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Confirmed +38mm offset, 5x114.3, hub-centric rings fitted…"
              className="textarea-resize-v"
            />
          </div>

          <div className="modal-actions modal-actions-start">
            <button type="button" className="btn btn-accent" onClick={save} disabled={updateVehicle.isPending}>
              {updateVehicle.isPending ? "Saving…" : "Save reference notes"}
            </button>
            {savedMsg && <span className="text-muted align-self-center">{savedMsg}</span>}
          </div>
        </>
      )}
    </div>
  );
}

function CsvImportExportTab() {
  const downloadCsv = useDownloadTechDataCsv();
  const importCsv = useImportTechDataCsv();
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState("");
  const fileInputRef = useRef(null);

  const onFileChosen = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError("");
    setImportResult(null);
    try {
      const text = await file.text();
      const result = await importCsv.mutateAsync(text);
      setImportResult(result);
    } catch (err) {
      setImportError(err?.response?.data?.message || "Import failed. Check the CSV format and try again.");
    } finally {
      e.target.value = "";
    }
  };

  return (

    <div className="card">
      <h3 className="mb-4">
        <FileSpreadsheet size={16} className="icon-inline" />
        Tech Data CSV
      </h3>
      <p className="text-muted mb-16">
        Download the current fitment / wheel-offset dataset as CSV, edit it, and re-upload — columns match exactly so a round trip is safe.
      </p>

      <div className="modal-actions modal-actions-start gap-12">
        <button
          type="button"
          className="btn btn-accent"
          onClick={() => downloadCsv.mutate({})}
          disabled={downloadCsv.isPending}
        >
          <Download size={16} /> {downloadCsv.isPending ? "Preparing…" : "Download CSV"}
        </button>

        <button type="button" className="btn btn-ghost" onClick={() => fileInputRef.current?.click()} disabled={importCsv.isPending}>
          <Upload size={16} /> {importCsv.isPending ? "Uploading…" : "Upload CSV"}
        </button>
        <input ref={fileInputRef} type="file" accept=".csv,text/csv" hidden onChange={onFileChosen} />
      </div>

      {importError && <div className="alert-error mt-16">{importError}</div>}

      {importResult && (
        <div className="card empty-state-card mt-16 text-left">
          Imported {importResult.processed} row(s), skipped {importResult.skipped} incomplete row(s), out of {importResult.total} total.
        </div>
      )}
    </div>
  );
}
