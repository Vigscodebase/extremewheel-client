import { Search } from "lucide-react";
import { useState } from "react";
import PageHeader from "../components/pageheader";
import {
  useAppGuideFitment,
  useAppGuideMakes,
  useAppGuideModels,
  useAppGuideTypes,
  useAppGuideYears,
} from "../hooks/queries/useAppGuide";

// Renders a single "row" of a fitment record as label/value pairs, skipping
// anything the sheet didn't have data for — the source workbook has a lot
// of optional/staggered-fitment columns that are blank for most vehicles.
function FitmentSpecs({ record }) {
  const rows = [
    ["Tire size", record.txtTireSize],
    ["Optional tire size", record.txtOptTireSize],
    ["Staggered front", record.stagFront],
    ["Staggered rear", record.stagRear],
    ["Bolt pattern", record.txtBolt],
    ["Lug", record.txtLug],
    ["Hub bore", record.txtHub],
    ["Offset", record.txtOffset],
    ["Offset range (front)", record.minOffset && record.maxOffset ? `${record.minOffset} – ${record.maxOffset}` : null],
    ["Offset range (rear)", record.minOffsetRear && record.maxOffsetRear ? `${record.minOffsetRear} – ${record.maxOffsetRear}` : null],
    ["Wheel code", record.wheelCode],
    ["Big brake clearance", record.bigBrake],
  ].filter(([, value]) => value !== null && value !== undefined && value !== "");

  if (rows.length === 0) {
    return <p className="text-muted">No additional tech data on file for this fitment.</p>;
  }

  return (
    <table className="compare-table">
      <tbody>
        {rows.map(([label, value]) => (
          <tr key={label}>
            <td className="compare-table-label">{label}</td>
            <td className="compare-table-value">{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function ApplicationGuide() {
  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [typeOption, setTypeOption] = useState(""); // encodes "type|option"

  const { data: years, isLoading: loadingYears } = useAppGuideYears();
  const { data: makes, isLoading: loadingMakes } = useAppGuideMakes(year);
  const { data: models, isLoading: loadingModels } = useAppGuideModels(year, make);
  const { data: types, isLoading: loadingTypes } = useAppGuideTypes(year, make, model);

  const [selType, selOption] = typeOption ? typeOption.split("|") : [null, null];
  const { data: fitment, isLoading: loadingFitment } = useAppGuideFitment(year, make, model, selType, selOption);

  // Cascading resets: changing an upstream dropdown clears everything below it.
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

  const step = !year ? 1 : !make ? 2 : !model ? 3 : !typeOption ? 4 : 5;

  return (
    <div>
      <PageHeader
        eyebrow="Vehicle fitment"
        title="Application Guide"
        subtitle="Look up factory tire, wheel, and offset fitment by Year, Make, Model, and Type."
      />

      <div className="card tire-form">
        <h3>
          <Search size={16} style={{ verticalAlign: "-3px", marginRight: 6 }} />
          Find a vehicle
        </h3>
        <div className="tire-input-grid">
          <div className="field">
            <label>Year</label>
            <select value={year} onChange={onYearChange} disabled={loadingYears}>
              <option value="">{loadingYears ? "Loading…" : "Select year"}</option>
              {(years || []).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Make</label>
            <select value={make} onChange={onMakeChange} disabled={!year || loadingMakes}>
              <option value="">{!year ? "Select year first" : loadingMakes ? "Loading…" : "Select make"}</option>
              {(makes || []).map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Model</label>
            <select value={model} onChange={onModelChange} disabled={!make || loadingModels}>
              <option value="">{!make ? "Select make first" : loadingModels ? "Loading…" : "Select model"}</option>
              {(models || []).map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
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
        <div className="card empty-state-card" style={{ marginTop: 20 }}>
          {step === 1 && "Start by selecting a year."}
          {step === 2 && "Now select a make."}
          {step === 3 && "Now select a model."}
          {step === 4 && "Now select a type to see fitment data."}
        </div>
      ) : loadingFitment ? (
        <p className="text-muted" style={{ marginTop: 20 }}>Loading fitment data…</p>
      ) : !fitment || fitment.length === 0 ? (
        <div className="card empty-state-card" style={{ marginTop: 20 }}>
          No fitment records found for this selection.
        </div>
      ) : (
        <div className="card" style={{ marginTop: 20 }}>
          <h3 style={{ marginBottom: 12 }}>
            {year} {make} {model} — {selType}{selOption ? ` (${selOption})` : ""}
          </h3>
          {fitment.map((record) => (
            <div key={record._id} style={{ marginBottom: fitment.length > 1 ? 24 : 0 }}>
              <FitmentSpecs record={record} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
