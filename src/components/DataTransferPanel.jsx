import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { usePermissions } from "../context/permissioncontext";
import { PERM } from "../utils/permissions";
import { useDownloadOeTireSizeXlsx, useImportOeTireSizeXlsx } from "../hooks/queries/usePlusSize";
import { useDownloadTechDataCsv, useImportTechDataCsv } from "../hooks/queries/useAppGuide";
import { useDownloadVehicleLookupXlsx, useImportVehicleLookupXlsx } from "../hooks/queries/useVehicleLookup";

// "Data import / export" section of the Reporting & Data Export page.
//
// These three blocks used to sit on other pages:
//   - OE tire size library          (was on Plus Size Options)
//   - Tech Data CSV                 (was the "CSV import / export" tab on Tech Data)
//   - Vehicle Notes database        (was a card on Vehicle Notes)
// Each control keeps its own per-user permission (see utils/permissions.js);
// the whole section renders nothing when the person holds none of them.

function ImportSummary({ children }) {
  return <div className="speedo-banner ok mt-16">{children}</div>;
}

function ImportError({ children }) {
  return <div className="alert-error mt-16">{children}</div>;
}

// --- OE tire size library (.xlsx, insert-only upload) ---
function OeLibraryBlock({ canDownload, canUpload }) {
  const downloadOe = useDownloadOeTireSizeXlsx();
  const importOe = useImportOeTireSizeXlsx();
  const fileInputRef = useRef(null);

  const onFileSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file next time
    if (!file) return;
    // Success and failure are both shown from the mutation's own state below.
    await importOe.mutateAsync(file).catch(() => {});
  };

  const result = importOe.data;

  return (
    <div className="card data-transfer-item">
      <div>
        <p className="preset-label">OE tire size library</p>
        <p className="text-muted fs-13">
          The original-equipment sizes searched on Plus Size Options. Download them as .xlsx, or upload a Width / Aspect /
          Rim .xlsx to add new sizes — sizes already on file are skipped.
        </p>
      </div>

      <div className="modal-actions modal-actions-start gap-12">
        {canDownload && (
          <button
            type="button"
            className="btn btn-accent"
            disabled={downloadOe.isPending}
            onClick={() => downloadOe.mutate()}
            title="Download the OE tire size library as .xlsx"
          >
            <Download size={16} /> {downloadOe.isPending ? "Downloading…" : "Download OE library"}
          </button>
        )}
        {canUpload && (
          <>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={importOe.isPending}
              onClick={() => fileInputRef.current?.click()}
              title="Upload a Width / Aspect / Rim .xlsx to append to the OE tire size library"
            >
              <Upload size={16} /> {importOe.isPending ? "Uploading…" : "Upload OE sizes"}
            </button>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" hidden onChange={onFileSelected} />
          </>
        )}
      </div>

      {downloadOe.isError && <ImportError>Download failed. Please try again.</ImportError>}
      {importOe.isSuccess && result && (
        <ImportSummary>
          Added {result.inserted} new size{result.inserted === 1 ? "" : "s"} to the OE library
          {result.duplicates ? ` (${result.duplicates} already on file, skipped)` : ""}
          {result.skipped ? `, ${result.skipped} row${result.skipped === 1 ? "" : "s"} couldn't be read` : ""}.
        </ImportSummary>
      )}
      {importOe.isError && (
        <ImportError>
          {importOe.error?.response?.data?.message || "Upload failed. Please check the file and try again."}
        </ImportError>
      )}
    </div>
  );
}

