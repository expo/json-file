var _ = require('lodash-node');
var fs = require('fs');
var instapromise = require('instapromise');

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
  return ((opts && opts[field]) || DEFAULT_OPTS[field]);
}

function readFileAsync(file, opts) {
  return fs.promise.readFile(file, 'utf8').then(function (json) {
    try {
      return JSON.parse(json);
    } catch (e) {
      var defaultValue = _getDefault('default');
      if (defaultValue === undefined) {
        throw JsonFileError("Error parsing JSON file " + file, e);
      } else {
        return defaultValue;
      }
    }
  }, function (err) {
    var defaultValue = _getDefault(opts, 'cantReadFileDefault');
    if (defaultValue === undefined) {
      throw JsonFileError("Can't read JSON file " + file, err);
    }
  });
}


function getAsync(file, key, defaultValue) {
  return readFileAsync(file).then(function (obj) {
    if (defaultValue === undefined) {
      if (!_.has(obj, key)) {
        throw JsonFileError("No value for key path " + key + " in JSON object");
      }
    }
    return _.get(obj, key, defaultValue);
  });
}

function writeFileAsync(file, obj, opts) {
  var space = _getDefault(opts, 'space');
  try {
    var json = JSON.stringify(obj, null, space);
  } catch (e) {
    throw JsonFileError("Couldn't JSON.stringify object", e);
  }
  return fs.promise.writeFile(file, json, 'utf8');
}

function updateFileAsync(file, key, val, opts) {
  // TODO: Consider implementing some kind of locking mechanism, but
  return readFileAsync(file, opts).then(function (obj) {
    obj = _.set(obj, key, val);
    return writeFileAsync(file, obj, opts).then(function () {
      return obj;
    });
  });
}

module.exports = {
  readFileAsync: readFileAsync,
  writeFileAsync: writeFileAsync,
  getAsync: getAsync,
  updateFileAsync: updateFileAsync,
};
