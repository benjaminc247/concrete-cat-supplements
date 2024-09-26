/**
 * Async fetch text data from file, throw error if response is not ok.
 * @param {string} fileName - name of data file to fetch
 */
export async function fetchText(fileName, { timeout = 30000 } = {}) {
  const response = await fetch(fileName, { signal: AbortSignal.timeout(timeout) });
  if (!response.ok)
    throw `${response.status} ${response.statusText}`;
  return response.text();
}

/**
 * Async fetch json data from file, throw error if response is not ok.
 * @param {string} fileName - name of data file to fetch
 */
export async function fetchJson(fileName, { timeout = 30000 } = {}) {
  const response = await fetch(fileName, { signal: AbortSignal.timeout(timeout) });
  if (!response.ok)
    throw `${response.status} ${response.statusText}`;
  return response.json();
}

/**
 * Join regex parts into single regex.
 * @param {...RegExp} parts - regex parts to combine
 */
export function joinRegex(...parts) {
  return new RegExp(parts.map(part => part.source).join(''));
}