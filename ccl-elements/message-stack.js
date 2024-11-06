import cclAsyncResource from '/common/async-resource.js'
import * as cclUtils from '/common/utils.js'

export default class cclMessageStack extends HTMLElement {
  /**
   * default animation duration in ms
   * @type {number}
   */
  static get #s_animDuration() { return 200; }

  /**
   * dependency load timeout in ms
   * @type {number}
   */
  static get #s_dependencyTimeout() { return 10000; }

  /**
   * Parse error into parts.
   * @param {any} error
   * @returns {{message: string; callstack: string[]|null}}
   */
  static #parseError(error) {
    if (!error) {
      return {
        message: 'Unknown error',
        callstack: null
      }
    }
    if (!error.message) {
      return {
        message: cclUtils.toSentenceCase(error.toString()),
        callstack: null
      };
    }
    const message = (() => {
      if (error.name === 'TimeoutError')
        return 'Operation timed out';
      return cclUtils.toSentenceCase(error.message);
    })();
    const callstack = (() => {
      if (!error.stack)
        return null;
      const lines = error.stack
        .split(/$/gm)
        .slice(1)
        .map((/** @type {string} */ str) => str.trim().toLowerCase())
        .map((/** @type {string} */ str) => str.replace(`${window.location.origin}/`, '/'));
      return lines.length ? lines : null;
    })();
    return { message, callstack };
  }

  /**
   * Log message to console.
   * @param {string} title
   * @param {string} message
   * @param {string|null} context
   * @param {string[]|null} callstack
   */
  static #logMessage(title, message, context, callstack) {
    console.log(
      cclUtils.toSentenceCase(title) +
      (context ? ` - ${cclUtils.toSentenceCase(context)}` : '') +
      `: ${message}.` +
      (callstack ? ` ${callstack.join(' ')}` : '')
    );
  }

  /**
   * Log error to console.
   * @param {string} title
   * @param {any} error
   * @param {string} context
   */
  static #logError(title, error, context) {
    const { message, callstack } = cclMessageStack.#parseError(error);
    cclMessageStack.#logMessage(title, message, context, callstack);
  }

  /**
   * Handle load error.
   * @param {any} error
   * @param {string} context
   */
  static #error(error, context) {
    cclMessageStack.#logError('Error Loading Message Stack', error, context);
  }

  /**
   * html resource containing message card template
   * @type {cclAsyncResource<HTMLTemplateElement>}
   * @readonly
   */
  static #s_htmlResource = cclAsyncResource.load(
    async (setContext, pushError) => {
      const fileName = '/ccl-elements/message-stack.html';

      setContext(`While fetching html from '${fileName}'`);
      const htmlTemplate = await cclUtils.fetchHtml(
        fileName,
        { timeout: cclMessageStack.#s_dependencyTimeout }
      );

      setContext(`While validating html from '${fileName}'`);
      const cardId = 'message-card-template';
      /** @type {HTMLTemplateElement|null} */
      const cardTemplate = htmlTemplate.content.querySelector(`template#${cardId}`);
      if (!cardTemplate) {
        pushError(new cclUtils.ElementsRequiredError(`template#${cardId}`));
      }
      else {
        const requiredSelectors = [
          '#collapse',
          '#content',
          '#close',
          '#card',
          '#title-text',
          '#message-text'
        ].filter((selector) => !cardTemplate.content.querySelector(selector));
        if (requiredSelectors.length)
          pushError(new cclUtils.ElementsRequiredError(requiredSelectors, cardId));
      }

      return cardTemplate;
    },
    (error, context) => {
      cclMessageStack.#error(error, context);
    }
  );

  /**
   * css style resource
   * @type {cclAsyncResource<CSSStyleSheet>}
   * @readonly
   */
  static #s_styleResource = cclAsyncResource.load(
    async (setContext) => {
      const fileName = '/ccl-elements/message-stack.css';
      setContext(`While fetching css from '${fileName}'`);
      return await cclUtils.fetchCss(
        fileName,
        { timeout: cclMessageStack.#s_dependencyTimeout }
      );
    },
    (error, context) => {
      cclMessageStack.#error(error, context);
    }
  );

  /**
   * html card template or null in case of error or abort
   * @param {AbortSignal} [signal]
   * @returns {Promise<HTMLTemplateElement|null>}
   */
  async #cardTemplate(signal) {
    return await cclMessageStack.#s_htmlResource.promise(signal);
  }

  /**
   * css stylesheet or null in case of error or abort
   * @param {AbortSignal} [signal]
   * @returns {Promise<CSSStyleSheet|null>}
   */
  async #styleSheet(signal) {
    return await cclMessageStack.#s_styleResource.promise(signal);
  }

  /**
   * Push message to stack with style.
   * @param {string} style
   * @param {string} title
   * @param {string} message
   * @param {Object} opts
   * @param {AbortSignal} [opts.signal]
   * @param {boolean} [opts.animateIn]
   * @param {string} [opts.context]
   * @param {string[]} [opts.callstack]
   */
  async #pushMessage(style, title, message, { signal, animateIn, context, callstack }) {
    // log all messages
    cclMessageStack.#logMessage(title, message, context, callstack);

    // instantiate card template
    const cardTemplate = await this.#cardTemplate(signal);
    if (!cardTemplate)
      return;
    const cardFrag = document.importNode(cardTemplate.content, true);

    // set up content
    const contextStr = context ? `${context}:\n` : '';
    cardFrag.querySelector('#card').classList.add(style);
    cardFrag.querySelector('#title-text').textContent = title;
    cardFrag.querySelector('#message-text').textContent = `${contextStr}${message}.`;

    // query collapse elements
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
          animation.addEventListener('finish', () => {
            resizeObserver.unobserve(contentElem);
          });
        });
      }
      const resizeObserver = new ResizeObserver(expansionResizeHandler);
      resizeObserver.observe(contentElem);
      expansionResizeHandler();
    }

    // wait for style sheet
    const styleSheet = await this.#styleSheet(signal);
    if (!styleSheet)
      return;

    // create shadow node and append
    const node = document.createElement('div');
    const shadow = node.attachShadow({ mode: 'open' });
    shadow.adoptedStyleSheets.push(styleSheet);
    shadow.appendChild(cardFrag);
    this.appendChild(node);
  }

  /**
   * @typedef MessageOpts
   * @property {AbortSignal} [signal]
   * @property {boolean} [animateIn]
   */

  /**
   * Push success message to stack.
   * @param {string} title
   * @param {string} message
   * @param {MessageOpts} [opts]
   */
  async pushSuccess(title, message, opts = {}) {
    return this.#pushMessage('success', title, message, opts);
  }

  /**
   * Push info message to stack.
   * @param {string} title
   * @param {string} message
   * @param {MessageOpts} [opts]
   */
  async pushInfo(title, message, opts = {}) {
    return this.#pushMessage('info', title, message, opts);
  }

  /**
   * Push warning message to stack.
   * @param {string} title
   * @param {string} message
   * @param {MessageOpts} [opts]
   */
  async pushWarning(title, message, opts = {}) {
    return this.#pushMessage('warning', title, message, opts);
  }

  /**
   * Push error to stack.
   * @param {string} title
   * @param {any} error
   * @param {string} [context]
   * @param {MessageOpts} [opts]
   */
  async pushError(title, error, context, opts = {}) {
    const { message, callstack } = cclMessageStack.#parseError(error);
    this.#pushMessage('error', title, message, {
      signal: opts.signal,
      animateIn: opts.animateIn,
      context: context,
      callstack: callstack
    });
  }
}
customElements.define('ccl-message-stack', cclMessageStack);
