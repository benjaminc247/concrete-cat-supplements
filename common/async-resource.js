import * as cclUtils from '/common/utils.js'

/**
 *Async loaded resource that can be awaited any number of times.
 * @template ResourceT
 */
export default class AsyncResource {
  /**  @type {string|null} */
  #_context;

  /** @type {Array<{error: any, context: string|null}>} */
  #_errors;

  /**
   * @callback ErrorHandler
   * @param {any} error
   * @param {string|null} context
   */
  /** @type {Set<ErrorHandler>} */
  #_errorHandlers;

  /**
   * Promise that resolves to return value of load function when complete.
   * If load function throws:
   *   the exception is pushed to the error list.
   *   this promise resolves with a null value.
   * @type {Promise<ResourceT|null>}
   */
  #_promise;

  /**
   * User callback to set error context.
   * @param {string} context
   */
  #setContext(context) {
    this.#_context = context;
  }

  /**
   * User callback to push an error.
   * @param {any} error
   */
  #pushError(error) {
    this.#_errors.push({ error: error, context: this.#_context });
    for (const handler of this.#_errorHandlers)
      handler(error, this.#_context);
  }

  /**
   * Add an error handler that will be called with all current and future errors.
   * @param {ErrorHandler} handler
   */
  addErrorHandler(handler) {
    for (const { error, context } of this.#_errors)
      handler(error, context);
    this.#_errorHandlers.add(handler);
  }

  /**
   * Remove an error handler.
   * @param {ErrorHandler} handler
   */
  removeErrorHandler(handler) {
    this.#_errorHandlers.delete(handler);
  }

  /**
   * User load function.
   * @template ResourceT
   * @callback LoadFn
   * @param {(context: string) => void} [setContext]
   * @param {(error: any) => void} [pushError]
   * @returns {Promise<ResourceT>}
   */
  /**
   * Construct and load an async resource.
   * @template ResourceT
   * @param {LoadFn<ResourceT>} loadFn - load function returning the resource promise
   * @param {ErrorHandler} [errorHandler] - handler to be called on resource errors
   * @returns {AsyncResource<ResourceT>}
   */
  static load(loadFn, errorHandler) {
    const resource = new AsyncResource();
    resource.#_context = null;
    resource.#_errors = new Array();
    resource.#_errorHandlers = new Set();
    if (errorHandler)
      resource.#_errorHandlers.add(errorHandler);
    resource.#_promise = (async () => {
      try {
        return await loadFn(
          (context) => resource.#setContext(context),
          (error) => resource.#pushError(error)
        );
      }
      catch (err) {
        resource.#pushError(err);
        return null;
      }
    })();
    return resource;
  }

  /**
   * Get a new resource promise.
   * Resolves with return value from load function, or null in case of error or abort.
   * Use 'throwErrors' flag to throw on abort or error rather than resolving with null.
   * @param {AbortSignal} [signal]
   * @param {boolean} [throwErrors]
   * @returns {Promise<ResourceT|null>}
   * @throws {AbortError} - if throwErrors is true
   * @throws {Array<{error: any, context: string|null}>} - if throwErrors is true
   */
  async promise(signal, throwErrors) {
    return new Promise(async (resolve, reject) => {
      const onAbort = () => {
        signal.removeEventListener('abort', onAbort);
        throwErrors ? reject(signal.reason) : resolve(null);
      }
      if (signal) {
        if (signal.aborted) {
          throwErrors ? reject(signal.reason) : resolve(null);
          return;
        }
        signal.addEventListener('abort', onAbort);
      }
      const res = await this.#_promise;
      if (signal)
        signal.removeEventListener('abort', onAbort);
      if (this.#_errors.length) {
        throwErrors ? reject(this.#_errors) : resolve(null);
        return;
      }
      resolve(res);
    });
  }
}
