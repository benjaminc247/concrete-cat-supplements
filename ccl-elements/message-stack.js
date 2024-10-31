import * as cclUtils from '/common/utils.js'
import cclAsyncResource from '/common/async-resource.js'

export default class cclMessageStack extends HTMLElement {
  /**
   * Default animation duration in ms.
   * @type {number}
   * @readonly
   */
  static #s_animDuration = 200;

  /**
   * Timeout to use for dependency loading in ms.
   * @type {number}
   * @readonly
   */
  static #s_dependencyTimeout = 10000;

  /**
   * Async message card html template from file.
   * In case of error log and resolve with null.
   * @type {Promise<HTMLTemplateElement|null>}
   * @readonly
   */
  static #s_cardTemplate = (async () => {
    const fileName = '/ccl-elements/message-stack.html';
    try {
      const htmlText = await cclUtils.fetchText(
        fileName,
        { timeout: cclMessageStack.#s_dependencyTimeout }
      );
      const templateElem = document.createElement('template');
      templateElem.innerHTML = htmlText;
      const htmlFrag = templateElem.content;

      // retrieve card template
      const cardId = 'message-card-template';
      const cardTemplate = htmlFrag.querySelector(`#${cardId}`);
      if (!(cardTemplate instanceof HTMLTemplateElement))
        throw `Missing required template with id '${cardId}'.`;

      // verify card template elements
      function checkSelector(
        /** @type {ParentNode} */ parent,
        /** @type {string} */ errPrefix,
        /** @type {string} */ selector
      ) {
        if (!parent.querySelector(selector)) {
          console.log(`${errPrefix} selector \'${selector}\' failed`);
          return false;
        }
        return true;
      }
      var cardTplValid = true;
      const cardFrag = cardTemplate.content;
      cardTplValid &&= checkSelector(cardFrag, cardId, '#collapse');
      cardTplValid &&= checkSelector(cardFrag, cardId, '#content');
      cardTplValid &&= checkSelector(cardFrag, cardId, '#close');
      cardTplValid &&= checkSelector(cardFrag, cardId, '#card');
      cardTplValid &&= checkSelector(cardFrag, cardId, '#title-text');
      cardTplValid &&= checkSelector(cardFrag, cardId, '#message-text');
      if (!cardTplValid)
        throw `Missing one or more required elements in ${cardId}`

      return cardTemplate;
    }
    catch (except) {
      console.log(cclUtils.exceptStr(except, `loading message stack html from '${fileName}'`));
    }
  })();

  /**
   * Async css stylesheet from file.
   * In case of error log and resolve with null.
   * @type {Promise<CSSStyleSheet|null>}
   * @readonly
   */
  static #s_styleSheet = (async () => {
    const fileName = '/ccl-elements/message-stack.css';
    try {
      const cssText = await cclUtils.fetchText(
        fileName,
        { timeout: cclMessageStack.#s_dependencyTimeout }
      );
      return await new CSSStyleSheet().replace(cssText);
    }
    catch (except) {
      console.log(cclUtils.exceptStr(except, `loading message stack css from '${fileName}'`));
    }
  })();

  /**
   * Get resource promise.
   * In case of error resolve with null.
   * @param {AbortSignal} [signal]
   * @returns {Promise<null|{cardTemplate: HTMLTemplateElement, styleSheet: CSSStyleSheet }>}
   */
  #resourcePromise(signal) {
    return new Promise((resolve) => {
      (async () => {
        const onAbort = () => {
          signal.removeEventListener('abort', onAbort);
          return resolve(null);
        }
        if (signal) {
          if (signal.aborted)
            return resolve(null);
          signal.addEventListener('abort', onAbort);
        }
        const cardTemplate = await cclMessageStack.#s_cardTemplate;
        const styleSheet = await cclMessageStack.#s_styleSheet;
        if (signal)
          signal.removeEventListener('abort', onAbort);
        if (!cardTemplate || !styleSheet)
          return null;
        return resolve({ cardTemplate: cardTemplate, styleSheet: styleSheet });
      })();
    });
  }

  /**
   * Add message to stack with style.
   * @param {string} style
   * @param {string} title
   * @param {string} message
   * @param {Object} opts
   * @param {AbortSignal} [opts.signal]
   * @param {boolean} [opts.animateIn]
   * @param {string[]} [opts.callstack]
   */
  async #message(style, title, message, { signal, animateIn, callstack }) {
    // await resources
    // in case of abort or load failure log the message
    const load = await this.#resourcePromise(signal);
    if (!load) {
      console.log(cclUtils.errorStr({ name: title, message: message, callstack: callstack }));
      return;
    }
    const { cardTemplate, styleSheet } = load;

    try {
      // create shadow node
      const node = document.createElement('div');
      const shadow = node.attachShadow({ mode: 'open' });
      shadow.adoptedStyleSheets.push(styleSheet);

      // instantiate card template
      const cardFrag = document.importNode(cardTemplate.content, true);

      // set up content
      const stackStr = callstack ? '\n' + callstack.join('\n') : '';
      cardFrag.querySelector('#card').classList.add(style);
      cardFrag.querySelector('#title-text').textContent = title;
      cardFrag.querySelector('#message-text').textContent = `${message}${stackStr}`;

      // retrieve collapse elements
      const collapseElem = cardFrag.querySelector('#collapse');
      const contentElem = cardFrag.querySelector('#content');

      // set up close handler
      cardFrag.querySelector('#close').addEventListener('click', () => {
        var animation;
        var contentHeight;
        function collapseResizeHandler() {
          if (contentHeight === contentElem.scrollHeight)
            return;
          contentHeight = contentElem.scrollHeight;
          setTimeout(() => {
            const animTime = animation?.currentTime ?? 0;
            animation?.cancel();
            animation = collapseElem.animate(
              [
                { maxHeight: collapseElem.scrollHeight + 'px' },
                { maxHeight: '0' }
              ],
              { easing: 'ease-out', duration: cclMessageStack.#s_animDuration }
            );
            animation.currentTime = animTime;
            animation.addEventListener('finish', () => {
              resizeObserver.unobserve(contentElem);
              node.remove();
            });
          });
        }
        const resizeObserver = new ResizeObserver(collapseResizeHandler);
        resizeObserver.observe(contentElem);
        collapseResizeHandler();
      });

      // animate in
      if (animateIn) {
        var animation;
        var contentHeight;
        function expansionResizeHandler() {
          if (contentHeight === contentElem.scrollHeight)
            return;
          contentHeight = contentElem.scrollHeight;
          setTimeout(() => {
            const animTime = animation?.currentTime ?? 0;
            animation?.cancel();
            animation = collapseElem.animate(
              [
                { maxHeight: '0' },
                { maxHeight: collapseElem.scrollHeight + 'px' }
              ],
              { easing: 'ease-in', duration: cclMessageStack.#s_animDuration }
            );
            animation.currentTime = animTime;
            animation.addEventListener('finish', () => { resizeObserver.unobserve(contentElem); });
          });
        }
        const resizeObserver = new ResizeObserver(expansionResizeHandler);
        resizeObserver.observe(contentElem);
        expansionResizeHandler();
      }

      // append to end of dom
      shadow.appendChild(cardFrag);
      this.appendChild(node);
    }
    catch (except) {
      console.log(cclUtils.exceptStr(except, `appending to message stack`));
      console.log(cclUtils.errorStr({ name: title, message: message, callstack: callstack }));
    }
  }

  /**
   * @typedef MessageOpts
   * @property {AbortSignal} [signal]
   * @property {boolean} [animateIn]
   */

  /**
   * Add success message to stack.
   * @param {string} title
   * @param {string} message
   * @param {MessageOpts} [opts]
   */
  async success(title, message, opts = {}) {
    return this.#message('success', title, message, opts);
  }

  /**
   * Add info message to stack.
   * @param {string} title
   * @param {string} message
   * @param {MessageOpts} [opts]
   */
  async info(title, message, opts = {}) {
    return this.#message('info', title, message, opts);
  }

  /**
   * Add warning message to stack.
   * @param {string} title
   * @param {string} message
   * @param {MessageOpts} [opts]
   */
  async warning(title, message, opts = {}) {
    return this.#message('warning', title, message, opts);
  }

  /**
   * Add error message to stack.
   * @param {string} title
   * @param {string} message
   * @param {MessageOpts} [opts]
   */
  async error(title, message, opts = {}) {
    return this.#message('error', title, message, opts);
  }

  /**
   * Add exception message to stack.
   * @param {string} title
   * @param {any} except
   * @param {string} context
   * @param {MessageOpts} [opts]
   */
  async except(title, except, context, opts = {}) {
    const err = cclUtils.parseExcept(except);
    const message = `${err.name}${context ? ' ' + context : ''}: ${err.message}`;
    this.#message('error', title, message, {
      signal: opts.signal,
      animateIn: opts.animateIn,
      callstack: err.callstack
    });
  }
}
customElements.define('ccl-message-stack', cclMessageStack);
