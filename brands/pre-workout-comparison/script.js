import '/common/common.js';
import * as cclElementRegistry from "/ccl-elements/registry.js";

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

/**
 * Parse value and unit from ingredient which may have a serving string or extended data object
 * @param {*} ingredientData - serving string or ingredient data object
 * @param {string} paramName - name of serving parameter if the data is an object
 * @returns {(number|string)} - value and unit parts of the serving string
 */
function ParseServing(ingredientData, paramName) {
    const serving = ingredientData[paramName] ? ingredientData[paramName] : ingredientData;
    const match = serving.match(/^ *(?<value>(?:\d+(?:\.\d+)?)|(?:\.\d+)) *(?<unit>g|mg|mcg|) *(?<equiv> RAE| DFE| NE|) *$/);
    if (!match || (match.groups.equiv && !match.groups.unit))
        throw "Unable to parse serving size from '" + serving + "'";
    return [+match.groups.value, match.groups.unit + match.groups.equiv];
}

try {
    // load nutrient data
    const nutrientDataList = await loadJsonFile("/nutrients.json");

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
        for (const [brandNutrientName, _] of Object.entries(brandData.nutrition)) {
            if (nutrientList.has(brandNutrientName))
                continue;
            if (!nutrientDataList[brandNutrientName]) {
                alert(brandId + " lists invalid nutrient '" + brandNutrientName + "'");
                continue;
            }
            nutrientList.set(brandNutrientName, ParseServing(nutrientDataList[brandNutrientName], "dv")[1]);
        }
    }

    // build list of supplements which appear in any brand
    // there is no comprehensive list of supplements just take them as they come
    // take units from the first appearance
    let supplementList = new Map();
    for (const [brandId, brandData] of brandDataList.entries()) {
        for (const [brandSupplementName, brandSupplementData] of Object.entries(brandData.supplements)) {
            if (supplementList.has(brandSupplementName))
                continue;
            supplementList.set(brandSupplementName, ParseServing(brandSupplementData, "serving")[1]);
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
            if (!brandNutrition[nutrientName]) {
                servingText.textContent = "-";
                continue;
            }

            // parse brand serving size from data
            const [brandValue, brandUnits] = ParseServing(brandNutrition[nutrientName], "serving");

            // require strict units for nutrients, alert on mismatch
            if (brandUnits !== nutrientUnits) {
                alert(brandId + " " + nutrientName + " must be supplied in " + nutrientUnits);
                servingText.textContent = "ERR";
                continue;
            }

            // set serving value
            // use nutrient units to ensure visual consistency
            servingText.textContent = brandValue + nutrientUnits;
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
            const brandSupplements = brandData["supplements"];

            // create cell
            const servingCellFrag = document.importNode(servingCellTpl.content, true);
            const servingText = servingCellFrag.querySelector(".serving");
            ingredientRow.appendChild(servingCellFrag);

            // if brand does not contain this supplement the property will not exist
            if (!brandSupplements[supplementName]) {
                servingText.textContent = "-";
                continue;
            }

            // parse brand serving size from data
            const [brandValue, brandUnits] = ParseServing(brandSupplements[supplementName], "serving");

            // TODO: convert to units
            if (brandUnits !== supplementUnits) {
                alert(brandId + " " + supplementName + " must be supplied in " + supplementUnits);
                servingText.textContent = "ERR";
                continue;
            }

            // set serving value
            servingText.textContent = brandValue + supplementUnits;
        }
    }

    // set up any new ccl elements in document
    cclElementRegistry.raiseCallbacks(document);
}
catch (err) {
    console.log("Error loading side-by-side comparison: " + err);
}