// ccl initialization callback list
let callbacks = [];

/**
 * A callback to initialize ccl elements in a given html element
 * @callback cclElementRegistryCallback
 * @param {HTMLElement} parentElement - The element under which to search for ccl elements
 */
/**
 * Register a callback to initialize ccl elements
 * @param {cclElementRegistryCallback} callback - The callback to initialize ccl elements
 */
export function registerCallback(callback) {
    try {
        callbacks.push(callback);
    }
    catch (err) {
        console.log("While registering ccl element callback: " + err);
    }
}

/**
 * Call all registered ccl element initialization callbacks
 * @param {HTMLElement} parentElement - The element under which to search for ccl elements
 */
export function raiseCallbacks(parentElement) {
    for (const callback of callbacks) {
        try {
            callback(parentElement);
        }
        catch(err) {
            console.log("While running ccl element callback: " + err);
        }
    }
}