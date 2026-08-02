const escapeCsvValue = (value) => {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

/**
 * @param {Array<Object>} rows - array of plain objects, one per CSV row
 * @param {Array<{key: string, label: string}>} columns - which object
 *        keys to include, and what header label to show for each
 * @param {string} filename - the downloaded file's name (without .csv)
 */
const downloadCsv = (rows, columns, filename) => {
  const headerRow = columns.map((col) => escapeCsvValue(col.label)).join(",");

  const dataRows = rows.map((row) =>
    columns.map((col) => escapeCsvValue(row[col.key])).join(","),
  );

  const csvContent = [headerRow, ...dataRows].join("\n");

  // Building a real Blob + object URL, same download-trigger mechanics
  // already used for the backend-generated CSV exports elsewhere in
  // this app — the only difference is the CSV content's SOURCE
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const blobUrl = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(blobUrl);
};

export default downloadCsv;
