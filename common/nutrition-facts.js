import * as cclIngredients from '/common/ingredients.js'
import * as cclUtils from '/common/utils.js'
import cclAsyncResource from '/common/async-resource.js'
import cclMessageStack from '/ccl-elements/message-stack.js'

class cclNutritionFacts extends HTMLElement {
  /**
   * dependency load timeout in ms
   * @type {number}
   */
  static get #s_dependencyTimeout() { return 100000; }

  /**
   * @typedef HtmlParts
   * @property {HTMLTemplateElement} factsTemplate
   * @property {HTMLTemplateElement} rowTemplate
   * @property {HTMLTemplateElement} separatorTemplate
   */
  /**
   * html resource containing nutrition facts templates
   * @type {cclAsyncResource<HtmlParts>}
   * @readonly
   */
  static #s_htmlResource = cclAsyncResource.load(
    /**
     * @throws {AbortError} - abort signalled
     * @throws {TimeoutError} - timeout expired
     * @throws {TypeError} - invalid request or network error
     * @throws {cclUtils.HttpError} - response not ok
     * @throws {SyntaxError} - body could not be parsed as html
     * @throws {cclUtils.ElementRequiredError} - missing required element
     */
    async (setContext, pushError) => {
      const htmlFile = '/common/nutrition-facts.html';

      setContext(`While fetching html from '${htmlFile}'`);

      const htmlTemplate = await cclUtils.fetchHtml(
        htmlFile,
        { timeout: cclNutritionFacts.#s_dependencyTimeout }
      );

      setContext(`While validating html from '${htmlFile}'`);

      const factsId = 'nutrition-facts-template';
      const factsSelector = `template#${factsId}`;
      /** @type {HTMLTemplateElement|null} */
      const factsTemplate = htmlTemplate.content.querySelector(factsSelector);
      if (!factsTemplate) {
        pushError(new cclUtils.ElementsRequiredError(factsSelector));
      }
      else {
        const requiredSelectors = [
          '.title',
          '.serving-size',
          '.servings-per',
          '.serving-header',
          '.percent-dv-header',
          'table',
          '.percent-dv-footnote',
          '.no-dv-footnote',
          '.other-ingredients'
        ].filter((selector) => !factsTemplate.content.querySelector(selector));
        if (requiredSelectors.length)
          pushError(new cclUtils.ElementsRequiredError(requiredSelectors, factsId));
      }

      const rowId = 'ingredient-row-template';
      const rowSelector = `template#${rowId}`;
      /** @type {HTMLTemplateElement|null} */
      const rowTemplate = htmlTemplate.content.querySelector(rowSelector);
      if (!rowTemplate) {
        pushError(new cclUtils.ElementsRequiredError(rowSelector));
      }
      else {
        const requiredSelectors = [
          '.name',
          '.serving',
          '.percent-dv'
        ].filter((selector) => !rowTemplate.content.querySelector(selector));
        if (requiredSelectors.length)
          pushError(new cclUtils.ElementsRequiredError(requiredSelectors, rowId));
      }

      const separatorId = 'separator-template';
      const separatorSelector = `template#${separatorId}`;
      /** @type {HTMLTemplateElement|null} */
      const separatorTemplate = htmlTemplate.content.querySelector(separatorSelector);
      if (!separatorTemplate) {
        pushError(new cclUtils.ElementsRequiredError(separatorSelector));
      }

      return {
        factsTemplate,
        rowTemplate,
        separatorTemplate
      };
    }
  );

  /**
   * css style resource
   * @type {cclAsyncResource<CSSStyleSheet>}
   * @readonly
   */
  static #s_styleResource = cclAsyncResource.load(
    /**
     * @throws {AbortError} - abort signalled
     * @throws {TimeoutError} - timeout expired
     * @throws {TypeError} - invalid request or network error
     * @throws {cclUtils.HttpError} - response not ok
     */
    async (setContext) => {
      const cssFile = '/common/nutrition-facts.css';
      setContext(`While fetching css from '${cssFile}'`);
      return await cclUtils.fetchCss(
        cssFile,
        { timeout: cclNutritionFacts.#s_dependencyTimeout }
      );
    }
  );

