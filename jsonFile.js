'use strict';

require('instapromise');

let fs = require('fs');
let _ = require('lodash');

let JsonFileError = require('./JsonFileError');

const DEFAULT_OPTIONS = {
  space: 2,
  default: undefined,
  badJsonDefault: undefined,
  cantReadFileDefault: undefined,
};

class JsonFile {
  constructor(file, options) {
    this.file = file;
    this.options = options;
  }

  readAsync(options) {
    return readAsync(this.file, this._getOptions(options));
  }

  writeAsync(object, options) {
    return writeAsync(this.file, object, this._getOptions(options));
  }

  getAsync(key, defaultValue, options) {
    return getAsync(this.file, key, defaultValue, this._getOptions(options));
  }

  updateAsync(key, value, options) {
    return updateAsync(this.file, key, value, this._getOptions(options));
  }

  mergeAsync(sources, options) {
    return mergeAsync(this.file, sources, this._getOptions(options));
  }

  deleteKeyAsync(key, options) {
    return deleteKeyAsync(this.file, key, this._getOptions(options));
  }

  deleteKeysAsync(keys, options) {
    return deleteKeysAsync(this.file, keys, this._getOptions(options));
  }

  rewriteAsync(options) {
    return rewriteAsync(this.file, this._getOptions(options));
  }

  _getOptions(options) {
    return Object.assign({}, this.options, options);
  }
}

function readAsync(file, options) {
  return fs.promise.readFile(file, 'utf8').then(json => {
    try {
      return JSON.parse(json);
    } catch (e) {
      let defaultValue = jsonParseErrorDefault(options);
      if (defaultValue === undefined) {
        throw new JsonFileError(`Error parsing JSON file: ${file}`, e);
      } else {
        return defaultValue;
      }
    }
  }, error => {
    let defaultValue = cantReadFileDefault(options);
    if (defaultValue === undefined) {
      throw new JsonFileError(`Can't read JSON file: ${file}`, error);
    } else {
      return defaultValue;
    }
  });
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
  try {
    var json = JSON.stringify(object, null, space);
  } catch (e) {
    throw new JsonFileError(`Couldn't JSON.stringify object for file: ${file}`, e);
  }
  return fs.promise.writeFile(file, json, 'utf8').then(() => object);
}

function updateAsync(file, key, value, options) {
  // TODO: Consider implementing some kind of locking mechanism, but
  // it's not critical for our use case, so we'll leave it out for now
  return readAsync(file, options).then(object => {
    object = _.set(object, key, value);
    return writeAsync(file, object, options);
  });
}

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

Object.assign(JsonFile, {
  readAsync,
  writeAsync,
  getAsync,
  updateAsync,
  mergeAsync,
  deleteKeyAsync,
  deleteKeysAsync,
  rewriteAsync,
});

module.exports = JsonFile;
