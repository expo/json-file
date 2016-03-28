'use strict';

require('instapromise');

let fs = require('fs');
let _ = require('lodash');

var DEFAULT_OPTS = {
  space: 2,
  default: undefined,
  badJsonDefault: undefined,
  cantReadFileDefault: undefined,
};

function jsonParseErrorDefault(opts) {
  opts = opts || {};
  if (opts.jsonParseErrorDefault === undefined) {
    return opts.default;
  } else {
    return opts.jsonParseErrorDefault;
  }
}

function cantReadFileDefault(opts) {
  opts = opts || {};
  if (opts.cantReadFileDefault === undefined) {
    return opts.default;
  } else {
    return opts.cantReadFileDefault;
  }
}

function JsonFileError(message, err) {
  var message = "JsonFileError: " + message;
  if (err) {
    message += ": " + err.message;
  }
  return new Error(message);
}

function _getDefault(opts, field) {
  if (opts) {
    if (opts[field] !== undefined) {
      return opts[field];
    }
  }
  return DEFAULT_OPTS[field];
}

function readAsync(file, opts) {
  return fs.promise.readFile(file, 'utf8').then(function (json) {
    try {
      return JSON.parse(json);
    } catch (e) {
      var defaultValue = _getDefault(opts, 'default');
      if (defaultValue === undefined) {
        throw JsonFileError("Error parsing JSON file " + file, e);
      } else {
        return defaultValue;
      }
    }
  }, function (err) {
    var defaultValue = cantReadFileDefault(opts);
    if (defaultValue === undefined) {
      throw JsonFileError("Can't read JSON file " + file, err);
    } else {
      return defaultValue;
    }
  });
}


function getAsync(file, key, defaultValue, opts) {
  return readAsync(file, _.assign({cantReadFileDefault: {}}, opts)).then(function (obj) {
    if (defaultValue === undefined) {
      if (!_.has(obj, key)) {
        throw JsonFileError("No value for key path " + key + " in JSON object");
      }
    }
    return _.get(obj, key, defaultValue);
  });
}

function writeAsync(file, obj, opts) {
  var space = _getDefault(opts, 'space');
  try {
    var json = JSON.stringify(obj, null, space);
  } catch (e) {
    throw JsonFileError("Couldn't JSON.stringify object", e);
  }
  return fs.promise.writeFile(file, json, 'utf8').then(function () {
    return obj;
  });
}

function updateAsync(file, key, val, opts) {
  // TODO: Consider implementing some kind of locking mechanism, but
  // it's not critical for our use case, so we'll leave it out for now
  return readAsync(file, opts).then(function (obj) {
    obj = _.set(obj, key, val);
    return writeAsync(file, obj, opts);
  });
}

function mergeAsync(file, sources, opts) {
  return readAsync(file, opts).then(function (obj) {
    obj = _.assign(obj, sources);
    return writeAsync(file, obj, opts);
  });
}

function deleteKeyAsync(file, key, opts) {
  return readAsync(file, opts).then(function (obj) {
    delete obj[key];
    return writeAsync(file, obj, opts);
  });
}

function deleteKeysAsync(file, keys, opts) {
  return readAsync(file, opts).then(function (obj) {
    for (var i = 0; i < keys.length; i++) {
      delete obj[keys[i]];
    }
    return writeAsync(file, obj, opts);
  });
}

function rewriteAsync(file, opts) {
  return readAsync(file, opts).then(function (obj) {
    return writeAsync(file, obj, opts);
  });
}

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

function file(file_, opts) {
  return new JsonFile(file_, opts);
}

module.exports = file;
Object.assign(module.exports, {
  readAsync,
  writeAsync,
  getAsync,
  updateAsync,
  mergeAsync,
  deleteKeyAsync,
  deleteKeysAsync,
  rewriteAsync,
  file,
});
