// ccl initialization callback list
let callbacks = [];

/**
 * A callback to initialize ccl elements in the given html dom tree
 * @callback cclElementRegistryCallback
 * @param {HTMLElement} parentElement - The element under which to search for ccl elements
 */
/**
 * Register a callback to initialize ccl elements
 * @param {String} name - friendly name for callback for debugging
 * @param {Number} priority - Sorting priority, lower number to call sooner
 * @param {cclElementRegistryCallback} callback - Callback function
 */
export function registerCallback(name, priority, callback) {
    try {
        // insert before first index with higher priority
        let start = 0, end = callbacks.length - 1;
        while (start <= end) {
            let mid = Math.floor((start + end) / 2);
            if (callbacks[mid].priority <= priority)
                start = mid + 1;
            else
                end = mid - 1;
        }
        // console.log("callback '" + name + "' priority " + priority + " inserted at index " + start);
        callbacks.splice(start, 0, { name: name, priority: priority, callback: callback });
    }
    catch (err) {
        console.log("While registering ccl element callback '" + callback.name + "': " + err);
    }
}

/**
 * Call all registered ccl element initialization callbacks
 * @param {HTMLElement} parentElement - The element under which to search for ccl elements
 */
export function raiseCallbacks(parentElement) {
    for (const callback of callbacks) {
        try {
            // console.log("executing callback '" + callback.name + "'...");
            callback.callback(parentElement);
        }
        catch (err) {
            console.log("While running ccl element callback '" + callback.name + "': " + err);
        }
    }
}