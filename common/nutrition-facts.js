import * as cclIngredients from '/common/ingredients.js'
import * as cclUtils from '/common/utils.js'
import cclAsyncResource from '/common/async-resource.js'
import cclMessageStack from '/ccl-elements/message-stack.js'

class cclNutritionFacts extends HTMLElement {
  /**
   * Timeout to use for dependency loading in ms.
   * @type {number}
   */
  static s_dependencyTimeout = 10000;

  /**
   * Async html data fragment resource.
   * @type {cclAsyncResource<DocumentFragment>}
   */
  static s_htmlResource;

  /**
   * Async css stylesheet resource.
   * @type {cclAsyncResource<void>}
   */
  static s_styleResource;

  /**
   * Access html data fragment resource promise.
   * @param {AbortSignal} abortSignal
   * @returns {Promise<DocumentFragment>}
   */
  #htmlPromise(abortSignal) {
    return cclNutritionFacts.s_htmlResource.promise(abortSignal);
  }

  /**
   * Access css stylesheet resource promise.
   * @param {AbortSignal} abortSignal
   * @returns {Promise<void>}
   */
  #stylePromise(abortSignal) {
    return cclNutritionFacts.s_styleResource.promise(abortSignal);
  }

  /** Static Initialization */
  static {
    // load html document fragment resource
    this.s_htmlResource = cclAsyncResource.load(
      'HTML',
      async () => {
        const htmlText = await cclUtils.fetchText(
          '/common/nutrition-facts.html',
          { timeout: this.s_dependencyTimeout }
        );
        const templateElem = document.createElement('template');
        templateElem.innerHTML = htmlText;
        return templateElem.content;
      }
    );

    // load stylesheet resource and append to document
    this.s_styleResource = cclAsyncResource.load(
      'Style',
      async () => {
        const cssText = await cclUtils.fetchText(
          '/common/nutrition-facts.css',
          { timeout: this.s_dependencyTimeout }
        );
        const styleElem = document.createElement('style');
        styleElem.appendChild(document.createTextNode(cssText));
        document.head.appendChild(styleElem);
      }
    );
  }

  /**
   * Unique id for data source file and property.
   * @type {string}
   * */
  #_dataId;

  /**
   * Abort controller for rebuild operation.
   * @type {AbortController}
   */
  #_controller;

  /**
   * Message stack.
   * @type {cclMessageStack}
   */
  #_messageStack;

  /**
   * List of child nodes added by rebuild.
   * @type {Node[]}
   */
  #_childNodes;

  /**
   * Rebuild html from data file.
   * @returns {Promise<void>}
   */
  async #rebuild() {
    // create message stack if it does not yet exist
    if (!this.#_messageStack) {
      this.#_messageStack = new cclMessageStack();
      this.appendChild(this.#_messageStack);
    }

    try {
      // read source attributes
      const srcFile = this.getAttribute('src-file');
      if (!srcFile)
        throw 'Source file attribute \'src-file\' not set.';
      const srcProp = this.getAttribute('src-prop');

      // rebuild may be called repeatedly with the same attributes, early out
      const dataId = `'${srcFile}'${srcProp !== null ? `[${srcProp}]` : ''}`;
      if (dataId === this.#_dataId)
        return;
      this.#_dataId = dataId;

      // abort previous operation
      // TODO: this abort should not cause an error message
      this.#_controller?.abort('source attributes changed');
      this.#_controller = new AbortController();

      // fetch source data
      const srcData = await (async () => {
        const srcDataFile = await cclUtils.fetchJson(
          srcFile,
          { signal: this.#_controller.signal, timeout: cclNutritionFacts.s_dependencyTimeout }
        );
        if (srcProp === null)
          return srcDataFile;
        if (!srcDataFile.hasOwnProperty(srcProp))
          throw `Source file '${srcFile}' property '${srcProp}' does not exist.`;
        return srcDataFile[srcProp];
      })();

      // get html templates
      // no need for timeout here html promise already has a timeout
      const htmlFrag = await this.#htmlPromise(this.#_controller.signal);

      // query facts template
      const factsTpl = htmlFrag.querySelector('#nutrition-facts-template');
      if (!(factsTpl instanceof HTMLTemplateElement))
        throw 'nutrition facts template element must be of type template';
      const factsFrag = document.importNode(factsTpl.content, true);

      // headers
      // TODO: do we need something else to handle empty serving size or servings per?
      // TODO: handle failed queries?
      factsFrag.querySelector('.title').textContent = 'Supplement Facts';
      const svsize = srcData.servingSize;
      if (svsize)
        factsFrag.querySelector('.serving-size').textContent = `Serving Size: ${svsize}`;
      const svper = srcData.servingsPerContainer;
      if (svper)
        factsFrag.querySelector('.servings-per').textContent = `Servings Per Container: ${svper}`;
      factsFrag.querySelector('.serving-header').textContent = 'Amount Per Serving';
      factsFrag.querySelector('.percent-dv-header').textContent = '% Daily Value';

      // body
      const table = factsFrag.querySelector('table');
      const ingrRowTpl = htmlFrag.querySelector('#ingredient-row-template');
      if (!(ingrRowTpl instanceof HTMLTemplateElement))
        throw 'ingredient row template element must be of type template';
      const separatorTpl = htmlFrag.querySelector('#separator-template');
      if (!(separatorTpl instanceof HTMLTemplateElement))
        throw 'separator template element must be of type template';

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
      const pdvfootnote = srcData.showPdvFootnote;
      const nodvsfootnote = srcData.showNdvFootnote;
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
        srcData.otherIngredients, { servingKey: 'serving', errPrefix: 'Ingredient' }
      );
      if (otheringreds.size > 0) {
        const str = Array.from(otheringreds).map(([_, data]) => data.name).join(', ') + '.';
        factsFrag.querySelector('.other-ingredients').textContent = `Other Ingredients: ${str}`;
      }

      // wait for styling
      // no need for timeout here style promise already has a timeout
      await this.#stylePromise(this.#_controller.signal);

      // remove previous child nodes and append new frag
      this.#_childNodes?.forEach((node) => { this.removeChild(node); });
      this.#_childNodes = Array.from(factsFrag.childNodes);
      this.appendChild(factsFrag);
    }
    catch (err) {
      if (this.#_messageStack)
        this.#_messageStack.error('Supplement Facts Load Failed', err.message ? err.message : err);
      const msg = err.stack ? err.stack.replace(/\s+/g, ' ') : err;
      console.log(`Supplement facts load failed: ${msg}`);
      return;
    }
  }

  /**
   * Observed attributes for HTMLElement base class.
   * @type {string[]}
   */
  static observedAttributes = ['src-file', 'src-prop'];

  /**
   * Handle connection to dom.
   */
  connectedCallback() {
    // queue up rebuild in case element was not connected during attribute changes
    setTimeout(() => { this.#rebuild(); });
  }

  /**
   * Handle observed attribute changed.
   */
  attributeChangedCallback() {
    // queue up rebuild so it is handled after all attribute changes
    if (this.isConnected)
      setTimeout(() => { this.#rebuild(); });
  }
};
customElements.define('ccl-nutrition-facts', cclNutritionFacts);
