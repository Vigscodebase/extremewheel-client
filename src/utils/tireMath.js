// Standard tire geometry formulas (metric width in mm, aspect ratio in %,
// rim diameter in inches) -> everything else in mm / inches.
export function tireDiameterInches({ width, aspect, rim }) {
  const sidewallMm = (width * aspect) / 100;
  const sidewallIn = sidewallMm / 25.4;
  return rim + sidewallIn * 2;
}

export function tireCircumferenceMm({ width, aspect, rim }) {
  const diameterIn = tireDiameterInches({ width, aspect, rim });
  const diameterMm = diameterIn * 25.4;
  return Math.PI * diameterMm;
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
