import * as cclElementRegistry from '/ccl-elements/registry.js';
import * as cclUtils from '/common/utils.js';
import * as cclIngredients from '/common/ingredients.js';
import * as cclServing from '/common/serving.js';

class HTMLCompTableElement extends HTMLElement {
  /** @type {Map<string, object>} */
  #_brandDataList;

  /** @type {Map<string, {units: ReturnType<typeof cclServing.parse>, name: string}>} */
  #_nutrientList;

  /** @type {Map<string, {units: ReturnType<typeof cclServing.parse>, name: string}>} */
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
    const brandIdList = (await cclUtils.fetchJson(srcFile))[srcProp];
    if (!Array.isArray(brandIdList))
      throw `Brand list '${srcProp}' does not exist or is not an array.`;

    // load nutrient database
    const nutrientDb = cclIngredients.parseList(
      await cclUtils.fetchJson('/nutrientdb.json'),
      { servingKey: 'dv', errPrefix: 'Nutrient' }
    );

    // load all brand data
    this.#_brandDataList = new Map();
    for (const brandId of brandIdList) {
      const brandData = await cclUtils.fetchJson(`/brands/data/${brandId}.json`);
      if (!brandData.name)
        throw `${brandId} data must contain a name property.`;
      this.#_brandDataList.set(brandId, brandData);
    }

