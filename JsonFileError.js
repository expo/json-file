'use strict';

/**
 * Note that instances of this class do NOT pass `instanceof JsonFileError`.
 */
module.exports = class JsonFileError extends Error {
  constructor(message, cause) {
    let fullMessage = cause ?
      `${message}\n└─ Cause: ${cause.type}: ${cause.message}` :
      message;
    super(fullMessage);
    this.name = this.constructor.name;
    this.isJsonFileError = true;
  }
}
