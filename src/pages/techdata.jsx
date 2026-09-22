import { Download, FileSpreadsheet, Info, Ruler, Upload } from "lucide-react";
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
import { useTireOptionsQuery } from "../hooks/queries/useTireOptions";
import { useUpdateVehicleNote, useVehicleNotesQuery } from "../hooks/queries/useVehicleNotes";
import { useAuth } from "../context/authcontext";

const GLOSSARY = [
  { term: "Wheel Offset", def: "The distance (in mm) from the wheel's centerline to its mounting hub surface. Positive offset pulls the wheel face inward; negative pushes it outward." },
  { term: "Backspacing", def: "The distance from the mounting surface to the back edge of the rim - a quick way to estimate fender/suspension clearance." },
  { term: "Bolt Pattern", def: "Number of lugs and the diameter of the circle they sit on, e.g. 5x114.3 = 5 lugs on a 114.3mm circle." },
  { term: "Hub Bore", def: "The center hole diameter of the wheel - must be equal to or larger than the vehicle hub, with hub-centric rings used to take up any slack." },
  { term: "Wheel Code", def: "Manufacturer shorthand describing width, offset and bolt pattern together, printed on the back of the spoke." },
  { term: "Big Brake Clearance", def: "Whether the wheel/offset combination clears an upgraded (big) brake caliper - flagged per fitment where the source data has it." },
];

function OffsetRow({ label, value }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <tr>
      <td className="compare-table-label">{label}</td>
      <td className="compare-table-value">{value}</td>
    </tr>
  );
}

// Parses common tire size strings like "265/70R17" or "225/65 R17" into
// {width, aspect, rim}; returns null when the source string doesn't match
// (some fitment rows only carry an "optional" size, free text, etc).
function parseTireSizeString(str) {
  if (!str) return null;
  const match = String(str).match(/(\d{3})\s*\/\s*(\d{2,3})\s*R?\s*(\d{2})/i);
  if (!match) return null;
  return { width: Number(match[1]), aspect: Number(match[2]), rim: Number(match[3]) };
}

function WheelOffsetChart({ record, show3D = true }) {
  const tire = show3D ? parseTireSizeString(record.txtTireSize) : null;
  return (
    <div className="tire3d-grid">
      <table className="compare-table">
        <tbody>
          <OffsetRow label="Tire size" value={record.txtTireSize} />
          <OffsetRow label="Optional tire size" value={record.txtOptTireSize} />
          <OffsetRow label="Bolt pattern" value={record.txtBolt} />
          <OffsetRow label="Lug" value={record.txtLug} />
          <OffsetRow label="Hub bore" value={record.txtHub} />
          <OffsetRow label="Offset" value={record.txtOffset} />
          <OffsetRow label="Offset range (front)" value={record.minOffset && record.maxOffset ? `${record.minOffset} – ${record.maxOffset}` : null} />
          <OffsetRow label="Offset range (rear)" value={record.minOffsetRear && record.maxOffsetRear ? `${record.minOffsetRear} – ${record.maxOffsetRear}` : null} />
          <OffsetRow label="Wheel code" value={record.wheelCode} />
          <OffsetRow label="Big brake clearance" value={record.bigBrake} />
        </tbody>
      </table>
      {tire && <Tire3DVisualizer tire={tire} label={`${tire.width}/${tire.aspect}R${tire.rim}`} height={220} />}
    </div>
  );
}

export default function TechData() {
  const [tab, setTab] = useState("lookup"); // "lookup" | "manual" | "csv" | "guide"
  const { user } = useAuth();

  return (
    <div>
      <PageHeader
        eyebrow="Wheel fitment"
        title="Tech Data"
        subtitle="Static fitment reference plus wheel offset lookups sourced from the Application Guide, Vehicle Notes and Tire Size Options."
      />

      <div className="range-toggle mb-20">
        <button type="button" className={tab === "lookup" ? "active" : ""} onClick={() => setTab("lookup")}>Vehicle lookup</button>
        {/* <button type="button" className={tab === "manual" ? "active" : ""} onClick={() => setTab("manual")}>Manual reference</button> */}
        {user.role !== "guest" && <button type="button" className={tab === "csv" ? "active" : ""} onClick={() => setTab("csv")}>CSV import / export</button>}
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
      {tab === "csv" && <CsvImportExportTab />}
    </div>
  );
}

function VehicleLookupTab() {
  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [typeOption, setTypeOption] = useState("");
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
  };
  const onMakeChange = (e) => {
    setMake(e.target.value);
    setModel("");
    setTypeOption("");
  };
  const onModelChange = (e) => {
    setModel(e.target.value);
    setTypeOption("");
  };

  useEffect(() => {
    if (!fitment || fitment.length === 0) return;
    const key = `${year}|${make}|${model}|${selType}|${selOption || ""}`;
    if (loggedKey.current === key) return;
    loggedKey.current = key;
    logSearch.mutate({ year, make, model, type: selType, option: selOption || undefined });
  }, [fitment]); // eslint-disable-line react-hooks/exhaustive-deps

  const step = !year ? 1 : !make ? 2 : !model ? 3 : !typeOption ? 4 : 5;

  return (
    <div>
      <div className="card tire-form">
        <h3>
          <Ruler size={16} className="icon-inline" />
          Find a vehicle
        </h3>
        <div className="tire-input-grid">
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
            <select value={typeOption} onChange={(e) => setTypeOption(e.target.value)} disabled={!model || loadingTypes}>
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

      {step < 5 ? (
        <div className="card empty-state-card mt-20">
          {step === 1 && "Start by selecting a year."}
          {step === 2 && "Now select a make."}
          {step === 3 && "Now select a model."}
          {step === 4 && "Now select a type to see the wheel offset chart."}
        </div>
      ) : loadingFitment ? (
        <p className="text-muted mt-20">Loading wheel offset data…</p>
      ) : !fitment || fitment.length === 0 ? (
        <div className="card empty-state-card mt-20">No tech data on file for this fitment.</div>
      ) : (
        <div className="card mt-20">
          <h3 className="mb-12">
            {year} {make} {model} — {selType}{selOption ? ` (${selOption})` : ""}
          </h3>
          {fitment.map((record, i) => (
            <div key={record._id} className={fitment.length > 1 ? "mb-24" : "mb-0"}>
              <WheelOffsetChart record={record} show3D={i === 0} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ManualReferenceTab() {
  const { data: vehicles, isLoading } = useVehicleNotesQuery();
  const { data: tireOptions } = useTireOptionsQuery();
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
      <h3 className="mb-4">Reference an existing vehicle note or tire preset</h3>
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

          <div className="field field-mb">
            <label>Related tire size preset (reference only)</label>
            <select defaultValue="">
              <option value="">— none —</option>
              {(tireOptions || []).map((p) => (
                <option key={p._id} value={p._id}>{p.label} — {p.width}/{p.aspect} R{p.rim}</option>
              ))}
            </select>
          </div>

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
