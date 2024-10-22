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