const fs = require("fs");
const path = require("path");
const Papa = require("papaparse");

const csvPath = path.join(__dirname, "../data/games.csv");
const jsonPath = path.join(__dirname, "../data/games.json");

const csvText = fs.readFileSync(csvPath, "utf8");

const result = Papa.parse(csvText, {
  header: true,
  skipEmptyLines: true,
});

const games = [];

for (const row of result.data) {

  const gameName = (row["Game"] || "").trim();
  const providerGameId = (row["Game ID"] || "").trim();
  const category = (row["Category"] || "Other").trim();

  // Skip empty rows
if (!gameName || !providerGameId) continue;

// Skip corrupted rows
if (
  providerGameId.includes("desktop") ||
  providerGameId.includes("mobile") ||
  providerGameId.includes('"') ||
  providerGameId.length > 50 ||
  providerGameId === "Yes" ||
  providerGameId === "No" ||
  /^\d+$/.test(providerGameId)
) {
  continue;
}

  games.push({
    provider: "InOut",
    providerGameId,
    gameName,
    category,
    image: "",
    demo: false,
    mobile: true,
    enabled: true,
    popularity: 0
  });
}

fs.writeFileSync(
  jsonPath,
  JSON.stringify(games, null, 2)
);

console.log("Games:", games.length);
console.log("JSON saved:", jsonPath);