// --- Tech Data CSV (fitment / wheel-offset dataset) ---
function TechDataCsvBlock() {
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
    <div className="card data-transfer-item">
      <div>
        <p className="preset-label">Tech Data CSV</p>
        <p className="text-muted fs-13">
          The fitment / wheel-offset dataset shown on Tech Data. Download it as CSV, edit it, and re-upload — columns match
          exactly, so a round trip is safe.
        </p>
      </div>

      <div className="modal-actions modal-actions-start gap-12">
        <button
          type="button"
          className="btn btn-accent"
          onClick={() => downloadCsv.mutate({})}
          disabled={downloadCsv.isPending}
        >
          <Download size={16} /> {downloadCsv.isPending ? "Preparing…" : "Download CSV"}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => fileInputRef.current?.click()}
          disabled={importCsv.isPending}
        >
          <Upload size={16} /> {importCsv.isPending ? "Uploading…" : "Upload CSV"}
        </button>
        <input ref={fileInputRef} type="file" accept=".csv,text/csv" hidden onChange={onFileChosen} />
      </div>

      {importError && <ImportError>{importError}</ImportError>}
      {importResult && (
        <ImportSummary>
          Imported {importResult.processed} row(s), skipped {importResult.skipped} incomplete row(s), out of{" "}
          {importResult.total} total.
        </ImportSummary>
      )}
    </div>
  );
}

// --- Vehicle Notes database (Make / Model / Type master list, .xlsx) ---
function VehicleDatabaseBlock({ canDownload, canUpload }) {
  const downloadLookup = useDownloadVehicleLookupXlsx();
  const importLookup = useImportVehicleLookupXlsx();
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState("");
  const fileInputRef = useRef(null);

  const onFileChosen = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError("");
    setImportResult(null);
    try {
      const result = await importLookup.mutateAsync(file);
      setImportResult(result);
    } catch (err) {
      setImportError(err?.response?.data?.message || "Import failed. Check the file format and try again.");
    } finally {
      e.target.value = "";
    }
  };

  return (
    <div className="card data-transfer-item">
      <div>
        <p className="preset-label">Vehicle Notes database</p>
        <p className="text-muted fs-13">
          The Make / Model / Type reference table behind the Vehicle Notes dropdowns. Download it as .xlsx, edit it, and
          re-upload — the Add / Edit vehicle dropdowns stay in sync automatically.
        </p>
      </div>

      <div className="modal-actions modal-actions-start gap-12">
        {canDownload && (
          <button
            type="button"
            className="btn btn-accent"
            onClick={() => downloadLookup.mutate()}
            disabled={downloadLookup.isPending}
          >
            <Download size={16} /> {downloadLookup.isPending ? "Preparing…" : "Download database"}
          </button>
        )}
        {canUpload && (
          <>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => fileInputRef.current?.click()}
              disabled={importLookup.isPending}
            >
              <Upload size={16} /> {importLookup.isPending ? "Uploading…" : "Upload database"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              hidden
              onChange={onFileChosen}
            />
          </>
        )}
      </div>

      {importError && <ImportError>{importError}</ImportError>}
      {importResult && (
        <ImportSummary>
          Imported {importResult.processed} row(s), skipped {importResult.skipped} incomplete row(s), out of{" "}
          {importResult.total} total.
        </ImportSummary>
      )}
    </div>
  );
}

export default function DataTransferPanel() {
  const { can } = usePermissions();

  const canDownloadOe = can(PERM.PLUS_SIZE_DOWNLOAD);
  const canUploadOe = can(PERM.PLUS_SIZE_UPLOAD);
  const canUseTechCsv = can(PERM.TECH_DATA_CSV_TAB);
  const canDownloadDb = can(PERM.VEHICLE_DATABASE_DOWNLOAD);
  const canUploadDb = can(PERM.VEHICLE_DATABASE_UPLOAD);

  const showOe = canDownloadOe || canUploadOe;
  const showDb = canDownloadDb || canUploadDb;
  if (!showOe && !canUseTechCsv && !showDb) return null;

  return (
    <div className="card mt-20">
      <h3 className="mb-4">
        <FileSpreadsheet size={16} className="icon-inline" />
        Data import / export
      </h3>
      <p className="text-muted mb-4">
        Download or upload the reference data behind Plus Size Options, Tech Data and Vehicle Notes. These aren't affected
        by the date range above.
      </p>

      <div className="data-transfer-grid">
        {showOe && <OeLibraryBlock canDownload={canDownloadOe} canUpload={canUploadOe} />}
        {canUseTechCsv && <TechDataCsvBlock />}
        {showDb && <VehicleDatabaseBlock canDownload={canDownloadDb} canUpload={canUploadDb} />}
      </div>
    </div>
  );
}
