/**
 * Class representing an async loaded resource that can be awaited any number of times.
 * @template ResourceType
 */
export default class AsyncResource {
  /**
   * Name of resource for debugging and error messages.
   * @type {string}
   */
  #_name;

  /**
   * Error thrown from load callback.
   * @type {Error}
   */
  #_error;

  /**
   * Promise that resolves to return value of load function when complete.
   * If load function throws:
   *   the exception is saved in the error property.
   *   this promise resolves with an undefined value.
   * This promise never rejects as rejections are only returned from promises one time.
   * @type {Promise<ResourceType|undefined>}
   */
  #_promise;

  /**
   * Callback for async resource load function returning a resource promise.
   * @callback LoadFn
   * @returns {Promise<ResourceType>}
   */

  /**
   * Construct and load an async resource.
   * @param {string} name - name of the resource for debugging and error messages.
   * @param {LoadFn} loadFn - load function returning the resource promise.
   * @returns {AsyncResource}
   */
  static load(name, loadFn) {
    const resource = new AsyncResource();
    resource.#_name = name;
    resource.#_error = undefined;
    resource.#_promise = new Promise((resolve) => {
      (async () => {
        try {
          // try to resolve the load function
          resolve(await loadFn());
        }
        catch (err) {
          // save error for promise accessor, and ensure it looks like an error
          // do not reject this promise, error property will be checked for failure
          resource.#_error = (err && err.stack && err.message) ? err : new Error(err);
          resolve(undefined);
        }
      })();
    });
    return resource;
  }

  /**
   * Get a new resource promise.
   * Resolves with return value from load function when successful.
   * Rejects with error thrown from load function.
   * @param {AbortSignal} abortSignal - used to abort the resource promise.
   * @returns {Promise<ResourceType>}
   */
  promise(abortSignal) {
    // return a new promise that awaits the internal promise and checks error property for failure
    // abort signal aborts this promise not the static load
    return new Promise((resolve, reject) => {
      (async () => {
        // check abort before call and listen for abort during await
        if (abortSignal.aborted)
          return reject(`${this.#_name} promise early abort: ${abortSignal.reason}`);
        const onAbort = () => {
          abortSignal.removeEventListener('abort', onAbort);
          return reject(`${this.#_name} promise aborted: ${abortSignal.reason}`);
        }
        abortSignal.addEventListener('abort', onAbort);
        // internal promise never rejects it sets error instead
        // saving error allows this promise to reject every time
        const result = await this.#_promise;
        abortSignal.removeEventListener('abort', onAbort);
        if (this.#_error)
          return reject(`${this.#_name} promise error: ${this.#_error}`);
        return resolve(result);
      })();
    });
  }
}
