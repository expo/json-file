'use strict';

let JsonFile = require('../JsonFile');
let fs = require('mz/fs');
let mock = require('mock-fs');
let lockFile = require('lockfile');

const j = JSON.stringify;

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

let obj1 = { x: 1 };
describe('JsonFile mockjs basic integration test', () => {
  beforeAll(() => {
    mock();
  });

  afterAll(() => {
    mock.restore();
  });

  it(`writes JSON to a file`, async () => {
    expect(fs.existsSync('./write-test.json')).toBe(false);
    let file = new JsonFile('./write-test.json', { json5: true });
    await file.writeAsync(obj1);
    expect(fs.existsSync('./write-test.json')).toBe(true);
    await expect(file.readAsync()).resolves.toEqual(obj1);
  });

  it(`rewrite async`, async () => {
    expect(fs.existsSync('./write-test.json')).toBe(true);
    let file = new JsonFile('./write-test.json', { json5: true });
    await expect(file.rewriteAsync()).resolves;
    expect(fs.existsSync('./write-test.json')).toBe(true);
    await expect(file.readAsync()).resolves.toEqual(obj1);
  });

  it(`changes an existing key in that file`, async () => {
    await expect(fs.existsSync('./write-test.json')).toBe(true);
    let file = new JsonFile('./write-test.json', { json5: true });
    await expect(file.setAsync('x', 2)).resolves;
    // await setAsync('y', 30)
    await expect(file.readAsync()).resolves.toEqual({ x: 2 });
  });

  it(`adds a new key to the file`, async () => {
    await expect(fs.existsSync('./write-test.json')).toBe(true);
    let file = new JsonFile('./write-test.json', { json5: true });
    await expect(file.setAsync('y', 3)).resolves;
    // await setAsync('y', 30)
    await expect(file.readAsync()).resolves.toEqual({ x: 2, y: 3 });
  });

  it(`deletes that same new key from the file`, async () => {
    await expect(fs.existsSync('./write-test.json')).toBe(true);
    let file = new JsonFile('./write-test.json', { json5: true });
    await expect(file.deleteKeyAsync('y')).resolves;
    // await setAsync('y', 30)
    await expect(file.readAsync()).resolves.toEqual({ x: 2 });
  });

  it(`deletes another key from the file`, async () => {
    await expect(fs.existsSync('./write-test.json')).toBe(true);
    let file = new JsonFile('./write-test.json', { json5: true });
    await expect(file.deleteKeyAsync('x')).resolves;
    // await setAsync('y', 30)
    await expect(file.readAsync()).resolves.toEqual({});
  });

});

describe('JsonFile mockjs race condition tegration test', () => {
  beforeAll(() => {
    mock();
  });

  afterAll(() => {
    mock.restore();
  });

  it('Continuous updating!', async () => {
    let file = new JsonFile('./write-test.json', { json5: true });
    await file.writeAsync({i: 0});
    for(var i = 0; i < 20; i++) {
      file.writeAsync({i})
      expect(file.readAsync()).resolves.toEqual({i})
    }
  })
})

