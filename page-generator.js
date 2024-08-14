/**
 * Creates an html element with the specified tag and appends it to the parent
 * @param {HTMLElement} parent The parent element
 * @param {String} tagName The name of an element to create
 * @param {String} textContent Optional text content to set on the element
 * @param {String} classList Optional class list to add to the element
 * @returns {HTMLElement} The created element
 */
function createAppendElement(parent, tagName, classList = undefined, textContent = undefined) {
    const elem = document.createElement(tagName);
    if (classList)
        elem.classList.add(classList);
    if (textContent)
        elem.textContent = textContent;
    parent.appendChild(elem);
    return elem;
}

/**
 * Creates an html button element and appends it to the parent
 * @param {HTMLElement} parent The parent element
 * @param {String} textContent Text content to set on the button
 * @param {String} classList Optional class list to add to the button
 * @returns {HTMLElement} The created button
 */
function createAppendButton(parent, textContent, classList = undefined) {
    const btn = createAppendElement(parent, "button", classList, textContent);
    btn.type = "button";
    return btn;
}

/**
 * Creates a custom collapsible html element and appends it to the parent
 * @param {HTMLElement} parent The parent element
 * @param {String} heading Text content for the collapsible heading
 * @returns {HTMLElement} The content div for the created collapsible
 */
function createAppendCollapsible(collapsible, heading) {
    const header = createAppendElement(collapsible, "div", "header");
    const toggle = createAppendButton(header, heading, "toggle");
    const collapse = createAppendElement(collapsible, "div", "collapse");
    const content = createAppendElement(collapse, "div", "content");

    toggle.addEventListener("click", function () {
        this.classList.toggle("active");
        if (collapse.style.maxHeight)
            collapse.style.maxHeight = null;
        else
            collapse.style.maxHeight = collapse.scrollHeight + "px";
    });

    return content;
}

/**
 * Creates an html element with text content from json and appends it to the parent
 * @param {HTMLElement} parent The parent element
 * @param {String} tagName The name of an element to create
 * @param {any} jsonData The json data containing the text content
 * @param {String} jsonId The id of the json element containing the text content
 * @param {String} classList Optional class list to add to the element
 * @returns {HTMLElement} The created element
 */
function createAppendJsonTextElement(parent, tagName, jsonData, jsonId, classList = undefined) {
    // retrieve text content from json data
    const textContent = jsonData[jsonId];
    if (!textContent)
        throw "JSON data does not contain id '" + jsonId + "'";
    if (typeof (textContent) !== "string")
        throw "JSON data at '" + jsonId + "' is not a string";
    return createAppendElement(parent, tagName, classList, textContent);
}

/**
 * Creates an html list element containing a text list from json and appends it to the parent
 * @param {HTMLElement} parent The parent element
 * @param {any} jsonData The json data containing the text list
 * @param {String} jsonId The id of the json element containing the text list
 * @param {String} classList Optional class list to add to the element
 * @returns {HTMLElement} The created list element
 */
function createAppendJsonTextList(parent, jsonData, jsonId, classList = undefined) {
    const jsonList = jsonData[jsonId];
    if (!jsonList)
        throw "JSON data does not contain id '" + jsonId + "'";
    if (!Array.isArray(jsonList))
        throw "JSON data at '" + jsonId + "' is not an array";

    const elem = createAppendElement(parent, "ul", classList);

    jsonList.forEach(function (jsonEntry, index) {
        if (typeof (jsonEntry) !== "string")
            throw "JSON data at '" + jsonId + "[" + index + "]' is not a string";
        createAppendElement(elem, "li", undefined, jsonEntry);
    });

    return elem;
}

/**
 * Creates a custom supplement facts html element and appends it to the parent
 * @param {HTMLElement} parent The parent element
 * @param {any} jsonData The json data containing the supplement facts
 * @param {String} jsonId The id of the json element containing the supplement facts
 * @returns {HTMLElement} The created supplement facts element
 */
export function createAppendJsonSupplementFacts(parent, jsonData, jsonId) {
    const data = jsonData[jsonId];
    if (!data)
        throw "JSON data does not contain id '" + jsonId + "'";

    // add top level outline
    const outline = createAppendElement(parent, "div", "outline");

    // add headers
    createAppendElement(outline, "h1", undefined, "Supplement Facts");
    const svsize = data['serving-size'];
    if (svsize)
        createAppendElement(outline, "h2", undefined, "Serving Size: " + svsize);
    const svper = data['servings-per-container'];
    if (svper)
        createAppendElement(outline, "h2", undefined, "Servings Per Container: " + svper);

    // add ingredients table and headers
    const table = createAppendElement(outline, "table");
    const headerrow = createAppendElement(table, "tr");
    createAppendElement(headerrow, "th", undefined, "Amount Per Serving");
    createAppendElement(headerrow, "th", undefined, "% Daily Value");

    // add nutrients
    const nutrients = data['nutrients'];
    if (nutrients) {
        nutrients.forEach(function (nutrient) {
            const row = createAppendElement(table, "tr");
            const ps = createAppendElement(row, "td");
            createAppendElement(ps, "p", undefined, nutrient['name']);
            createAppendElement(ps, "p", undefined, nutrient['serving']);
            createAppendElement(row, "td", undefined, nutrient['percent-dv']);
        });
    }

    // add supplements
    const supplements = data['supplements'];
    if (supplements) {
        if (nutrients)
            createAppendElement(table, "tr", "separator");
        supplements.forEach(function (supplement) {
            const row = createAppendElement(table, "tr");
            const ps = createAppendElement(row, "td");
            createAppendElement(ps, "p", undefined, supplement['name']);
            createAppendElement(ps, "p", undefined, supplement['serving']);
            createAppendElement(row, "td", undefined, supplement['percent-dv']);
        });
    }

    // add footnotes
    const pdvfootnote = data['show-percent-dv-footnote'];
    const nodvsfootnote = data['show-no-dv-footnote'];
    if (pdvfootnote || nodvsfootnote) {
        const footnote = createAppendElement(outline, "div", "footnotes");
        if (pdvfootnote)
            createAppendElement(footnote, "p", undefined, "* Percent Daily Values based on a 2,000 calorie diet.");
        if (nodvsfootnote)
            createAppendElement(footnote, "p", undefined, "\u2020 Daily Value not established.");
    }

    // add other ingredients
    const otheringreds = data['other-ingredients'];
    if (otheringreds) {
        const footnote = createAppendElement(parent, "div", "footnotes");
        createAppendElement(footnote, "p", undefined, "Other Ingredients: " + otheringreds.join(", "));
    }
}
