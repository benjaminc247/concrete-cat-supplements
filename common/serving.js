import * as Utils from '/common/utils.js';

class Units {
  #units;
  #equiv;

  // params must be undefined or one of the objects below
  // equiv must be undefined if units is undefined
  constructor(units, equiv) {
    this.#units = units;
    this.#equiv = equiv;
  }

  // units and equiv are both either undefined or an object from below
  toString() {
    return [this.#units, this.#equiv].filter(Boolean).join(' ');
  }

  // internal equivalence test
  static isEqual(lhs, rhs) {
    return (lhs.units === rhs.units) && (lhs.equiv === rhs.equiv);
  }
}

class Serving {
  #value;
  #units;

  // value may be undefined
  // units must always be an instance of Units
  constructor(value, units) {
    this.#value = value;
    this.#units = units;
  }

  // value must be converted to string in case of '0'
  // units must be converted to string to see if it is empty
  toString() {
    return [this.#value?.toString(), this.#units.toString()].filter(Boolean).join(' ');
  }

  // returned value may be undefined
  get value() {
    return this.#value;
  }

  // returned units will not be undefined
  get units() {
    return this.#units;
  }
}

const g = Object.freeze({
  toString: () => 'g',
  gramRatio: () => 1
});
const mg = Object.freeze({
  toString: () => 'mg',
  gramRatio: () => 1 / 1000
});
const mcg = Object.freeze({
  toString: () => 'mcg',
  gramRatio: () => 1 / 1000000
});

const ne = Object.freeze({
  toString: () => 'NE'
});
const dfe = Object.freeze({
  toString: () => 'DFE'
});
const rae = Object.freeze({
  toString: () => 'RAE'
});

/**
 * Parse serving from string
 * @param {string} str
 */
export function parse(str) {
  // validate arguments
  if (typeof str !== 'string')
    throw `'${str}' is not a string`

  // regex parse
  // any or all parts may be empty, but equiv may only have a value if units has a value
  const match = str.match(Utils.joinRegex(
    // start of string, skip whitespace
    /^\s*/,
    // value:
    // any number of digits or digits with thousand place comma separators
    // with optional decimal point followed by one or more digits
    // this can match nothing
    /(?<value>(?:\d*|\d{1,3}(?:,\d{3})*)(?:\.\d+)?)/,
    // whitespace then units
    /\s*(?<units>[A-Za-z]*)/,
    // whitespace then equiv
    // non empty equiv requires two strings separated by whitespace
    /\s*(?<equiv>[A-Za-z]*)/,
    // skip whitespace, end of string
    /\s*$/
  ));
  if (!match)
    throw `'${str}' failed to parse into value and units`;
  const parts = match.groups;

  // convert value
  const value = parts.value !== '' ? Number(parts.value.replace(',', '')) : undefined;

  // convert units
  const units = parts.units !== '' ? (() => {
    switch (parts.units.toLowerCase()) {
      case 'g': return g;
      case 'mg': return mg;
      case 'mcg': return mcg;
      default:
        throw `'${str}' parsed units '${parts.units}' not known`;
    }
  })() : undefined;

  // convert equivalents
  const equiv = parts.equiv !== '' ? (() => {
    switch (parts.equiv.toLowerCase()) {
      case 'ne': return ne;
      case 'dfe': return dfe;
      case 'rae': return rae;
      default:
        throw `'${str}' parsed units '${parts.units} ${parts.equiv}' not known`;
    }
  })() : undefined;

  // construct serving
  return new Serving(value, new Units(units, equiv));
}

/**
 * Check if units match
 * @param {Serving|Units} lhs
 * @param {Serving|Units} rhs
 * @return {boolean}
 */
export function unitsMatch(lhs, rhs) {
  return Units.isEqual(
    lhs instanceof Serving ? lhs.units : lhs,
    rhs instanceof Serving ? rhs.units : rhs
  );
}