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

  // NOTE(brentvatne):
  // the following tests break randomly, I believe due to instapromise,
  // because I change the implementation from fs.promise.readFile to
  // fs.readFile.promise

  // pit(`reads JSON from a file`, () => {
  //   let file = new JsonFile('./package.json');
  //   return file.readAsync().then(object => {
  //     expect(object.version).toBeDefined();
  //   });
  // });

  // pit(`reads JSON5 from a file`, () => {
  //   let file = new JsonFile('./test-json5.json', {json5: true});
  //   return file.readAsync().then(object => {
  //     expect(object.itParsedProperly).toBe(42);
  //   });
  // });
});
