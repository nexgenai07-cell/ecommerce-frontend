// ============================================================
// DOWNLOAD EXPORT CSV
// ============================================================
// Shared helper for every admin screen that downloads its CSV through
// the backend export endpoint (API 99, GET /api/v1/analytics/export/,
// see exportReport() in api/analytics.api.js).
//
// exportReport() always requests the response as a blob, since a
// successful call returns raw CSV file bytes. On a validation failure
// the backend still answers with a normal JSON error body — but
// because the request itself was made expecting a blob, axios hands
// that JSON body back wrapped in a Blob too, instead of a parsed
// object. This helper reads that blob back out as text and parses it
// as JSON, so the real reason (e.g. "start_date cannot be after
// end_date.") reaches the admin as a toast, instead of a broken file
// being silently saved to disk.
//
// exportReportFn — the exportReport() function to call, passed in
// rather than imported directly so this helper stays decoupled from
// any one API module.
// params   — the query params to send, matching exactly what the
//            on-screen list/table is currently filtered by, so the
//            downloaded file always equals what the admin sees.
// filename — the downloaded file's name, without the ".csv" suffix.
//
// Resolves to { success: true } once the download has started, or
// { success: false, message } with the backend's own error text where
// available, so the caller can show it in a toast.
const downloadExportCsv = async (exportReportFn, params, filename) => {
  try {
    const response = await exportReportFn(params);
    const blobUrl = URL.createObjectURL(response.data);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = `${filename}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(blobUrl);
    return { success: true };
  } catch (error) {
    const errorBody = error?.response?.data;
    if (errorBody instanceof Blob) {
      try {
        const text = await errorBody.text();
        const parsed = JSON.parse(text);
        return { success: false, message: parsed?.error };
      } catch {
        // The blob wasn't parseable JSON after all — fall through and
        // let the caller show its own generic fallback message.
      }
    }
    return { success: false, message: errorBody?.error };
  }
};

export default downloadExportCsv;
