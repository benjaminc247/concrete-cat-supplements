import * as Serving from '/common/serving.js';

/**
 * Convert ingredient name to id. Caution this may return an empty string.
 * @param {string} name
 * @returns {string}
 */
function nameToId(name) {
  // lowercase the string and replace any non alpha numeric sequence with a space
  // trim space from start and end of string and all digits from start
  // capitalize the first letter after each space and remove the space
  const simplified = name.toLowerCase().replace(/[^0-9a-z]+/g, ' ').trim();
  const trimmed = simplified.trim().replace(/^[0-9]*/, '');
  const id = trimmed.replace(/ */g, m => m.slice(1).toUpperCase());
  return id;
}

/**
 * Verify that id is a non-empty alpha-numeric string that starts with a lowercase character.
 * @param {string} id
 * @returns {boolean}
 */
function verifyId(id) {
  return typeof id === 'string' && id.match(/^[a-z][0-9A-Za-z]*$/) !== null;
}

/**
 * Convert ingredient id to name.
 * @param {string} id
 * @returns {string}
 */
export function idToName(id) {
  return id.charAt(0).toUpperCase() + id.slice(1).replace(/[A-Z]/g, c => ` ${c}`);
}

/**
 * Parse ingredient list from multiple supported formats
 * The ingredient list param may be:
 * 1. an object where param keys are ingredient names and values may be:
 *   1a. a string serving.
 *   1b. an object with an optional '${servingKey}' param.
 * 2. an array where each element may be:
 *   2a. a string ingredient name.
 *   2b. an object with an 'id' or 'name' param and an optional '${servingKey}' param.
 * The returned value is a normalized ingredient list as a map where:
 *   - keys are ingredient names.
 *   - values are objects with 'name': string and '{$servingKey}': Serving params.
 * In the case of an error parsing an ingredient:
 *   - the '{$servingKey}' param will be set to undefined.
 *   - an 'error' param will be set with the error message.
 * Errors that cannot be contained to a single ingredient will be thrown.
 * @param {object|array} ingrList - ingredient list object or array
 * @param {object} opts
 * @param {string} [opts.servingKey='serving'] - name of the serving key
 * @param {string} [opts.errPrefix='Ingredient'] - prefix for error messages
 * @returns {Map} - the normalized ingredient list
 */
export function parseList(ingrList, { servingKey = 'serving', errPrefix = 'Ingredient' } = {}) {
  // build ingredient map
  // ensure name and serving params exist and are strings
  const ingrMap = new Map();
  if (Array.isArray(ingrList)) {
    for (var ingrIdx = 0; ingrIdx < ingrList.length; ++ingrIdx) {
      const ingrListData = ingrList[ingrIdx];
      const ingrErrPrefix = `${errPrefix} [${ingrIdx}]`;
      if (typeof ingrListData === 'string') {
        // ingredient list array: name string entry
        if (!ingrListData)
          throw `${ingrErrPrefix} must not be an empty string.`;
        const ingrId = nameToId(ingrListData);
        if (!ingrId)
          throw `${ingrErrPrefix} id conversion resulted in empty string.`;
        if (ingrMap.has(ingrId))
          throw `${ingrErrPrefix} has duplicate id '${ingrId}'.`;
        const data = { name: ingrListData };
        data[servingKey] = Serving.parse('');
        ingrMap.set(ingrId, data);
      }
      else if (typeof ingrListData === 'object' && !Array.isArray(ingrListData)) {
        // ingredient list array: data object entry
        // find id and verify name
        var ingrId;
        if (ingrListData.id !== undefined) {
          if (!verifyId(ingrListData.id))
            throw `${ingrErrPrefix} id property must be a camel-case alpha-numeric string.`
          ingrId = ingrListData.id;
          delete ingrListData.id;
        }
        if (ingrListData.name !== undefined) {
          if (typeof ingrListData.name !== 'string' || !ingrListData.name)
            throw `${ingrErrPrefix} name property must be a non-empty string.`;
          if (ingrId === undefined) {
            ingrId = nameToId(ingrListData.name);
            if (!ingrId)
              throw `${ingrErrPrefix} name to id conversion resulted in empty string.`;
          }
        }
        if (ingrId === undefined)
          throw `${ingrErrPrefix} must provide an 'id' or 'name' property.`;
        if (ingrMap.has(ingrId))
          throw `${ingrErrPrefix} has duplicate id '${ingrId}'.`
        // parse serving
        try {
          ingrListData[servingKey] = Serving.parse(ingrListData[servingKey] || '');
        }
        catch (err) {
          ingrListData[servingKey] = undefined;
          ingrListData.error = err;
        }
        // add to map
        ingrMap.set(ingrId, ingrListData);
      }
      else {
        throw `${ingrErrPrefix} must be an object or string.`;
      }
    }
  }
  else if (typeof ingrList === 'object') {
    for (const [ingrId, ingrListData] of Object.entries(ingrList)) {
      if (!ingrId)
        throw `${errPrefix} id must not be an empty string.`;
      if (!verifyId(ingrId))
        throw `${errPrefix} id '${ingrId}' must be a camel-case alpha-numeric string.`
      if (ingrMap.has(ingrId))
        throw `${errPrefix} has duplicate id '${ingrId}'.`
      if (typeof ingrListData === 'string') {
        // ingredient list object: id key, serving string value
        const data = {};
        // parse serving
        try {
          data[servingKey] = Serving.parse(ingrListData);
        }
        catch (err) {
          data[servingKey] = undefined;
          data.error = err;
        }
        // add to map
        ingrMap.set(ingrId, data);
      }
      else if (typeof ingrListData === 'object' && !Array.isArray(ingrListData)) {
        // ingredient list object: id key, data object value
        if (ingrListData.id !== undefined)
          throw `${errPrefix} ${ingrId} data must not specify an id.`;
        // parse serving
        try {
          ingrListData[servingKey] = Serving.parse(ingrListData[servingKey] || '');
        }
        catch (err) {
          ingrListData[servingKey] = undefined;
          ingrListData.error = err;
        }
        // add to map
        ingrMap.set(ingrId, ingrListData);
      }
      else {
        throw `${errPrefix} '${ingrId}' value must be an object or string.`;
      }
    }
  }
  else {
    throw `${errPrefix} list must be an array or object.`;
  }
  return ingrMap;
}