  /**
   * html part templates or null in case of error or abort
   * @param {AbortSignal} [signal]
   * @returns {Promise<HtmlParts|null>}
   */
  async #htmlParts(signal) {
    return cclNutritionFacts.#s_htmlResource.promise(signal);
  }

  /**
   * css stylesheet or null in case of error or abort
   * @param {AbortSignal} [signal]
   * @returns {Promise<CSSStyleSheet|null>}
   */
  async #styleSheet(signal) {
    return cclNutritionFacts.#s_styleResource.promise(signal);
  }

  /**
   * Handle load error.
   * @param {any} error
   * @param {string} [context]
   */
  #error(error, context) {
    this.#_messageStack.pushError('Error Loading Nutrition Facts', error, context);
  }

  /**
   * message stack
   * @type {cclMessageStack}
   */
  #_messageStack;

  /**
   * unique id for data source file and property
   * @type {string}
   * */
  #_dataId;

  /**
   * abort controller for rebuild operation
   * @type {AbortController}
   */
  #_controller;

  /**
   * list of child nodes added by rebuild
   * @type {Node[]}
   */
  #_childNodes;

  /**
   * Construct and set up error handling.
   */
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    // create message stack
    this.#_messageStack = new cclMessageStack();
    this.shadowRoot.appendChild(this.#_messageStack);

    // log resource errors
    cclNutritionFacts.#s_htmlResource.addErrorHandler(
      (error, context) => this.#error(error, context)
    );
    cclNutritionFacts.#s_styleResource.addErrorHandler(
      (error, context) => this.#error(error, context)
    );

    // push stylesheet on load
    this.#styleSheet().then((styleSheet) => {
      if (styleSheet)
        this.shadowRoot.adoptedStyleSheets.push(styleSheet)
    });
  }

  /**
   * Rebuild html from data file.
   * @returns {Promise<void>}
   */
  async #rebuild() {
    // read source attributes
    const srcFile = this.getAttribute('src-file');
    const srcProp = this.getAttribute('src-prop');

    // rebuild may be called repeatedly with the same attributes, early out
    const dataId = `'${srcFile}'${srcProp !== null ? `.${srcProp}` : ''}`;
    if (dataId === this.#_dataId)
      return;
    this.#_dataId = dataId;

    // abort previous operation
    this.#_controller?.abort();
    this.#_controller = new AbortController();

    // remove any existing child nodes
    this.#_childNodes?.forEach((node) => { this.shadowRoot.removeChild(node); });
    this.#_childNodes = [];

    // load source data
    if (!srcFile) {
      this.#error(new Error('Source file attribute \'src-file\' not set'));
      return;
    }
    const srcData = await (async () => {
      try {
        const srcDataFile = await cclUtils.fetchJson(
          srcFile,
          { signal: this.#_controller.signal, timeout: cclNutritionFacts.#s_dependencyTimeout }
        );
        if (srcProp === null)
          return srcDataFile;
        if (!srcDataFile.hasOwnProperty(srcProp))
          throw new Error(`Source property '${srcProp}' does not exist`);
        return srcDataFile[srcProp];
      }
      catch (err) {
        if (err && err.name === 'AbortError')
          return null;
        this.#error(err, `While loading source data from '${srcFile}'`);
        return null;
      }
    })();
    if (!srcData)
      return;

    // get html part templates
    const htmlParts = await this.#htmlParts(this.#_controller.signal);
    if (!htmlParts)
      return;

    // create facts node
    const factsTpl = htmlParts.factsTemplate;
    const factsFrag = document.importNode(factsTpl.content, true);

    // headers
    // TODO: do we need something else to handle empty serving size or servings per?
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
    const ingrRowTpl = htmlParts.rowTemplate;
    const separatorTpl = htmlParts.separatorTemplate;

    // add nutrients
    const nutrients = (() => {
      try {
        return cclIngredients.parseList(
          srcData.nutrients, { servingKey: 'serving', errPrefix: 'Nutrient' }
        );
      }
      catch (err) {
        this.#error(err, `While parsing nutrients from ${dataId}.nutrients`);
      }
    })();
    if (nutrients) {
      for (const nutrient of nutrients.values()) {
        const rowFrag = document.importNode(ingrRowTpl.content, true);
        rowFrag.querySelector('.name').textContent = nutrient['name'];
        rowFrag.querySelector('.serving').textContent = nutrient['serving'];
        rowFrag.querySelector('.percent-dv').textContent = nutrient['percent-dv'];
        table.appendChild(rowFrag);
      }
    }

    // add supplements
    const supplements = (() => {
      try {
        return cclIngredients.parseList(
          srcData.supplements, { servingKey: 'serving', errPrefix: 'Supplement' }
        );
      }
      catch (err) {
        this.#error(err, `While parsing supplements from ${dataId}.supplements`);
      }
    })();
    if (supplements && supplements.size > 0) {
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
    const ingredients = (() => {
      try {
        return cclIngredients.parseList(
          srcData.otherIngredients, { servingKey: 'serving', errPrefix: 'Ingredient' }
        );
      }
      catch (err) {
        this.#error(err, `While parsing ingredients from ${dataId}.otherIngredients`);
      }
    })();
    if (ingredients && ingredients.size > 0) {
      const str = Array.from(ingredients).map(([_, data]) => data.name).join(', ') + '.';
      factsFrag.querySelector('.other-ingredients').textContent = `Other Ingredients: ${str}`;
    }

    // wait for styling
    const styleSheet = await this.#styleSheet(this.#_controller.signal);
    if (!styleSheet)
      return;

    // add facts to shadow root
    this.#_childNodes = Array.from(factsFrag.childNodes);
    this.shadowRoot.appendChild(factsFrag);
  }

  /**
   * observed attributes trigger change callback
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
