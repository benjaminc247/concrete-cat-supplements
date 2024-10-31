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
   * Async message card html template resource.
   * @type {cclAsyncResource<HTMLTemplateElement>}
   * @readonly
   */
  static #s_cardTemplate = cclAsyncResource.load(
    'HTML',
    async () => {
      const htmlText = await cclUtils.fetchText(
        '/ccl-elements/message-stack.html',
        { timeout: cclMessageStack.#s_dependencyTimeout }
      );
      const templateElem = document.createElement('template');
      templateElem.innerHTML = htmlText;
      const htmlFrag = templateElem.content;

      const cardTemplate = htmlFrag.querySelector('#message-card-template');
      if (!(cardTemplate instanceof HTMLTemplateElement))
        throw 'message stack html must specify a template with id \'message-card-template\'';

      // verify components used in script
      if (!cardTemplate.content.querySelector('#collapse'))
        throw 'message stack card template must contain an element with id \'collapse\'';
      if (!cardTemplate.content.querySelector('#content'))
        throw 'message stack card template must contain an element with id \'content\'';
      if (!cardTemplate.content.querySelector('#close'))
        throw 'message stack card template must contain an element with id \'close\'';
      if (!cardTemplate.content.querySelector('#card'))
        throw 'message stack card template must contain an element with id \'card\'';
      if (!cardTemplate.content.querySelector('#title-text'))
        throw 'message stack card template must contain an element with id \'title-text\'';
      if (!cardTemplate.content.querySelector('#message-text'))
        throw 'message stack card template must contain an element with id \'message-text\'';

      return cardTemplate;
    }
  );

  /**
   * Async css stylesheet resource.
   * @type {cclAsyncResource<CSSStyleSheet>}
   * @readonly
   */
  static #s_styleSheet = cclAsyncResource.load(
    'Style',
    async () => {
      const cssText = await cclUtils.fetchText(
        '/ccl-elements/message-stack.css',
        { timeout: cclMessageStack.#s_dependencyTimeout }
      );
      return await new CSSStyleSheet().replace(cssText);
    }
  );

  /**
   * Add message to stack with style.
   * @param {string} style
   * @param {string} titleText
   * @param {string} messageText
   * @param {MessageInit} init
   */
  async #message(style, titleText, messageText, { signal, animateIn }) {
    // TODO: exceptions aren't handled right now

    // create shadow node
    const node = document.createElement('div');
    const shadow = node.attachShadow({ mode: 'open' });

    // instantiate card template
    const cardTemplate = await cclMessageStack.#s_cardTemplate.promise(signal);
    const cardFrag = document.importNode(cardTemplate.content, true);

    // set up content
    cardFrag.querySelector('#card').classList.add(style);
    cardFrag.querySelector('#title-text').textContent = titleText;
    cardFrag.querySelector('#message-text').textContent = messageText;

    // collapse elements
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

    // apply stylesheet
    const styleSheet = await cclMessageStack.#s_styleSheet.promise(signal);
    shadow.adoptedStyleSheets.push(styleSheet);

    // append to end of dom
    shadow.appendChild(cardFrag);
    this.appendChild(node);
  }

  /**
   * @typedef MessageInit
   * @property {AbortSignal} [signal]
   * @property {boolean} [animateIn]
   */

  /**
   * Add success message to stack.
   * @param {string} titleText
   * @param {string} messageText
   * @param {MessageInit} [init]
   */
  async success(titleText, messageText, init = {}) {
    return this.#message('success', titleText, messageText, init);
  }

  /**
   * Add info message to stack.
   * @param {string} titleText
   * @param {string} messageText
   * @param {MessageInit} [init]
   */
  async info(titleText, messageText, init = {}) {
    return this.#message('info', titleText, messageText, init);
  }

  /**
   * Add warning message to stack.
   * @param {string} titleText
   * @param {string} messageText
   * @param {MessageInit} [init]
   */
  async warning(titleText, messageText, init = {}) {
    return this.#message('warning', titleText, messageText, init);
  }

  /**
   * Add error message to stack.
   * @param {string} titleText
   * @param {string} messageText
   * @param {MessageInit} [init]
   */
  async error(titleText, messageText, init = {}) {
    return this.#message('error', titleText, messageText, init);
  }
}
customElements.define('ccl-message-stack', cclMessageStack);
