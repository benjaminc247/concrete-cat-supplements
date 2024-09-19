/**
 * Join regex parts into single regex.
 * @param {...RegExp} parts - regex parts to combine
 */
export function joinRegex(...parts) {
  return new RegExp(parts.map(part => part.source).join(''));
}