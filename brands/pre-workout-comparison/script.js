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
 * Parse value and unit from given serving
 * @param {string} serving serving size string with optional units
 * @returns {(number|string)} - value and unit parts of the serving string
 */
function ParseServing(serving) {
    const match = serving.match(/^ *(?<value>(?:\d+(?:\.\d+)?)|(?:\.\d+)) *(?<unit>g|mg|mcg|) *(?<equivalent> RAE| DFE| NE|) *$/);
    if (!match || (match.groups.equivalent && !match.groups.unit))
        throw "Unable to parse serving size from '" + serving + "'";
    return [+match.groups.value, match.groups.unit + match.groups.equivalent];
}

/**
 * Helper to parse ingredient from key which may have extended data
 * @param {object} ingredientData - object containing ingredient data
 * @param {string} paramName - name of serving parameter if the data is an object
 * @returns {object} - ingredient object
 */
function ParseIngredient(ingredientData, paramName) {
    if (ingredientData[paramName])
        return ingredientData;
    return { [paramName]: ingredientData };
}

try {
    // load nutrient list
    const nutrientList = await loadJsonFile("/nutrients.json");

    // load all brand data
    const brandDataList = new Map();
    for (const brandId of compareBrandIds) {
        brandDataList.set(brandId, await (loadJsonFile("/brands/data/" + brandId + ".json")));
    }

    // only display nutrients which exist in at least one brand
    // all nutrients are known, alert if brand contains invalid nutrient data
    for (const [brandId, brandData] of brandDataList.entries()) {
        for (const [nutrientName, _] of Object.entries(brandData["nutrition"])) {
            if (nutrientList[nutrientName])
                nutrientList[nutrientName].display = true;
            else
                alert(brandId + " lists invalid nutrient '" + nutrientName + "'");
        }
    }

    // build list of supplements which appear in any brand
    // there is no comprehensive list of supplements just take them as they come
    let supplementList = new Set();
    for (const [_, brandData] of brandDataList.entries()) {
        for (const [supplementName, _] of Object.entries(brandData["supplements"]))
            supplementList.add(supplementName);
    }

    // build html header row
    const headerRow = document.querySelector("#comparison-table thead tr");
    const headerTemplate = document.querySelector("#brand-header-template");
    for (const [_, brandData] of brandDataList.entries()) {
        const brandHeaderFrag = document.importNode(headerTemplate.content, true);
        const brandHeader = brandHeaderFrag.querySelector("th");
        brandHeader.textContent = brandData["name"];
        headerRow.appendChild(brandHeaderFrag);
    }

    // find table body and templates
    const tableBody = document.querySelector("#comparison-table tbody");
    const rowTemplate = document.querySelector("#comparison-row-template");
    const servingCellTemplate = document.querySelector("#serving-cell-template");

    // build nutrient rows
    for (const [nutrientName, nutrientData] of Object.entries(nutrientList)) {
        // skip nutrients that are not contained in any brand
        if (!nutrientData.display)
            continue;

        // parse daily value for nutrient
        // we don't need to parse ingredient from nutrient data because it is always an object
        const [_, nutrientUnits] = ParseServing(nutrientData["dv"]);

        // create html row
        const nutrientRowFrag = document.importNode(rowTemplate.content, true);
        const nutrientRow = nutrientRowFrag.querySelector("tr");
        tableBody.appendChild(nutrientRowFrag);

        // set header
        const nutrientHeader = nutrientRow.querySelector("th");
        nutrientHeader.textContent = nutrientName;

        // set brand servings
        for (const [brandId, brandData] of brandDataList.entries()) {
            const brandNutrition = brandData["nutrition"];

            // create html serving cell
            const servingCellFrag = document.importNode(servingCellTemplate.content, true);
            const servingCell = servingCellFrag.querySelector("td");
            nutrientRow.appendChild(servingCellFrag);

            // if brand does not contain this nutrient the property will not exist
            if (!brandNutrition[nutrientName]) {
                servingCell.textContent = "-";
                continue;
            }

            // parse brand serving size from data
            const brandNutrientData = ParseIngredient(brandNutrition[nutrientName], "serving");
            const [brandValue, brandUnits] = ParseServing(brandNutrientData["serving"]);

            // require strict units for nutrients, alert on mismatch
            if (brandUnits !== nutrientUnits) {
                alert(brandId + " " + nutrientName + " must be supplied in " + nutrientUnits);
                servingCell.textContent = "ERR";
                continue;
            }

            // set serving value
            // use nutrient units to ensure visual consistency
            servingCell.textContent = brandValue + nutrientUnits;
        }
    }

    // build supplement rows
    for (const supplementName of supplementList) {
        // create html row
        const supplementRowFrag = document.importNode(rowTemplate.content, true);
        const supplementRow = supplementRowFrag.querySelector("tr");
        tableBody.appendChild(supplementRowFrag);

        // set header
        const supplementHeader = supplementRow.querySelector("th");
        supplementHeader.textContent = supplementName;

        // set brand servings
        for (const [brandId, brandData] of brandDataList.entries()) {
            const brandSupplements = brandData["supplements"];

            // create html serving cell
            const servingCellFrag = document.importNode(servingCellTemplate.content, true);
            const servingCell = servingCellFrag.querySelector("td");
            supplementRow.appendChild(servingCellFrag);

            // if brand does not contain this supplement the property will not exist
            if (!brandSupplements[supplementName]) {
                servingCell.textContent = "-";
                continue;
            }

            // parse brand serving size from data
            const brandSupplementData = ParseIngredient(brandSupplements[supplementName], "serving");

            // set serving value
            servingCell.textContent = brandSupplementData.serving;
        }
    }

    // set up any new ccl elements in document
    cclElementRegistry.raiseCallbacks(document);
}
catch (err) {
    console.log("Error loading side-by-side comparison: " + err);
}