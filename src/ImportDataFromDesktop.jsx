import React, { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, DatabaseBackup, Download, FileSpreadsheet, LoaderCircle, Pause, Play, RotateCcw, ShieldCheck, Undo2, Upload, X } from "lucide-react";
import { API_URL } from "./api/config";

const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token") || ""}` });
const formatDuration = (seconds) => {
  if (!Number.isFinite(seconds) || seconds < 0) return "Calculating...";
  const rounded = Math.max(0, Math.round(seconds));
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const remainingSeconds = rounded % 60;
  if (hours) return `${hours}h ${minutes}m`;
  if (minutes) return `${minutes}m ${remainingSeconds}s`;
  return `${remainingSeconds}s`;
};

const estimateRemainingSeconds = (processed, total, startedAt, now) => {
  const started = new Date(startedAt || "").getTime();
  if (!started || processed <= 0 || total <= processed) return total <= processed ? 0 : Number.NaN;
  return ((now - started) / 1000 / processed) * (total - processed);
};

export default function ImportDataFromDesktop({ onClose }) {
  const [backups, setBackups] = useState([]);
  const [excelFiles, setExcelFiles] = useState([]);
  const [exportDistributorId, setExportDistributorId] = useState(() => localStorage.getItem("distributorId") || "");
  const [exportFirmId, setExportFirmId] = useState(() => localStorage.getItem("firmId") || "");
  const [job, setJob] = useState(null);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("Select a desktop SQL Server backup to begin");
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [companies, setCompanies] = useState([]);
  const [companyCode, setCompanyCode] = useState("");
  const [actionBusy, setActionBusy] = useState("");
  const [clockNow, setClockNow] = useState(Date.now());
  const inputRef = useRef(null);
  const excelInputRef = useRef(null);
  const pollRef = useRef(null);
  const processing = job?.status === "processing";
  const batchActive = ["queued", "running", "paused", "rolling_back"].includes(job?.import?.status);

  useEffect(() => () => window.clearTimeout(pollRef.current), []);
  useEffect(() => {
    if (!["queued", "running", "paused", "rolling_back"].includes(job?.import?.status)) return undefined;
    const timer = window.setInterval(() => setClockNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [job?.import?.status]);
  useEffect(() => { (async () => {
    try {
      const query = new URLSearchParams({ distributorId: localStorage.getItem("distributorId") || "", firmId: localStorage.getItem("firmId") || "" });
      const response = await fetch(`${API_URL}/companies?${query}`, { headers: authHeaders() });
      const result = await response.json();
      if (response.ok) setCompanies(result.companies || []);
    } catch { /* Preflight will show a clear company error if loading fails. */ }
  })(); }, []);

  const pollJob = async (jobId) => {
    try {
      const response = await fetch(`${API_URL}/desktop-import/jobs/${jobId}`, { headers: authHeaders(), cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to read conversion progress.");
      setJob(result.job);
      setProgress(result.job.progress || 0);
      setStage(result.job.stage || "Processing backup");
      if (result.job.status === "completed") {
        setSelected((current) => current.size ? current : new Set(result.job.files.map((file) => file.id)));
        if (["queued", "running", "rolling_back"].includes(result.job.import?.status)) pollRef.current = window.setTimeout(() => pollJob(jobId), 700);
        return;
      }
      if (result.job.status === "failed") {
        setError(result.job.error || "Desktop backup conversion failed.");
        return;
      }
      pollRef.current = window.setTimeout(() => pollJob(jobId), 900);
    } catch (pollError) {
      setError(pollError.message);
      setJob((previous) => ({ ...previous, status: "failed" }));
    }
  };

  const generate = () => {
    if (!backups.length || processing) return;
    if (!exportDistributorId.trim() || !exportFirmId.trim()) return setError("Enter the Distributor ID and Firm ID to write into the Excel files.");
    setError(""); setProgress(1); setStage("Uploading desktop backup"); setSelected(new Set());
    const form = new FormData(); backups.forEach((backup) => form.append("backup", backup));
    form.append("exportDistributorId", exportDistributorId.trim());
    form.append("exportFirmId", exportFirmId.trim());
    const request = new XMLHttpRequest();
    request.open("POST", `${API_URL}/desktop-import/generate`);
    request.setRequestHeader("Authorization", authHeaders().Authorization);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) setProgress(Math.max(1, Math.round((event.loaded / event.total) * 12)));
    };
    request.onerror = () => { setError("Backup upload failed. Please check the backend connection."); setJob({ status: "failed" }); };
    request.onload = () => {
      let result = {};
      try { result = JSON.parse(request.responseText || "{}"); } catch { result = {}; }
      if (request.status < 200 || request.status >= 300) {
        setError(result.message || "Backup upload failed."); setJob({ status: "failed" }); return;
      }
      setJob({ id: result.jobId, status: "processing", files: [] });
      setStage("Backup uploaded; reading database");
      pollJob(result.jobId);
    };
    request.send(form);
  };

  const uploadExcels = () => {
    if (!excelFiles.length || processing || actionBusy) return;
    setActionBusy("excel-upload"); setError(""); setProgress(1); setStage("Uploading ERP Excel files"); setSelected(new Set());
    const form = new FormData(); excelFiles.forEach((file) => form.append("excel", file));
    const request = new XMLHttpRequest();
    request.open("POST", `${API_URL}/desktop-import/upload-excel`);
    request.setRequestHeader("Authorization", authHeaders().Authorization);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) setProgress(Math.max(1, Math.round((event.loaded / event.total) * 100)));
    };
    request.onerror = () => { setError("Excel upload failed. Please check the backend connection."); setProgress(0); setActionBusy(""); };
    request.onload = () => {
      let result = {};
      try { result = JSON.parse(request.responseText || "{}"); } catch { result = {}; }
      setActionBusy("");
      if (request.status < 200 || request.status >= 300) { setError(result.message || "Excel upload failed."); setProgress(0); return; }
      setJob(result.job); setProgress(100); setStage(result.job.stage || "Excel files are ready to import");
      setSelected(new Set((result.job.files || []).map((file) => file.id)));
    };
    request.send(form);
  };

  const chooseBackups = (files) => {
    const selectedFiles = Array.from(files || []);
    window.clearTimeout(pollRef.current);
    setBackups(selectedFiles); setExcelFiles([]); setJob(null); setSelected(new Set()); setError(""); setProgress(0);
    setStage(selectedFiles.length ? "Ready to generate ERP Excel files" : "Select a desktop SQL Server backup to begin");
  };

  const chooseExcels = (files) => {
    const selectedFiles = Array.from(files || []);
    window.clearTimeout(pollRef.current);
    setExcelFiles(selectedFiles); setBackups([]); setJob(null); setSelected(new Set()); setError(""); setProgress(0);
    setStage(selectedFiles.length ? "Ready to upload and import ERP Excel files" : "Select Excel files exported from the local machine");
  };

  const toggleFile = (id) => { setJob((current) => current ? ({ ...current, preflight: null }) : current); setSelected((current) => {
    const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next;
  }); };

  const downloadFile = async (file) => {
    const response = await fetch(`${API_URL}/desktop-import/jobs/${job.id}/files/${file.id}`, { headers: authHeaders() });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      setError(result.message || `Unable to download ${file.fileName}.`);
      return;
    }
    const url = URL.createObjectURL(await response.blob());
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = file.fileName; document.body.appendChild(anchor); anchor.click(); anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const downloadSelected = () => {
    const files = job?.files?.filter((file) => selected.has(file.id)) || [];
    files.forEach((file, index) => window.setTimeout(() => downloadFile(file), index * 250));
  };

  const postAction = async (path, body = {}) => {
    const response = await fetch(`${API_URL}/desktop-import/jobs/${job.id}${path}`, { method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (result.preflight) setJob((current) => ({ ...current, preflight: result.preflight }));
      throw new Error(result.message || "Desktop import action failed.");
    }
    return result;
  };

  const runPreflight = async () => {
    if (!selected.size) return setError("Select at least one generated file.");
    setActionBusy("preflight"); setError("");
    try {
      const result = await postAction("/preflight", { fileIds: [...selected], companyCode });
      setJob((current) => ({ ...current, preflight: result.preflight }));
    } catch (actionError) { setError(actionError.message); } finally { setActionBusy(""); }
  };

  const startImport = async () => {
    if (!selected.size) return setError("Select at least one generated file.");
    setActionBusy("import"); setError("");
    try {
      const result = await postAction("/import", { fileIds: [...selected], companyCode });
      setJob((current) => ({ ...current, import: result.import })); pollJob(job.id);
    } catch (actionError) { setError(actionError.message); } finally { setActionBusy(""); }
  };

  const controlImport = async (action) => {
    if (action === "rollback" && !window.confirm("Rollback only records created by this desktop import job?")) return;
    setActionBusy(action); setError("");
    try {
      const result = await postAction(`/import/${action}`);
      setJob((current) => ({ ...current, import: result.import }));
      if (["resume", "retry", "rollback"].includes(action)) pollJob(job.id);
    } catch (actionError) { setError(actionError.message); } finally { setActionBusy(""); }
  };

  const downloadReport = async () => {
    const response = await fetch(`${API_URL}/desktop-import/jobs/${job.id}/import/report`, { headers: authHeaders() });
    if (!response.ok) return setError("Unable to download the import report.");
    const url = URL.createObjectURL(await response.blob()); const anchor = document.createElement("a");
    anchor.href = url; anchor.download = `Desktop_Import_Report_${job.id.slice(0, 8)}.csv`; document.body.appendChild(anchor); anchor.click(); anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const activeImportFile = job?.import?.files?.find((file) => file.status === "running")
    || job?.import?.files?.find((file) => file.status === "queued") || null;
  const overallRemaining = job?.import ? estimateRemainingSeconds(job.import.processed || 0, job.import.total || 0, job.import.startedAt, clockNow) : Number.NaN;
  const fileRemaining = activeImportFile ? estimateRemainingSeconds(activeImportFile.processed || 0, activeImportFile.total || 0, activeImportFile.startedAt, clockNow) : 0;
  const elapsedSeconds = job?.import?.startedAt ? Math.max(0, (clockNow - new Date(job.import.startedAt).getTime()) / 1000) : 0;
  const recordsPerSecond = elapsedSeconds > 0 ? (job?.import?.processed || 0) / elapsedSeconds : 0;

  return <div className="desktop-import-page">
    <div className="desktop-import-header">
      <div className="desktop-import-title"><span><DatabaseBackup size={21}/></span><div><h1>Import Data From Desktop</h1><p>Convert a desktop database backup into ERP-ready Excel files</p></div></div>
      <button type="button" className="desktop-import-close" onClick={onClose} aria-label="Close"><X size={18}/></button>
    </div>

    <section className="desktop-import-card desktop-import-upload-card">
      <label>Desktop database backup <b>*</b></label>
      <div className="desktop-import-tenant-fields">
        <label><span>Distributor ID to write in Excel <b>*</b></span><input value={exportDistributorId} onChange={(event) => setExportDistributorId(event.target.value)} disabled={processing} placeholder="Enter Distributor ID"/></label>
        <label><span>Firm ID to write in Excel <b>*</b></span><input value={exportFirmId} onChange={(event) => setExportFirmId(event.target.value)} disabled={processing} placeholder="Enter Firm ID"/></label>
      </div>
      <div className="desktop-import-file-row">
        <input ref={inputRef} type="file" accept=".bak" multiple hidden onChange={(event) => chooseBackups(event.target.files)}/>
        <button type="button" className="desktop-import-browse" disabled={processing} onClick={() => inputRef.current?.click()}><Upload size={14}/>Browse</button>
        <div className="desktop-import-file-name"><strong>{backups.length ? (backups.length === 1 ? backups[0].name : `${backups.length} backup parts selected`) : "No file selected"}</strong><small>{backups.length ? `${(backups.reduce((total, file) => total + file.size, 0) / 1024 / 1024).toFixed(1)} MB total` : "SQL Server .bak file (select all parts if it is a striped backup)"}</small></div>
        {!!backups.length && !processing && <button type="button" className="desktop-import-remove" onClick={() => { chooseBackups([]); if (inputRef.current) inputRef.current.value = ""; }}><X size={14}/>Clear</button>}
        <button type="button" className="desktop-import-generate" disabled={!backups.length || processing} onClick={generate}>{processing ? <><LoaderCircle className="desktop-import-spin" size={15}/>Generating...</> : <><FileSpreadsheet size={15}/>Generate Excel</>}</button>
      </div>
    </section>

    <section className="desktop-import-card desktop-import-upload-card">
      <label>Or import generated Excel files on this server <b>*</b></label>
      <div className="desktop-import-file-row">
        <input ref={excelInputRef} type="file" accept=".xlsx,.xls" multiple hidden onChange={(event) => chooseExcels(event.target.files)}/>
        <button type="button" className="desktop-import-browse" disabled={processing || !!actionBusy} onClick={() => excelInputRef.current?.click()}><Upload size={14}/>Select Excels</button>
        <div className="desktop-import-file-name"><strong>{excelFiles.length ? `${excelFiles.length} Excel file${excelFiles.length === 1 ? "" : "s"} selected` : "No Excel files selected"}</strong><small>{excelFiles.length ? `${(excelFiles.reduce((total, file) => total + file.size, 0) / 1024 / 1024).toFixed(1)} MB total` : "Select multiple .xlsx files downloaded after local backup extraction"}</small></div>
        {!!excelFiles.length && !actionBusy && <button type="button" className="desktop-import-remove" onClick={() => { chooseExcels([]); if (excelInputRef.current) excelInputRef.current.value = ""; }}><X size={14}/>Clear</button>}
        <button type="button" className="desktop-import-generate" disabled={!excelFiles.length || processing || !!actionBusy} onClick={uploadExcels}>{actionBusy === "excel-upload" ? <><LoaderCircle className="desktop-import-spin" size={15}/>Uploading...</> : <><FileSpreadsheet size={15}/>Upload for Import</>}</button>
      </div>
    </section>

    {(progress > 0 || processing) && <section className="desktop-import-card desktop-import-progress-card">
      <div className="desktop-import-progress-copy"><span>{stage}</span><strong>{Math.round(progress)}%</strong></div>
      <div className="desktop-import-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={progress}><span style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}/></div>
    </section>}

    {error && <div className="desktop-import-error"><X size={15}/><span>{error}</span></div>}

    {job?.status === "completed" && <section className="desktop-import-card desktop-import-results">
      <div className="desktop-import-results-head"><div><h2><CheckCircle2 size={17}/>{job.source === "excel" ? "Uploaded Excel Files" : "Generated Excel Files"}</h2><p>The Data sheet uses ERP fields for import. Transaction files also retain the original desktop header/detail sheets for verification.</p></div><button type="button" onClick={downloadSelected} disabled={!selected.size}><Download size={14}/>Download Selected ({selected.size})</button></div>
      <div className="desktop-import-file-list">
        {job.files.map((file) => <label key={file.id} className={selected.has(file.id) ? "selected" : ""}>
          <input type="checkbox" checked={selected.has(file.id)} onChange={() => toggleFile(file.id)}/>
          <FileSpreadsheet size={18}/><span><strong>{file.label}</strong><small>{file.fileName}</small></span><em>{file.rows.toLocaleString()} rows</em>
          <button type="button" title={`Download ${file.label}`} onClick={(event) => { event.preventDefault(); downloadFile(file); }}><Download size={14}/></button>
        </label>)}
      </div>
    </section>}

    {job?.status === "completed" && <section className="desktop-import-card desktop-import-batch-card">
      <div className="desktop-import-batch-head"><div><h2><ShieldCheck size={17}/>Validate & Import in Safe Order</h2><p>Masters → opening stock → purchases/stock-in → sales/stock-out → notes → receipts and vouchers.</p></div>
        <select value={companyCode} onChange={(event) => { setCompanyCode(event.target.value); setJob((current) => current ? ({ ...current, preflight: null }) : current); }} disabled={batchActive}><option value="">All companies (automatic mapping)</option>{companies.map((company) => <option key={company._id || company.companyCode} value={company.companyCode}>{company.companyCode} - {company.companyName}</option>)}</select>
      </div>
      <div className="desktop-import-batch-actions">
        <button type="button" onClick={runPreflight} disabled={batchActive || !!actionBusy || !selected.size}>{actionBusy === "preflight" ? <LoaderCircle className="desktop-import-spin" size={14}/> : <ShieldCheck size={14}/>}Dry-run Preview</button>
        <button type="button" className="primary" onClick={startImport} disabled={batchActive || !!actionBusy || !selected.size || job.preflight?.totals?.errors > 0}>{actionBusy === "import" ? <LoaderCircle className="desktop-import-spin" size={14}/> : <Play size={14}/>}Import Selected</button>
        {job.import?.status === "running" && <button type="button" onClick={() => controlImport("pause")} disabled={!!actionBusy}><Pause size={14}/>Pause</button>}
        {job.import?.status === "paused" && <button type="button" onClick={() => controlImport("resume")} disabled={!!actionBusy}><Play size={14}/>Resume</button>}
        {!!job.import?.failed && !batchActive && <button type="button" onClick={() => controlImport("retry")} disabled={!!actionBusy}><RotateCcw size={14}/>Retry Failed</button>}
        {job.import?.rollbackAvailable && !batchActive && <button type="button" className="danger" onClick={() => controlImport("rollback")} disabled={!!actionBusy}><Undo2 size={14}/>Rollback Import</button>}
        {(job.preflight || job.import) && <button type="button" onClick={downloadReport}><Download size={14}/>Error Report</button>}
      </div>

      {job.preflight && <div className="desktop-import-summary-grid">
        <span><b>{job.preflight.totals.total}</b>Total rows</span><span className="valid"><b>{job.preflight.totals.ready}</b>Ready</span><span><b>{job.preflight.totals.duplicates}</b>Duplicates skipped</span><span className={job.preflight.totals.errors ? "invalid" : "valid"}><b>{job.preflight.totals.errors}</b>Errors</span><span className="warning"><b>{job.preflight.totals.warnings}</b>Warnings</span>
      </div>}

      {job.import && <div className="desktop-import-run">
        <div className="desktop-import-run-overall"><span><b>{String(job.import.status || "").replaceAll("_", " ")}</b><small>{job.import.imported || 0} imported · {job.import.failed || 0} failed · {job.import.duplicates || 0} duplicates skipped</small></span><strong>{job.import.total ? Math.round((job.import.processed / job.import.total) * 100) : 100}%</strong></div>
        <div className="desktop-import-progress-track"><span style={{ width: `${job.import.total ? Math.min(100, (job.import.processed / job.import.total) * 100) : 100}%` }}/></div>
        <div className="desktop-import-live-stats">
          <span><small>Currently importing</small><b>{activeImportFile?.label || (job.import.status === "completed" ? "Import completed" : "Preparing first file...")}</b></span>
          <span><small>Current file records</small><b>{activeImportFile ? `${(activeImportFile.processed || 0).toLocaleString()} / ${(activeImportFile.total || 0).toLocaleString()}` : "—"}</b></span>
          <span><small>Current file ETA</small><b>{job.import.status === "paused" ? "Paused" : activeImportFile ? formatDuration(fileRemaining) : "—"}</b></span>
          <span><small>Total records</small><b>{(job.import.processed || 0).toLocaleString()} / {(job.import.total || 0).toLocaleString()}</b></span>
          <span><small>Overall ETA</small><b>{job.import.status === "paused" ? "Paused" : formatDuration(overallRemaining)}</b></span>
          <span><small>Import speed</small><b>{recordsPerSecond > 0 ? `${recordsPerSecond.toFixed(recordsPerSecond >= 10 ? 0 : 1)} records/sec` : "Calculating..."}</b></span>
        </div>
        <div className="desktop-import-type-progress">{job.import.files?.map((file) => <div key={file.id}><span><b>{file.label}</b><small>{file.imported} / {file.total}{file.failed ? ` · ${file.failed} failed` : ""}</small></span><div className="desktop-import-progress-track"><span style={{ width: `${file.total ? Math.min(100, (file.processed / file.total) * 100) : 100}%` }}/></div></div>)}</div>
      </div>}

      {!!job.preflight?.report?.length && <div className="desktop-import-report-preview"><h3><AlertTriangle size={14}/>Preflight findings</h3>{job.preflight.report.slice(0, 8).map((item, index) => <p key={`${item.file}-${item.row}-${index}`}><b>{item.entryType} row {item.row}:</b> {item.message}</p>)}</div>}
    </section>}

    {!job && !error && <div className="desktop-import-empty"><DatabaseBackup size={40}/><h3>No backup or Excel files processed</h3><p>Generate Excel from a local backup, or upload previously generated Excel files.</p></div>}
  </div>;
}
