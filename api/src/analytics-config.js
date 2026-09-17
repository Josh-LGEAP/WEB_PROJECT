function parse(name, fallback) {
  try { return JSON.parse(process.env[name] || JSON.stringify(fallback)); }
  catch { throw new Error(`${name} contains invalid JSON`); }
}
function modelConfig(datasetId) {
  const all = parse('PBI_MODEL_CONFIG_JSON', {});
  return all[datasetId] || null;
}
function analyticsConfig(datasetId) {
  const all = parse('PBI_ANALYTICS_QUERIES_JSON', {});
  return all[datasetId] || null;
}
module.exports = { modelConfig, analyticsConfig };
