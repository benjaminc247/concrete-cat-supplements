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
   * @type {{message: any}}
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
   * Construct and load an async resource.
   * @template ResourceType
   * @param {string} name - name of the resource for debugging and error messages.
   * @param {{():Promise<ResourceType>}} loadFn - load function returning the resource promise.
   * @returns {AsyncResource<ResourceType>}
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
          resource.#_error = (err && err.message) ? err : new Error(err);
          resolve();
        }
      })();
    });
    return resource;
  }

  /**
   * Get a new resource promise.
   * Resolves with return value from load function when successful.
   * Rejects with error thrown from load function.
   * @param {AbortSignal|null} signal
   * @returns {Promise<ResourceType>}
   */
  promise(signal) {
    // return a new promise that awaits the internal promise and checks error property for failure
    // abort signal aborts this promise not the static load
    return new Promise((resolve, reject) => {
      (async () => {
        // check abort before call and listen for abort during await
        const onAbort = () => {
          signal.removeEventListener('abort', onAbort);
          return reject(`${this.#_name} promise aborted: ${signal.reason}`);
        }
        if (signal) {
          if (signal.aborted)
            return reject(`${this.#_name} promise early abort: ${signal.reason}`);
          signal.addEventListener('abort', onAbort);
        }
        // internal promise never rejects it sets error instead
        // saving error allows this promise to reject every time
        const result = await this.#_promise;
        if (signal)
          signal.removeEventListener('abort', onAbort);
        if (this.#_error)
          return reject(`${this.#_name} promise error: ${this.#_error}`);
        return resolve(result);
      })();
    });
  }
}