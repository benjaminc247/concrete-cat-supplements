/**
 * Async fetch text data from file, throw error if response is not ok.
 * @param {string} fileName - name of data file to fetch
 * @param {Object} [opts] - destructured options param
 * @param {AbortSignal} [opts.signal] - abort signal object
 * @param {number} [opts.timeout] - fetch timeout in ms
 * @returns {Promise<string>} - promise to fetch text from file
 */
export async function fetchText(fileName, { signal = undefined, timeout = 30000 } = {}) {
  const timeoutSignal = AbortSignal.timeout(timeout);
  const fetchSignal = signal ? AbortSignal.any([timeoutSignal, signal]) : timeoutSignal;
  const response = await fetch(fileName, { signal: fetchSignal });
  if (!response.ok)
    throw new Error(`${response.status} ${response.statusText}`);
  return response.text();
}

/**
 * Async fetch json data from file, throw error if response is not ok.
 * @param {string} fileName - name of data file to fetch
 * @param {Object} [opts] - destructured options param
 * @param {AbortSignal} [opts.signal] - abort signal object
 * @param {number} [opts.timeout] - fetch timeout in ms
 * @returns {Promise<Object>} - promise to fetch json object from file
 */
export async function fetchJson(fileName, { signal = undefined, timeout = 30000 } = {}) {
  const timeoutSignal = AbortSignal.timeout(timeout);
  const fetchSignal = signal ? AbortSignal.any([timeoutSignal, signal]) : timeoutSignal;
  const response = await fetch(fileName, { signal: fetchSignal });
  if (!response.ok)
    throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

/**
 * Join regex parts into single regex.
 * @param {...RegExp} parts - regex parts to combine
 */
export function joinRegex(...parts) {
  return new RegExp(parts.map(part => part.source).join(''));
}

/**
 * Parse error from exception.
 * @param {any} except
 * @returns {{name: string; message: string; callstack: string[]|null}}
 */
export function parseExcept(except) {
  if (!except.message) {
    return {
      name: 'Error',
      message: except.toString(),
      callstack: null
    };
  }
  const name = except.name ?? 'Error';
  if (!except.stack) {
    return {
      name: name,
      message: except.message,
      callstack: null
    }
  }
  const callstack = except.stack
    .split(/$/gm)
    .slice(1)
    .map((/** @type {string} */ str) => str.trim())
    .map((/** @type {string} */ str) => str.replace(`${window.location.origin}/`, '/'));
  return {
    name: name,
    message: except.message,
    callstack: callstack.length ? callstack : null
  }
}

/**
 * Create string from parsed error.
 * @param {{name: string; message: string; callstack: string[]}} err
 * @param {string} [context]
 * @returns {string}
 */
export function errorStr({ name, message, callstack }, context) {
  const stackStr = callstack ? ' - ' + callstack.join(' ') : '';
  return `${name}${context ? ' ' + context : ''}: ${message}${stackStr}`
}

/**
 * Create string from exception.
 * @param {any} except
 * @param {string} context
 * @returns {string}
 */
export function exceptStr(except, context) {
  return errorStr(parseExcept(except), context);
}
