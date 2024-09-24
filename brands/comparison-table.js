import * as cclElementRegistry from "/ccl-elements/registry.js";
import * as cclIngredients from "/common/ingredients.js"
import * as cclServing from "/common/serving.js"

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

class HTMLCompTableElement extends HTMLElement {
  #_brandDataList;
  #_nutrientList;
  #_supplementList;

  /**
   * Load comparison table data
   */
  async #load() {
    // get required attributes
    const srcFile = this.getAttribute('src-file');
    if (!srcFile)
      throw 'Data source file attribute \'data-src\' not set.';
    const srcProp = this.getAttribute('src-prop');
    if (!srcProp)
      throw 'Data source property attribute \'data-prop\' not set.';

    // load brand id list
    const brandIdList = (await loadJsonFile(srcFile))[srcProp];
    if (!Array.isArray(brandIdList))
      throw `Brand list '${srcProp}' does not exist or is not an array.`;

    // load nutrient data
    const nutrientDataMap = cclIngredients.parseList(
      await loadJsonFile("/nutrients.json"),
      { servingKey: "dv", errPrefix: "Nutrient" }
    );

    // load all brand data
    this.#_brandDataList = new Map();
    for (const brandId of brandIdList) {
      this.#_brandDataList.set(brandId, await (loadJsonFile("/brands/data/" + brandId + ".json")));
    }

    // build list of nutrients to be displayed and their units
    // only display nutrients which exist in at least one brand
    // all nutrients are known, alert if brand contains invalid nutrient data
    this.#_nutrientList = new Map();
    for (const [brandId, brandData] of this.#_brandDataList.entries()) {
      brandData.nutrition = cclIngredients.parseList(
        brandData.nutrition,
        { servingKey: "serving", errPrefix: "Nutrient" }
      );
      for (const [brandNutrientName, _] of brandData.nutrition.entries()) {
        if (this.#_nutrientList.has(brandNutrientName))
          continue;
        const nutrientData = nutrientDataMap.get(brandNutrientName);
        if (!nutrientData) {
          alert(brandId + " lists invalid nutrient '" + brandNutrientName + "'");
          continue;
        }
        this.#_nutrientList.set(brandNutrientName, nutrientData.dv.units);
      }
    }

    // build list of supplements which appear in any brand
    // there is no comprehensive list of supplements just take them as they come
    // take units from the first appearance
    this.#_supplementList = new Map();
    for (const [brandId, brandData] of this.#_brandDataList.entries()) {
      brandData.supplements = cclIngredients.parseList(
        brandData.supplements,
        { servingKey: "serving", errPrefix: "Supplement" }
      );
      for (const [brandSupplementName, brandSupplementData] of brandData.supplements.entries()) {
        if (this.#_supplementList.has(brandSupplementName))
          continue;
        this.#_supplementList.set(brandSupplementName, brandSupplementData.serving.units);
      }
    }
  }

  /**
   * Build table element from data
   */
  #build() {
    // table frag
    const tableTpl = document.querySelector("template.ccl-comp-table");
    if (!tableTpl)
      throw "ccl-comp-table requires a content template matching 'template.ccl-comp-table'";
    const tableFrag = document.importNode(tableTpl.content, true);

    // top level element parts
    const headerRow = tableFrag.querySelector("table thead tr");
    if (!headerRow)
      throw "ccl-comp-table must contain a header row element matching 'table thead tr'";
    const body = tableFrag.querySelector("table tbody");
    if (!body)
      throw "ccl-comp-table must contain a body element matching 'table tbody'";

    // brand header template
    const brandHeaderTpl = tableFrag.querySelector("template.brand-header");
    if (!brandHeaderTpl)
      throw "ccl-comp-table must contain a brand header template matching 'template.brand-header'";
    if (!brandHeaderTpl.content.querySelector(".brand-name"))
      throw "ccl-comp-table brand-header must contain a text element matching '.brand-name'";

    // ingredient row template
    const ingredientRowTpl = tableFrag.querySelector("template.ingredient-row");
    if (!ingredientRowTpl)
      throw "ccl-comp-table must contain an ingredient row template matching 'template.ingredient-row'";
    if (!ingredientRowTpl.content.querySelector("tr"))
      throw "ccl-comp-table ingredient-row must contain a row element matching 'tr'";
    if (!ingredientRowTpl.content.querySelector(".ingredient-name"))
      throw "ccl-comp-table ingredient-row must contain a text element matching '.ingredient-name'";

    // serving cell template
    const servingCellTpl = tableFrag.querySelector("template.serving-cell");
    if (!servingCellTpl)
      throw "ccl-comp-table must contain a serving cell template matching 'template.serving-cell'";
    if (!servingCellTpl.content.querySelector(".serving"))
      throw "ccl-comp-table serving-cell must contain a text element matching '.serving'";

    // TODO: ensure data: brandData["name"]

    // build header row
    for (const [_, brandData] of this.#_brandDataList.entries()) {
      const brandHeaderFrag = document.importNode(brandHeaderTpl.content, true);
      brandHeaderFrag.querySelector(".brand-name").textContent = brandData["name"];
      headerRow.appendChild(brandHeaderFrag);
    }

    // build nutrient rows
    for (const [nutrientName, nutrientUnits] of this.#_nutrientList.entries()) {
      // create row
      const ingredientRowFrag = document.importNode(ingredientRowTpl.content, true);
      const ingredientRow = ingredientRowFrag.querySelector("tr");
      ingredientRowFrag.querySelector(".ingredient-name").textContent = nutrientName;
      body.appendChild(ingredientRowFrag);

      // create serving cells
      for (const [brandId, brandData] of this.#_brandDataList.entries()) {
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
        if (!brandServing || !nutrientUnits) {
          servingText.textContent = "ERR";
          continue;
        }

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
    for (const [supplementName, supplementUnits] of this.#_supplementList.entries()) {
      // create row
      const ingredientRowFrag = document.importNode(ingredientRowTpl.content, true);
      const ingredientRow = ingredientRowFrag.querySelector("tr");
      ingredientRow.querySelector(".ingredient-name").textContent = supplementName;
      body.appendChild(ingredientRowFrag);

      // create serving cells
      for (const [brandId, brandData] of this.#_brandDataList.entries()) {
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
        if (!brandServing || !supplementUnits) {
          servingText.textContent = "ERR";
          continue;
        }

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

    // add element to document
    this.appendChild(tableFrag);

    // set up any new ccl elements in document
    cclElementRegistry.raiseCallbacks(document);
  }

  connectedCallback() {
    this.#load()
      .then(() => this.#build())
      .catch((reason) => {
        console.log("Error loading side-by-side comparison: " + reason);
      });
  }
}

customElements.define('ccl-comp-table', HTMLCompTableElement);