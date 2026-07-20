// Standard tire geometry formulas (metric width in mm, aspect ratio in %,
// rim diameter in inches) -> everything else in mm / inches.
export function tireDiameterInches({ width, aspect, rim }) {
  const sidewallMm = (width * aspect) / 100;
  const sidewallIn = sidewallMm / 25.4;
  return rim + sidewallIn * 2;
}

export function sidewallHeightInches({ width, aspect }) {
  return (width * aspect) / 100 / 25.4;
}

export function tireWidthInches({ width }) {
  return width / 25.4;
}

export function tireCircumferenceMm({ width, aspect, rim }) {
  const diameterIn = tireDiameterInches({ width, aspect, rim });
  const diameterMm = diameterIn * 25.4;
  return Math.PI * diameterMm;
}

export function tireCircumferenceInches(tire) {
  return tireCircumferenceMm(tire) / 25.4;
}

export function revsPerMile({ width, aspect, rim }) {
  const circumferenceMm = tireCircumferenceMm({ width, aspect, rim });
  const circumferenceMiles = circumferenceMm / 1_609_344;
  return 1 / circumferenceMiles;
}

// Percentage speedometer/odometer drift of tire B relative to tire A.
export function speedoDifferencePct(tireA, tireB) {
  const dA = tireDiameterInches(tireA);
  const dB = tireDiameterInches(tireB);
  return ((dB - dA) / dA) * 100;
}

// "Equal inches" style size (e.g. 32.8x8.9R16) — the way the same metric
// size would read if it were sold as an inch-measurement (light truck /
// off-road) tire.
export function equivalentInchSize(tire) {
  const diameter = tireDiameterInches(tire);
  const width = tireWidthInches(tire);
  return `${diameter.toFixed(1)}x${width.toFixed(1)}R${tire.rim}`;
}

// Rough "equal metric" size for an inch-style input (diameter x width R rim)
// — solves the metric formula backwards for an aspect ratio that reproduces
// the given diameter, then rounds width/aspect to common trade sizes.
export function equivalentMetricSize({ diameter, width, rim }) {
  const sidewallIn = (diameter - rim) / 2;
  const widthMm = width * 25.4;
  const aspect = Math.round((sidewallIn * 25.4 * 100) / widthMm);
  const widthMmRounded = Math.round(widthMm / 5) * 5; // nearest 5mm, common trade sizes
  return { width: widthMmRounded, aspect, rim };
}

// Builds the "speedometer reading vs actual speed" table tiresize.com shows
// on its comparison tab — how fast you're really going at each indicated
// speed once a differently-sized tire is fitted.
export function speedometerErrorTable(oeTire, newTire, readings = [20, 30, 40, 50, 60, 70, 80, 90]) {
  const dOe = tireDiameterInches(oeTire);
  const dNew = tireDiameterInches(newTire);
  const ratio = dNew / dOe;
  return readings.map((reading) => ({ reading, actual: Number((reading * ratio).toFixed(1)) }));
}

// Convert millimeters <-> inches for the metric/inch results toggle.
export const mmToInches = (mm) => mm / 25.4;
export const inchesToMm = (inches) => inches * 25.4;
