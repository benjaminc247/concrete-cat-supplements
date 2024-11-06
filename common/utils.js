/**
 * Http error from network request.
 */
export class HttpError extends Error {
  constructor(/** @type {number} */ statusCode, /** @type {string} */ statusText) {
    super(`${statusCode} ${statusText}`);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.statusText = statusText;
  }
}

/**
 * Missing required elements during validation.
 */
export class ElementsRequiredError extends Error {
  constructor(/** @type {string|string[]} */ selectors, /** @type {string?} */ parentId) {
    if (!Array.isArray(selectors))
      selectors = [selectors];
    super(
      (parentId ? `'${parentId}' m` : 'M') +
      'issing required element' +
      (selectors.length > 1 ? 's: ' : ' ') +
      selectors.map((s) => `'${s}'`).join(', ')
    );
    this.name = 'ElementsRequiredError';
    this.parentId = parentId;
    this.selectors = selectors;
  }
}

/**
 * Async fetch text data from file.
 * @param {string} fileName - name of data file to fetch
 * @param {Object} [opts] - destructured options param
 * @param {AbortSignal} [opts.signal] - abort signal object
 * @param {number} [opts.timeout] - fetch timeout in ms
 * @returns {Promise<string>} - promise to fetch text from file
 * @throws {AbortError} - abort signalled
 * @throws {TimeoutError} - timeout expired
 * @throws {TypeError} - invalid request or network error
 * @throws {HttpError} - response not ok
 */
export async function fetchText(fileName, { signal = undefined, timeout = 30000 } = {}) {
  const timeoutSignal = AbortSignal.timeout(timeout);
  const fetchSignal = signal ? AbortSignal.any([timeoutSignal, signal]) : timeoutSignal;
  const response = await fetch(fileName, { signal: fetchSignal });
  if (!response.ok)
    throw new HttpError(response.status, response.statusText);
  return response.text();
}

/**
 * Async fetch json data from file.
 * @param {string} fileName - name of data file to fetch
 * @param {Object} [opts] - destructured options param
 * @param {AbortSignal} [opts.signal] - abort signal object
 * @param {number} [opts.timeout] - fetch timeout in ms
 * @returns {Promise<Object>} - promise to fetch json object from file
 * @throws {AbortError} - abort signalled
 * @throws {TimeoutError} - timeout expired
 * @throws {TypeError} - invalid request, network error, or decoding error
 * @throws {HttpError} - response not ok
 * @throws {SyntaxError} - body could not be parsed as json
 */
export async function fetchJson(fileName, { signal = undefined, timeout = 30000 } = {}) {
  const timeoutSignal = AbortSignal.timeout(timeout);
  const fetchSignal = signal ? AbortSignal.any([timeoutSignal, signal]) : timeoutSignal;
  const response = await fetch(fileName, { signal: fetchSignal });
  if (!response.ok)
    throw new HttpError(response.status, response.statusText);
  return response.json();
}

/**
 * Async fetch html data from file.
 * @param {string} fileName - name of data file to fetch
 * @param {Object} [opts] - destructured options param
 * @param {AbortSignal} [opts.signal] - abort signal object
 * @param {number} [opts.timeout] - fetch timeout in ms
 * @returns {Promise<HTMLTemplateElement>} - promise to fetch html from file
 * @throws {AbortError} - abort signalled
 * @throws {TimeoutError} - timeout expired
 * @throws {TypeError} - invalid request or network error
 * @throws {HttpError} - response not ok
 * @throws {SyntaxError} - body could not be parsed as html
 */
export async function fetchHtml(fileName, { signal = undefined, timeout = 30000 } = {}) {
  const timeoutSignal = AbortSignal.timeout(timeout);
  const fetchSignal = signal ? AbortSignal.any([timeoutSignal, signal]) : timeoutSignal;
  const response = await fetch(fileName, { signal: fetchSignal });
  if (!response.ok)
    throw new HttpError(response.status, response.statusText);
  const responseText = await response.text();
  const htmlTemplate = document.createElement('template');
  htmlTemplate.innerHTML = responseText;
  return htmlTemplate;
}

/**
 * Async fetch css data from file.
 * @param {string} fileName - name of data file to fetch
 * @param {Object} [opts] - destructured options param
 * @param {AbortSignal} [opts.signal] - abort signal object
 * @param {number} [opts.timeout] - fetch timeout in ms
 * @returns {Promise<CSSStyleSheet>} - promise to fetch css from file
 * @throws {AbortError} - abort signalled
 * @throws {TimeoutError} - timeout expired
 * @throws {TypeError} - invalid request or network error
 * @throws {HttpError} - response not ok
 */
export async function fetchCss(fileName, { signal = undefined, timeout = 30000 } = {}) {
  const timeoutSignal = AbortSignal.timeout(timeout);
  const fetchSignal = signal ? AbortSignal.any([timeoutSignal, signal]) : timeoutSignal;
  const response = await fetch(fileName, { signal: fetchSignal });
  if (!response.ok)
    throw new HttpError(response.status, response.statusText);
  const responseText = await response.text();
  return await new CSSStyleSheet().replace(responseText);
}

/**
 * Join regex parts into single regex.
 * @param {...RegExp} parts - regex parts to combine
 * @throws {SyntaxError} - pattern cannot be parsed or flags are invalid
 */
export function joinRegex(...parts) {
  return new RegExp(parts.map(part => part.source).join(''));
}

/**
 * Convert string to sentence case.
 * @param {string} str
 * @returns {string}
 */
export function toSentenceCase(str) {
  const norm = str.trim().toLowerCase();
  return norm.charAt(0).toUpperCase() + norm.slice(1);
}