    // build list of nutrients to be displayed and their units
    // only display nutrients which exist in at least one brand
    // all nutrients are known, warn if brand contains invalid nutrient data
    this.#_nutrientList = new Map();
    for (const [brandId, brandData] of this.#_brandDataList.entries()) {
      brandData.nutrition = cclIngredients.parseList(
        brandData.nutrition,
        { servingKey: 'serving', errPrefix: 'Nutrient' }
      );
      for (const [nutrientId, _] of brandData.nutrition.entries()) {
        if (this.#_nutrientList.has(nutrientId))
          continue;
        const nutrientData = nutrientDb.get(nutrientId);
        if (!nutrientData) {
          console.log(`${brandId} lists invalid nutrient '${nutrientId}'`);
          continue;
        }
        this.#_nutrientList.set(nutrientId, {
          units: nutrientData.dv.units,
          name: nutrientData.name || cclIngredients.idToName(nutrientId)
        });
      }
    }

    // build list of supplements which appear in any brand
    // there is no comprehensive list of supplements just take them as they come
    // take units from the first appearance
    this.#_supplementList = new Map();
    for (const [brandId, brandData] of this.#_brandDataList.entries()) {
      brandData.supplements = cclIngredients.parseList(
        brandData.supplements,
        { servingKey: 'serving', errPrefix: `${brandId} Supplement` }
      );
      for (const [supplementId, brandSupplementData] of brandData.supplements.entries()) {
        // figure out display name
        const name = brandSupplementData.shortName ||
          brandSupplementData.name ||
          cclIngredients.idToName(supplementId)
        if (this.#_supplementList.has(supplementId)) {
          const prev = this.#_supplementList.get(supplementId);
          if (prev.name !== name)
            console.log(`${brandId} ${supplementId} has display name '${name}' but previous brand used '${prev.name}'`);
          continue;
        }
        this.#_supplementList.set(supplementId, {
          units: brandSupplementData.serving.units,
          name: name
        });
      }
    }
  }

  /**
   * Build table element from data
   */
  #build() {
    // table frag
    const tableTpl = document.querySelector('template.ccl-comp-table');
    if (!(tableTpl instanceof HTMLTemplateElement))
      throw 'ccl-comp-table requires a template matching \'template.ccl-comp-table\'';
    const tableFrag = document.importNode(tableTpl.content, true);

    // top level element parts
    const headerRow = tableFrag.querySelector('table thead tr');
    if (!headerRow)
      throw 'ccl-comp-table must contain an element matching \'table thead tr\'';
    const body = tableFrag.querySelector('table tbody');
    if (!body)
      throw 'ccl-comp-table must contain an element matching \'table tbody\'';

    // brand header template
    const brandHeaderTpl = tableFrag.querySelector('template.brand-header');
    if (!(brandHeaderTpl instanceof HTMLTemplateElement))
      throw 'ccl-comp-table must contain a template matching \'template.brand-header\'';
    if (!brandHeaderTpl.content.querySelector('.brand-name'))
      throw 'ccl-comp-table brand-header must contain an element matching \'.brand-name\'';

    // ingredient row template
    const ingredientRowTpl = tableFrag.querySelector('template.ingredient-row');
    if (!(ingredientRowTpl instanceof HTMLTemplateElement))
      throw 'ccl-comp-table must contain a template matching \'template.ingredient-row\'';
    if (!ingredientRowTpl.content.querySelector('tr'))
      throw 'ccl-comp-table ingredient-row must contain an element matching \'tr\'';
    if (!ingredientRowTpl.content.querySelector('.ingredient-name'))
      throw 'ccl-comp-table ingredient-row must contain an element matching \'.ingredient-name\'';

    // serving cell template
    const servingCellTpl = tableFrag.querySelector('template.serving-cell');
    if (!(servingCellTpl instanceof HTMLTemplateElement))
      throw 'ccl-comp-table must contain a template matching \'template.serving-cell\'';
    if (!servingCellTpl.content.querySelector('.serving'))
      throw 'ccl-comp-table serving-cell must contain an element matching \'.serving\'';

    // build header row
    for (const [_, brandData] of this.#_brandDataList.entries()) {
      const brandHeaderFrag = document.importNode(brandHeaderTpl.content, true);
      brandHeaderFrag.querySelector('.brand-name').textContent = brandData.name;
      headerRow.appendChild(brandHeaderFrag);
    }

    // build nutrient rows
    for (const [nutrientId, nutrientData] of this.#_nutrientList.entries()) {
      // create row
      const ingredientRowFrag = document.importNode(ingredientRowTpl.content, true);
      const ingredientRow = ingredientRowFrag.querySelector('tr');
      ingredientRowFrag.querySelector('.ingredient-name').textContent = nutrientData.name;
      body.appendChild(ingredientRowFrag);

      // create serving cells
      for (const [brandId, brandData] of this.#_brandDataList.entries()) {
        const brandNutrition = brandData.nutrition;

        // create cell
        const servingCellFrag = document.importNode(servingCellTpl.content, true);
        const servingText = servingCellFrag.querySelector('.serving');
        ingredientRow.appendChild(servingCellFrag);

        // if brand does not contain this nutrient the property will not exist
        if (!brandNutrition.has(nutrientId)) {
          servingText.textContent = '-';
          continue;
        }

        // parse brand serving size from data
        const brandServing = brandNutrition.get(nutrientId).serving;
        if (!brandServing || !nutrientData.units) {
          servingText.textContent = 'ERR';
          continue;
        }

        // require strict units for nutrients, alert on mismatch
        if (!cclServing.unitsMatch(brandServing, nutrientData.units)) {
          alert(`${brandId} ${nutrientId} must be supplied in ${nutrientData.units}`);
          servingText.textContent = 'ERR';
          continue;
        }

        // set serving value
        servingText.textContent = brandServing;
      }
    }

    // build supplement rows
    for (const [supplementId, supplementData] of this.#_supplementList.entries()) {
      // create row
      const ingredientRowFrag = document.importNode(ingredientRowTpl.content, true);
      const ingredientRow = ingredientRowFrag.querySelector('tr');
      ingredientRow.querySelector('.ingredient-name').textContent = supplementData.name;
      body.appendChild(ingredientRowFrag);

      // create serving cells
      for (const [brandId, brandData] of this.#_brandDataList.entries()) {
        const brandSupplements = brandData.supplements;

        // create cell
        const servingCellFrag = document.importNode(servingCellTpl.content, true);
        const servingText = servingCellFrag.querySelector('.serving');
        ingredientRow.appendChild(servingCellFrag);

        // if brand does not contain this supplement the property will not exist
        if (!brandSupplements.has(supplementId)) {
          servingText.textContent = '-';
          continue;
        }

        // parse brand serving size from data
        const brandServing = brandSupplements.get(supplementId).serving;
        if (!brandServing || !supplementData.units) {
          servingText.textContent = 'ERR';
          continue;
        }

        // TODO: convert to units
        if (!cclServing.unitsMatch(brandServing, supplementData.units)) {
          alert(`${brandId} ${supplementId} must be supplied in ${supplementData.units}`);
          servingText.textContent = 'ERR';
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
        console.log(`Error loading side-by-side comparison: ${reason}`);
      });
  }
}

customElements.define('ccl-comp-table', HTMLCompTableElement);