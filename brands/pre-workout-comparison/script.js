import '/common/common.js';
import * as cclElementRegistry from "/ccl-elements/registry.js";
import * as cclIngredients from "/common/ingredients.js"
import * as cclServing from "/common/serving.js"

// list of brand ids to compare
const compareBrandIds = [
  "gorilla-mode",
  "gorilla-mode-nitric",
  "pre-lab-pro",
  "transparent-bulk"
];

/**
 * Async load json data from file
 * @param {string} fileName - name of json file to load
 * @returns {object} - json data from file
 */
async function loadJsonFile(fileName) {
  try {
    const response = await fetch(fileName);
    return await response.json();
  }
  catch (err) {
    console.log("Error loading json file '" + name + "': " + err);
  }
}

try {
  // load nutrient data
  const nutrientDataMap = cclIngredients.parseList(
    await loadJsonFile("/nutrients.json"),
    { servingKey: "dv", errPrefix: "Nutrient" }
  );

  // load all brand data
  const brandDataList = new Map();
  for (const brandId of compareBrandIds) {
    brandDataList.set(brandId, await (loadJsonFile("/brands/data/" + brandId + ".json")));
  }

  // build list of nutrients to be displayed and their units
  // only display nutrients which exist in at least one brand
  // all nutrients are known, alert if brand contains invalid nutrient data
  const nutrientList = new Map();
  for (const [brandId, brandData] of brandDataList.entries()) {
    brandData.nutrition = cclIngredients.parseList(
      brandData.nutrition,
      { servingKey: "serving", errPrefix: "Nutrient" }
    );
    for (const [brandNutrientName, _] of brandData.nutrition.entries()) {
      if (nutrientList.has(brandNutrientName))
        continue;
      const nutrientData = nutrientDataMap.get(brandNutrientName);
      if (!nutrientData) {
        alert(brandId + " lists invalid nutrient '" + brandNutrientName + "'");
        continue;
      }
      nutrientList.set(brandNutrientName, nutrientData.dv.units);
    }
  }

  // build list of supplements which appear in any brand
  // there is no comprehensive list of supplements just take them as they come
  // take units from the first appearance
  let supplementList = new Map();
  for (const [brandId, brandData] of brandDataList.entries()) {
    brandData.supplements = cclIngredients.parseList(
      brandData.supplements,
      { servingKey: "serving", errPrefix: "Supplement" }
    );
    for (const [brandSupplementName, brandSupplementData] of brandData.supplements.entries()) {
      if (supplementList.has(brandSupplementName))
        continue;
      supplementList.set(brandSupplementName, brandSupplementData.serving.units);
    }
  }

  // find table parts
  const headerRow = document.getElementById("comp-head-row");
  const body = document.getElementById("comp-body");
  const headerBrandTpl = document.getElementById("comp-head-brand-tpl");
  const ingredientRowTpl = document.getElementById("comp-ingredient-row-tpl");
  const servingCellTpl = document.getElementById("comp-serving-cell-tpl");

  // build header row
  for (const [_, brandData] of brandDataList.entries()) {
    const headerBrandFrag = document.importNode(headerBrandTpl.content, true);
    headerBrandFrag.querySelector(".brand-name").textContent = brandData["name"];
    headerRow.appendChild(headerBrandFrag);
  }

  // build nutrient rows
  for (const [nutrientName, nutrientUnits] of nutrientList.entries()) {
    // create row
    const ingredientRowFrag = document.importNode(ingredientRowTpl.content, true);
    const ingredientRow = ingredientRowFrag.querySelector(".ingredient-row");
    ingredientRow.querySelector(".ingredient-name").textContent = nutrientName;
    body.appendChild(ingredientRowFrag);

    // create serving cells
    for (const [brandId, brandData] of brandDataList.entries()) {
      const brandNutrition = brandData.nutrition;

      // create cell
      const servingCellFrag = document.importNode(servingCellTpl.content, true);
      const servingText = servingCellFrag.querySelector(".serving");
      ingredientRow.appendChild(servingCellFrag);

      // if brand does not contain this nutrient the property will not exist
      if (!brandNutrition.has(nutrientName)) {
        servingText.textContent = "-";
        continue;
      }

      // parse brand serving size from data
      const brandServing = brandNutrition.get(nutrientName).serving;

      // require strict units for nutrients, alert on mismatch
      if (!cclServing.unitsMatch(brandServing, nutrientUnits)) {
        alert(brandId + " " + nutrientName + " must be supplied in " + nutrientUnits);
        servingText.textContent = "ERR";
        continue;
      }

      // set serving value
      servingText.textContent = brandServing;
    }
  }

  // build supplement rows
  for (const [supplementName, supplementUnits] of supplementList.entries()) {
    // create row
    const ingredientRowFrag = document.importNode(ingredientRowTpl.content, true);
    const ingredientRow = ingredientRowFrag.querySelector(".ingredient-row");
    ingredientRow.querySelector(".ingredient-name").textContent = supplementName;
    body.appendChild(ingredientRowFrag);

    // create serving cells
    for (const [brandId, brandData] of brandDataList.entries()) {
      const brandSupplements = brandData.supplements;

      // create cell
      const servingCellFrag = document.importNode(servingCellTpl.content, true);
      const servingText = servingCellFrag.querySelector(".serving");
      ingredientRow.appendChild(servingCellFrag);

      // if brand does not contain this supplement the property will not exist
      if (!brandSupplements.has(supplementName)) {
        servingText.textContent = "-";
        continue;
      }

      // parse brand serving size from data
      const brandServing = brandSupplements.get(supplementName).serving;

      // TODO: convert to units
      if (!cclServing.unitsMatch(brandServing, supplementUnits)) {
        alert(brandId + " " + supplementName + " must be supplied in " + supplementUnits);
        servingText.textContent = "ERR";
        continue;
      }

      // set serving value
      servingText.textContent = brandServing;
    }
  }

  // set up any new ccl elements in document
  cclElementRegistry.raiseCallbacks(document);
}
catch (err) {
  console.log("Error loading side-by-side comparison: " + err);
}