/**
 * functions to register and raise callbacks to set up ccl elements from html
 */
let handlers = [];
export function registerHandler(handler) {
    try {
        handlers.push(handler);
    }
    catch (err) {
        console.log("While registering ccl custom element handler: " + err);
    }
}
export function raiseHandlers(rootNode) {
    for (const handler of handlers) {
        try {
            handler(rootNode);
        }
        catch(err) {
            console.log("While running ccl custom element handler: " + err);
        }
    }
}