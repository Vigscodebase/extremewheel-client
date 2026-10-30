import axios from "../utils/axiosInstance";
import { compactParams } from "./pagedParams";

// All saved comparisons, newest first — backs the "Saved comparisons" table at
// the bottom of the Tire Size Comparison page. The customer is only included
// for staff / admin, and any photo gallery on older records is left out to keep the
// list light.
export const fetchSavedComparisons = () =>
  axios.get("/saved-comparisons").then((r) => r.data.comparisons || []);

// Saves a tire comparison together with its vehicle details (and optional
// customer). Stored in its own collection on the server — separate from
// Vehicle Notes.
export const createSavedComparison = (payload) =>
  axios.post("/saved-comparisons", payload).then((r) => r.data.comparison);

// One page (10 rows) of the Saved comparisons table, newest first — cursor based.
// params: { q, make, model, type, customer, yearFrom, yearTo, cursor, limit }
// -> { items, nextCursor, hasMore, total, searchMode }
export const fetchSavedComparisonsPage = (params, signal) =>
  axios.get("/saved-comparisons/page", { params: compactParams(params), signal, silentError: true }).then((r) => r.data);

// Type-ahead for the search box -> [{ text, kind }]
export const fetchSavedComparisonSuggestions = (q, signal) =>
  axios.get("/saved-comparisons/suggest", { params: { q }, signal, silentError: true }).then((r) => r.data.suggestions || []);

// Values for the Make / Model / Type / Year filter dropdowns.
export const fetchSavedComparisonFacets = ({ make, model } = {}, signal) =>
  axios.get("/saved-comparisons/facets", { params: compactParams({ make, model }), signal }).then((r) => r.data);
