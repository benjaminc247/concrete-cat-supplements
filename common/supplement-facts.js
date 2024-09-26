import * as cclIngredients from '/common/ingredients.js'
import * as cclUtils from '/common/utils.js'

customElements.define('ccl-supplement-facts', class extends HTMLElement {
  // html fragment containing content templates
  static s_htmlFrag;
  get #htmlFrag() {
    return this.constructor.s_htmlFrag;
  }

  // static initialization promise
  static s_initPromise;
  static s_initError;
  #initPromise() {
    return new Promise((resolve, reject) => {
      return this.constructor.s_initPromise.then(() => {
        if (this.constructor.s_initError === undefined)
          resolve();
        else
          reject(this.constructor.s_initError);
      })
    });
  }

  /**
   * Static initialization.
   */
  static {
    this.s_initPromise = new Promise((resolve, reject) => {
      (async () => {
        try {
          // fetch html and convert to document fragment
          const htmlText = await cclUtils.fetchText('/common/supplement-facts.html');
          const tpl = document.createElement('template');
          tpl.innerHTML = htmlText;
          this.s_htmlFrag = tpl.content;

          // import stylesheet
          const cssText = await cclUtils.fetchText('/common/supplement-facts.css');
          const styleElem = document.createElement('style');
          styleElem.appendChild(document.createTextNode(cssText));
          document.head.appendChild(styleElem);

          // success
          return resolve();
        }
        catch (err) {
          return reject(err);
        }
      })();
    }).catch((err) => {
      this.s_initError = err || 'Undefined error';
    });
  }

  // data source identifier
  #_srcId;

  /**
   * Async build html from data file.
   */
  async #rebuild() {
    try {
      // read source attributes
      const srcFile = this.getAttribute('src-file');
      if (!srcFile)
        throw 'Source file attribute \'src-file\' not set.';
      const srcProp = this.getAttribute('src-prop');

      // rebuild may be called repeatedly with the same attributes, early out
      const srcId = `'${srcFile}'${srcProp !== null ? `['${srcProp}']` : ''}`;
      if (srcId === this.#_srcId)
        return;
      this.#_srcId = srcId;

      // TODO: abort prev rebuilds still fetching src data

      // fetch source data
      const srcData = await (async () => {
        const srcDataFile = await cclUtils.fetchJson(srcFile);
        if (srcProp === null)
          return srcDataFile;
        if (!srcDataFile.hasOwnProperty(srcProp))
          throw `Source file '${srcFile}' property '${srcProp}' does not exist.`;
        return srcDataFile[srcProp];
      })();

      // wait for init
      await this.#initPromise();

      // attributes may have changed while waiting for load
      // new rebuild call will already be in the queue
      if (this.#_srcId !== srcId)
        return;

      // query facts template
      const factsTpl = this.#htmlFrag.querySelector('#supplement-facts-template');
      const factsFrag = document.importNode(factsTpl.content, true);

      // headers
      // TODO: do we need something else to handle empty serving size or servings per?
      factsFrag.querySelector('.title').textContent = 'Supplement Facts';
      const svsize = srcData['serving-size'];
      if (svsize)
        factsFrag.querySelector('.serving-size').textContent = `Serving Size: ${svsize}`;
      const svper = srcData['servings-per-container'];
      if (svper)
        factsFrag.querySelector('.servings-per').textContent = `Servings Per Container: ${svper}`;
      factsFrag.querySelector('.serving-header').textContent = 'Amount Per Serving';
      factsFrag.querySelector('.percent-dv-header').textContent = '% Daily Value';

      // body
      const table = factsFrag.querySelector('table');
      const ingrRowTpl = this.#htmlFrag.querySelector('#ingredient-row-template');
      const separatorTpl = this.#htmlFrag.querySelector('#separator-template');

      // add nutrients
      const nutrients = cclIngredients.parseList(
        srcData['nutrients'], { servingKey: 'serving', errPrefix: 'Nutrient' }
      );
      for (const nutrient of nutrients.values()) {
        const rowFrag = document.importNode(ingrRowTpl.content, true);
        rowFrag.querySelector('.name').textContent = nutrient['name'];
        rowFrag.querySelector('.serving').textContent = nutrient['serving'];
        rowFrag.querySelector('.percent-dv').textContent = nutrient['percent-dv'];
        table.appendChild(rowFrag);
      }

      // add supplements
      const supplements = cclIngredients.parseList(
        srcData['supplements'], { servingKey: 'serving', errPrefix: 'Supplement' }
      );
      if (supplements.size > 0) {
        if (nutrients.size > 0)
          table.appendChild(document.importNode(separatorTpl.content, true));
        for (const supplement of supplements.values()) {
          const rowFrag = document.importNode(ingrRowTpl.content, true);
          rowFrag.querySelector('.name').textContent = supplement['name'];
          rowFrag.querySelector('.serving').textContent = supplement['serving'];
          rowFrag.querySelector('.percent-dv').textContent = supplement['percent-dv'];
          table.appendChild(rowFrag);
        };
      }

      // add footnotes
      // TODO: do we need to remove elements when either of these is false?
      const pdvfootnote = srcData['show-percent-dv-footnote'];
      const nodvsfootnote = srcData['show-no-dv-footnote'];
      if (pdvfootnote || nodvsfootnote) {
        if (pdvfootnote) {
          factsFrag.querySelector('.percent-dv-footnote').textContent =
            '* Percent Daily Values are based on a 2,000 calorie diet.';
        }
        if (nodvsfootnote) {
          factsFrag.querySelector('.no-dv-footnote').textContent =
            '† Daily Value not established.';
        }
      }

      // add other ingredients
      // TODO: do we need to remove the div when there are no other ingredients?
      const otheringreds = cclIngredients.parseList(
        srcData['other-ingredients'], { servingKey: 'serving', errPrefix: 'Ingredient' }
      );
      if (otheringreds.size > 0) {
        const str = Array.from(otheringreds).map(([_, data]) => data.name).join(', ') + '.';
        factsFrag.querySelector('.other-ingredients').textContent = `Other Ingredients: ${str}`;
      }

      // add frag to document
      this.appendChild(factsFrag);
    }
    catch (err) {
      console.log(`Supplement facts load failed due to ${err.stack.replace(/\s+/g, ' ')}`);
      return;
    }
  }

  // observed attributes
  static observedAttributes = ['src-file', 'src-prop'];

  /**
   * Handle connection to dom.
   */
  connectedCallback() {
    // only necessary in case element was not connected during attribute changes
    setTimeout(() => { this.#rebuild() });
  }

  /**
   * Handle observed attribute changed.
   */
  attributeChangedCallback(name, oldValue, newValue) {
    // queue up rebuild in case of multiple attribute changes
    if (this.isConnected)
      setTimeout(() => { this.#rebuild() });
  }
});