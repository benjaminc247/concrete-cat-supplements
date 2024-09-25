import * as cclIngredients from '/common/ingredients.js'
import * as cclUtils from '/common/utils.js'

/**
 * Creates an html element with the specified tag and appends it to the parent
 * @param {HTMLElement} parent The parent element
 * @param {String} tagName The name of an element to create
 * @param {String} classList Optional class list to add to the element
 * @param {String} textContent Optional text content to set on the element
 * @returns {HTMLElement} The created element
 */
function createAppendElement(parent, tagName, classList = undefined, textContent = undefined) {
  const elem = document.createElement(tagName);
  if (classList)
    elem.classList.add(classList);
  if (textContent)
    elem.textContent = textContent;
  parent.appendChild(elem);
  return elem;
}

class HTMLSupplementFactsElement extends HTMLElement {
  async connectedCallback() {
    try {
      // read source attributes
      const srcFile = this.getAttribute('src-file');
      if (!srcFile)
        throw 'Source file attribute \'src-file\' not set.';
      const srcProp = this.getAttribute('src-prop');

      // fetch source data
      const srcData = await (async () => {
        const srcFileDat = await cclUtils.fetchJson(srcFile);
        if (srcProp === null)
          return srcFileDat;
        if (!srcFileDat.hasOwnProperty(srcProp))
          throw `Source file '${srcFile} property '${srcProp} does not exist.`;
        return srcFileDat[srcProp];
      })();

      // TODO: load template

      // TODO: load styles

      // add top level outline
      const outline = createAppendElement(this, 'div', 'outline');

      // add headers
      createAppendElement(outline, 'h1', undefined, 'Supplement Facts');
      const svsize = srcData['serving-size'];
      if (svsize)
        createAppendElement(outline, 'h2', undefined, `Serving Size: ${svsize}`);
      const svper = srcData['servings-per-container'];
      if (svper)
        createAppendElement(outline, 'h2', undefined, `Servings Per Container: ${svper}`);

      // add ingredients table and headers
      const table = createAppendElement(outline, 'table');
      const headerrow = createAppendElement(table, 'tr');
      createAppendElement(headerrow, 'th', undefined, 'Amount Per Serving');
      createAppendElement(headerrow, 'th', undefined, '% Daily Value');

      // add nutrients
      const nutrients = cclIngredients.parseList(
        srcData['nutrients'], { servingKey: 'serving', errPrefix: 'Nutrient' }
      );
      for (const nutrient of nutrients.values()) {
        const row = createAppendElement(table, 'tr');
        const ps = createAppendElement(row, 'td');
        createAppendElement(ps, 'p', undefined, nutrient['name']);
        createAppendElement(ps, 'p', undefined, nutrient['serving']);
        createAppendElement(row, 'td', undefined, nutrient['percent-dv']);
      }

      // add supplements
      const supplements = cclIngredients.parseList(
        srcData['supplements'], { servingKey: 'serving', errPrefix: 'Supplement' }
      );
      if (supplements.size > 0) {
        if (nutrients.size > 0)
          createAppendElement(table, 'tr', 'separator');
        for (const supplement of supplements.values()) {
          const row = createAppendElement(table, 'tr');
          const ps = createAppendElement(row, 'td');
          createAppendElement(ps, 'p', undefined, supplement['name']);
          createAppendElement(ps, 'p', undefined, supplement['serving']);
          createAppendElement(row, 'td', undefined, supplement['percent-dv']);
        };
      }

      // add footnotes
      const pdvfootnote = srcData['show-percent-dv-footnote'];
      const nodvsfootnote = srcData['show-no-dv-footnote'];
      if (pdvfootnote || nodvsfootnote) {
        const footnote = createAppendElement(outline, 'div', 'footnotes');
        if (pdvfootnote) {
          createAppendElement(
            footnote, 'p', undefined, '* Percent Daily Values are based on a 2,000 calorie diet.'
          );
        }
        if (nodvsfootnote) {
          createAppendElement(
            footnote, 'p', undefined, '† Daily Value not established.'
          );
        }
      }

      // add other ingredients
      const otheringreds = cclIngredients.parseList(
        srcData['other-ingredients'], { servingKey: 'serving', errPrefix: 'Ingredient' }
      );
      if (otheringreds.size > 0) {
        const footnote = createAppendElement(this, 'div', 'footnotes');
        const str = Array.from(otheringreds).map(([_, data]) => data.name).join(', ') + '.';
        createAppendElement(footnote, 'p', undefined, `Other Ingredients: ${str}`);
      }
    }
    catch (err) {
      console.log(`Error loading supplement facts: ${err}`);
    }
  }
}

customElements.define('ccl-supplement-facts', HTMLSupplementFactsElement);