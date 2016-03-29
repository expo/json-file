'use strict';

let JsonFile = require('../JsonFile');

describe('JsonFile', () => {
  it(`is a class`, () => {
    let file = new JsonFile('../package.json');
    expect(file instanceof JsonFile).toBe(true);
  });

  it(`has static functions`, () => {
    expect(JsonFile.readAsync).toBeDefined();
    expect(JsonFile.writeAsync).toBeDefined();
  });

  pit(`reads JSON from a file`, () => {
    // require('fs');
    let file = new JsonFile('./package.json');
    return file.readAsync().then(object => {
      expect(object.version).toBeDefined();
    });
  });
});
