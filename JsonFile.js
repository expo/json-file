'use strict';

const fsp = require('mz/fs');
const _ = require('lodash');
const path = require('path');
const util = require('util');
const JSON5 = require('json5');
const writeFileAtomic = require('write-file-atomic');
const lockFile = require('lockfile');
const promisify = require('util.promisify');
const JsonFileError = require('./JsonFileError');

const lockAsync = promisify(lockFile.lock);

const DEFAULT_OPTIONS = {
  badJsonDefault: undefined,
  cantReadFileDefault: undefined,
  default: undefined,
  json5: false,
  space: 2,
};

// A promisified writeFileAtomic
const writeFileAtomicAsync = (file, data) =>
  new Promise((resolve, reject) => {
    writeFileAtomic(file, data, err => {
      if (err) reject(err);
      else resolve();
    });
  });

const callWithLock = async (file, fn) => {
  let result;
  const lockFileName = file + '.lock';
  // These options are fairly arbitrary
  await lockAsync(lockFileName, {
    wait: 5000,
    retries: 500,
    pollPeriod: 50,
    retryWait: 50,
  });
  try {
    result = await fn();
  } finally {
    lockFile.unlockSync(lockFileName);
  }
  return result;
};

class JsonFile {
  constructor(file, options) {
    this.file = file;
    this.options = options;
  }

  readAsync(options) {
    return callWithLock(this.file, () =>
      readAsync(this.file, this._getOptions(options))
    );
  }

  writeAsync(object, options) {
    return callWithLock(this.file, () =>
      writeAsync(this.file, object, this._getOptions(options))
    );
  }

  getAsync(key, defaultValue, options) {
    return callWithLock(this.file, () =>
      getAsync(this.file, key, defaultValue, this._getOptions(options))
    );
  }

  setAsync(key, value, options) {
    return callWithLock(this.file, () =>
      setAsync(this.file, key, value, this._getOptions(options))
    );
  }

  updateAsync(key, value, options) {
    return callWithLock(this.file, () =>
      updateAsync(this.file, key, value, this._getOptions(options))
    );
  }

  mergeAsync(sources, options) {
    return callWithLock(this.file, () =>
      mergeAsync(this.file, sources, this._getOptions(options))
    );
  }

  deleteKeyAsync(key, options) {
    return callWithLock(this.file, () =>
      deleteKeyAsync(this.file, key, this._getOptions(options))
    );
  }

  deleteKeysAsync(keys, options) {
    return callWithLock(this.file, () =>
      deleteKeysAsync(this.file, keys, this._getOptions(options))
    );
  }

  rewriteAsync(options) {
    return callWithLock(this.file, () =>
      rewriteAsync(this.file, this._getOptions(options))
    );
  }

  _getOptions(options) {
    return Object.assign({}, this.options, options);
  }
}

function readAsync(file, options) {
  var json5 = _getOption(options, 'json5');
  return fsp.readFile(file, 'utf8').then(
    json => {
      try {
        if (json5) {
          return JSON5.parse(json);
        } else {
          return JSON.parse(json);
        }
      } catch (e) {
        let defaultValue = jsonParseErrorDefault(options);
        if (defaultValue === undefined) {
          throw new JsonFileError(`Error parsing JSON file: ${file}`, e);
        } else {
          return defaultValue;
        }
      }
    },
    error => {
      let defaultValue = cantReadFileDefault(options);
      if (defaultValue === undefined) {
        throw new JsonFileError(`Can't read JSON file: ${file}`, error);
      } else {
        return defaultValue;
      }
    }
  );
}

function getAsync(file, key, defaultValue, options) {
  return readAsync(file, options).then(object => {
    if (defaultValue === undefined && !_.has(object, key)) {
      throw new JsonFileError(
        `No value at key path "${key}" in JSON object from: ${file}`
      );
    }
    return _.get(object, key, defaultValue);
  });
}

function writeAsync(file, object, options) {
  var space = _getOption(options, 'space');
  var json5 = _getOption(options, 'json5');
  try {
    var json;
    if (json5) {
      json = JSON5.stringify(object, null, space);
    } else {
      json = JSON.stringify(object, null, space);
    }
  } catch (e) {
    throw new JsonFileError(
      `Couldn't JSON.stringify object for file: ${file}`,
      e
    );
  }
  return writeFileAtomicAsync(file, json).then(() => object);
}

function setAsync(file, key, value, options) {
  // TODO: Consider implementing some kind of locking mechanism, but
  // it's not critical for our use case, so we'll leave it out for now
  return readAsync(file, options).then(object => {
    object = _.set(object, key, value);
    return writeAsync(file, object, options);
  });
}

let updateAsync = util.deprecate(setAsync);

function mergeAsync(file, sources, options) {
  return readAsync(file, options).then(object => {
    Object.assign(object, sources);
    return writeAsync(file, object, options);
  });
}

function deleteKeyAsync(file, key, options) {
  return deleteKeysAsync(file, [key], options);
}

function deleteKeysAsync(file, keys, options) {
  return readAsync(file, options).then(object => {
    let didDelete = false;

    for (let i = 0; i < keys.length; i++) {
      let key = keys[i];
      if (object.hasOwnProperty(key)) {
        delete object[key];
        didDelete = true;
      }
    }

    if (didDelete) {
      return writeAsync(file, object, options);
    }
  });
}

function rewriteAsync(file, options) {
  return readAsync(file, options).then(object => {
    return writeAsync(file, object, options);
  });
}

function jsonParseErrorDefault(options) {
  options = options || {};
  if (options.jsonParseErrorDefault === undefined) {
    return options.default;
  } else {
    return options.jsonParseErrorDefault;
  }
}

function cantReadFileDefault(options) {
  options = options || {};
  if (options.cantReadFileDefault === undefined) {
    return options.default;
  } else {
    return options.cantReadFileDefault;
  }
}

function _getOption(options, field) {
  if (options) {
    if (options[field] !== undefined) {
      return options[field];
    }
  }
  return DEFAULT_OPTIONS[field];
}

const fns = {
  readAsync,
  writeAsync,
  getAsync,
  setAsync,
  updateAsync,
  mergeAsync,
  deleteKeyAsync,
  deleteKeysAsync,
  rewriteAsync,
};

const lockedFns = _.mapValues(fns, fn => (file, ...args) =>
  callWithLock(file, () => fn(file, ...args))
);

Object.assign(JsonFile, lockedFns);

module.exports = JsonFile;
