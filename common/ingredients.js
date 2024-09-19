import * as Serving from '/common/serving.js';

/**
 * Build ingredient data from optional parameters.
 * If data is provided it will be used to initialize the map entry.
 * If serving is not provided it will be looked up in data or defaulted.
 * Added ingredient is guaranteed to contain a name and serving property.
 * In case of non-fatal error the 'error' property will be set on the ingredient.
 * @param {string} [ingrId] - ingredient id, must be a unique non-empty string
 * @param {object} [ingrData = {}] - extended ingredient data
 * @param {string} [servingStr = undefined] - serving value, look up from data if not provided
 * @param {object} servingKey - name of serving parameter in ingredient data
 * @param {string} errPrefix - prefix for error messages
 * @return {object} - ingredient data
 */
function parseIngredient({
  ingrId,
  ingrData = {},
  servingStr = undefined,
  servingKey,
  errPrefix
}) {
  // if name property was not provided use id
  if (!ingrData.hasOwnProperty('name'))
    ingrData.name = ingrId;
  if (typeof ingrData.name !== 'string')
    throw `${errPrefix} '${ingrId}' property 'name' not set or is not a string.`;

  // if serving string was not provided use serving key property or default to empty
  if (servingStr === undefined) {
    servingStr = ingrData[servingKey] ?? '';
    if (typeof servingStr !== 'string')
      throw `${errPrefix} ${ingrId} '${servingKey}' property is not a string.`;
  }

  // parse serving string
  try {
    ingrData[servingKey] = Serving.parse(servingStr);
  }
  catch (err) {
    ingrData[servingKey] = undefined;
    ingrData.error = `${servingKey} ${err}`;
  }

  // return data
  return ingrData;
}

/**
 * Parse ingredient list from multiple supported formats
 * The ingredient list param may be:
 * 1. an object where param keys are ingredient names and values may be:
 *   1a. a string serving.
 *   1b. an object with an optional '${servingKey}' param.
 * 2. an array where each element may be:
 *   2a. a string ingredient name.
 *   2b. an object with a 'name' param and an optional '${servingKey}' param.
 * The returned value is a normalized ingredient list as a map where:
 *   - keys are ingredient names.
 *   - values are objects with 'name': string and '{$servingKey}': Serving params.
 * In the case of an error parsing an ingredient:
 *   - the '{$servingKey}' param will be set to undefined.
 *   - an 'error' param will be set with the error message.
 * Errors that cannot be contained to a single ingredient will be thrown.
 * @param {object|array} ingrList - ingredient list object or array
 * @param {string} [servingKey='serving'] - name of the serving key
 * @param {string} [errPrefix='Ingredient'] - prefix for error messages
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
        // ingredient list array: id string entry
        const ingrId = ingrListData;
        if (!ingrId)
          throw `${ingrErrPrefix} must not be an empty string.`;
        if (ingrMap.has(ingrId))
          throw `${ingrErrPrefix} has duplicate id '${ingrId}'.`
        ingrMap.set(ingrId, parseIngredient({
          ingrId: ingrId,
          servingKey: servingKey,
          errPrefix: ingrErrPrefix
        }));
      }
      else if (typeof ingrListData === 'object' && !Array.isArray(ingrListData)) {
        // ingredient list array: data object entry
        // if id was not provided attempt to use name property
        const ingrId = ingrListData.name;
        if (typeof ingrId !== 'string' || !ingrId)
          throw `${ingrErrPrefix} property 'name' not set or is not a string.`;
        if (ingrMap.has(ingrId))
          throw `${ingrErrPrefix} has duplicate id '${ingrId}'.`
        ingrMap.set(ingrId, parseIngredient({
          ingrId: ingrId,
          ingrData: ingrListData,
          servingKey: servingKey,
          errPrefix: ingrErrPrefix
        }));
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
      if (ingrMap.has(ingrId))
        throw `${errPrefix} has duplicate id '${ingrId}'.`
      if (typeof ingrListData === 'string') {
        // ingredient list object: id key, serving string value
        ingrMap.set(ingrId, parseIngredient({
          ingrId: ingrId,
          servingStr: ingrListData,
          servingKey: servingKey,
          errPrefix: errPrefix
        }));
      }
      else if (typeof ingrListData === 'object' && !Array.isArray(ingrListData)) {
        // ingredient list object: id key, data object value
        const foo = parseIngredient({
          ingrId: ingrId,
          ingrData: ingrListData,
          servingKey: servingKey,
          errPrefix: errPrefix
        });
        ingrMap.set(ingrId, foo);
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