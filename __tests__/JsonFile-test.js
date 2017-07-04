'use strict';

const path = require('path');

const JsonFile = require('../JsonFile');

describe('JsonFile', () => {
  it(`is a class`, () => {
    let file = new JsonFile(path.join(__dirname, '../package.json'));
    expect(file instanceof JsonFile).toBe(true);
  });

  it(`has static functions`, () => {
    expect(JsonFile.readAsync).toBeDefined();
    expect(JsonFile.writeAsync).toBeDefined();
  });

  it(`reads JSON from a file`, async () => {
    let file = new JsonFile(path.join(__dirname, '../package.json'));
    let object = await file.readAsync();
    expect(object.version).toBeDefined();
  });

  it(`reads JSON statically from a file`, async () => {
    let object = await JsonFile.readAsync(
      path.join(__dirname, '../package.json')
    );
    expect(object.version).toBeDefined();
  });

  it(`reads JSON5 from a file`, async () => {
    let file = new JsonFile(path.join(__dirname, 'files/test-json5.json'), {
      json5: true,
    });
    let object = await file.readAsync();
    expect(object.itParsedProperly).toBe(42);
  });
});
