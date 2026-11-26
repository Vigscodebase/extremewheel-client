// The "Type / Option" dropdown on Tech Data and Plus Size Options.
//
// The rows come from tblAppGuide-Templatenew.xlsx in whatever order they were
// typed in the sheet (so "SEDAN SPORT OE 18" can sit before "COUPE SPORT OE 19",
// or 19 before 17). The sheet order doesn't matter: the screen always shows a
// natural order, where numbers inside the text are compared as numbers
// (17 < 18 < 19, and 9 < 10), not letter by letter.
const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

export function sortTypeOptions(types) {
  return [...(types || [])].sort(
    (a, b) =>
      collator.compare(String(a?.type ?? ""), String(b?.type ?? "")) ||
      collator.compare(String(a?.option ?? ""), String(b?.option ?? ""))
  );
}
