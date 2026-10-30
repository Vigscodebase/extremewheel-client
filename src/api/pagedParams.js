// Turns { q: "toy", make: "", cursor: undefined } into { q: "toy" } so empty
// filters never reach the URL (shorter requests, tidier server logs).
export const compactParams = (params) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ""));
