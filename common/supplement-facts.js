import * as cclIngredients from '/common/ingredients.js'
import * as cclUtils from '/common/utils.js'

customElements.define('ccl-supplement-facts', class extends HTMLElement {
  /**
   * Timeout to use for dependency loading.
   * @type {number}
   */
  get s_dependencyTimeout() { return 10000; }

  /**
   * Promise for html data fragment from static initialization.
   * Resolves when loading is complete, returning the new document fragment if successful.
   * On failure saves error in s_htmlError.
   * @type {Promise<DocumentFragment|undefined>}
   * */
  static s_htmlPromise;

  /**
   * Error loading html data fragment during static initialization.
   * @type {Error}
   * */
  static s_htmlError;

  /**
   * Get html data promise.
   * Resolves with document fragment when loading is successful or rejects with load error.
   * This accessor will reject every time it is called while s_htmlError is set.
   * @param {AbortSignal} signal - abort signal
   * @returns {Promise<DocumentFragment>}
   */
  #htmlPromise(signal) {
    return new Promise((resolve, reject) => {
      (async () => {
        // check abort before call and listen for abort during await
        if (signal.aborted)
          return reject(`HTML promise early abort: ${signal.reason}`);
        const onAbort = () => {
          signal.removeEventListener('abort', onAbort);
          return reject(`HTML promise aborted: ${signal.reason}`);
        }
        signal.addEventListener('abort', onAbort);
        // html promise never rejects it sets html error instead
        // saving error allows this promise to reject every time
        const ret = await this.constructor.s_htmlPromise;
        signal.removeEventListener('abort', onAbort);
        if (this.constructor.s_htmlError)
          return reject(`HTML promise error: ${this.constructor.s_htmlError}`);
        return resolve(ret);
      })();
    });
  }

  /**
   * Promise for css stylesheet load from static initialization.
   * Resolves when loading is complete.
   * On failure saves error in s_styleError.
   * @type {Promise<void>}
   * */
  static s_stylePromise;

  /**
   * Error loading stylesheet during static initialization.
   * @type {Error}
   * */
  static s_styleError;

  /**
   * Get style data promise.
   * Resolves when loading is successful or rejects with load error.
   * This accessor will reject every time it is called while s_styleError is set.
   * @param {AbortSignal} signal - abort signal
   * @returns {Promise<void>}
   */
  #stylePromise(signal) {
    return new Promise((resolve, reject) => {
      (async () => {
        // check abort before call and listen for abort during await
        if (signal.aborted)
          return reject(`Style promise early abort: ${signal.reason}`);
        const onAbort = () => {
          signal.removeEventListener('abort', onAbort);
          return reject(`Style promise aborted: ${signal.reason}`);
        }
        signal.addEventListener('abort', onAbort);
        // style promise never rejects it sets style error instead
        // saving error allows this promise to reject every time
        await this.constructor.s_stylePromise;
        signal.removeEventListener('abort', onAbort);
        if (this.constructor.s_styleError)
          return reject(`Style promise error: ${this.constructor.s_styleError}`);
        return resolve();
      })();
    });
  }

  /** Static Initialization */
  static {
    // fetch html and convert to document fragment
    // set error and resolve instead of rejecting, promise accessor will handle the error
    this.s_htmlPromise = new Promise((resolve) => {
      (async () => {
        const htmlText = await cclUtils.fetchText(
          '/common/supplement-facts.html',
          { timeout: this.s_dependencyTimeout }
        );
        const templateElem = document.createElement('template');
        templateElem.innerHTML = htmlText;
        return resolve(templateElem.content);
      })().catch((err) => {
        // this must ensure html error is not falsy
        this.s_htmlError = err.stack ? err : new Error(err);
        return resolve(undefined);
      });
    });

    // fetch stylesheet and append to document head
    // set error and resolve instead of rejecting, promise accessor will handle the error
    this.s_stylePromise = new Promise((resolve) => {
      (async () => {
        const cssText = await cclUtils.fetchText(
          '/common/supplement-facts.css',
          { timeout: this.s_dependencyTimeout }
        );
        const styleElem = document.createElement('style');
        styleElem.appendChild(document.createTextNode(cssText));
        document.head.appendChild(styleElem);
        return resolve();
      })().catch((err) => {
        // this must ensure style error is not falsy
        this.s_styleError = err.stack ? err : new Error(err);
        return resolve();
      });
    });
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
   * List of child nodes added by rebuild.
   * @type {Node[]}
   */
  #_childNodes;

  /**
   * Rebuild html from data file.
   * @returns {Promise<void>}
   */
  async #rebuild() {
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
          { signal: this.#_controller.signal, timeout: this.s_dependencyTimeout }
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
      const factsTpl = htmlFrag.querySelector('#supplement-facts-template');
      const factsFrag = document.importNode(factsTpl.content, true);

      // headers
      // TODO: do we need something else to handle empty serving size or servings per?
      // TODO: handle failed queries?
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
      const ingrRowTpl = htmlFrag.querySelector('#ingredient-row-template');
      const separatorTpl = htmlFrag.querySelector('#separator-template');

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

      // wait for styling
      // no need for timeout here style promise already has a timeout
      await this.#stylePromise(this.#_controller.signal);

      // remove previous child nodes and append new frag
      this.#_childNodes?.forEach((node) => { this.removeChild(node); });
      this.#_childNodes = Array.from(factsFrag.childNodes);
      this.appendChild(factsFrag);
    }
    catch (err) {
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
});