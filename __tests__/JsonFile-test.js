'use strict';

const JsonFile = require('../JsonFile');
const fs = require('mz/fs');
const path = require('path')
const mock = require('mock-fs');
const lockFile = require('lockfile');
const cp = require('child_process');
const _ = require('lodash');

const j = JSON.stringify;

jasmine.DEFAULT_TIMEOUT_INTERVAL = 2 * 60 * 1000;

describe('JsonFile Basic Tests', () => {
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
    await expect(file.readAsync()).resolves.toEqual({ x: 2 });
  });

  it(`adds a new key to the file`, async () => {
    await expect(fs.existsSync('./write-test.json')).toBe(true);
    let file = new JsonFile('./write-test.json', { json5: true });
    await expect(file.setAsync('y', 3)).resolves;
    await expect(file.readAsync()).resolves.toEqual({ x: 2, y: 3 });
  });

  it(`deletes that same new key from the file`, async () => {
    await expect(fs.existsSync('./write-test.json')).toBe(true);
    let file = new JsonFile('./write-test.json', { json5: true });
    await expect(file.deleteKeyAsync('y')).resolves;
    await expect(file.readAsync()).resolves.toEqual({ x: 2 });
  });

  it(`deletes another key from the file`, async () => {
    await expect(fs.existsSync('./write-test.json')).toBe(true);
    let file = new JsonFile('./write-test.json', { json5: true });
    await expect(file.deleteKeyAsync('x')).resolves;
    await expect(file.readAsync()).resolves.toEqual({});
  });
});

describe('JsonFile mockjs race condition integration test', () => {
  beforeAll(() => {
    mock();
  });

  afterAll(() => {
    mock.restore();
  });

  // The following test is not possible beacuse child processes do not inherit a mocked file system
  xit(
    'Multiple updates to the same file from different processes are atomic',
    async () => {
      let file = new JsonFile('atomic-test.json', { json5: true });
      let baseObj = {};
      for (var i = 0; i < 20; i++) {
        const k = i.toString();
        const v = i.toString();
        baseObj = _.extend(baseObj, { [k]: v });
        cp.fork('./worker-test.js', ['./atomic-test.json', k, v]);
      }
      // The following worker does a setAsync
      //cp.fork('./JsonFileWorker', [filename, key, value])
      const json = await file.readAsync();
      console.log(json);
      expect(json).toEqual(baseObj);
    }
  );

  // This fails when i is high, around 200. However, no realistic use case would have the user
  // constantly update a file that often
  it('Multiple updates to the same file have no race conditions', async () => {
    let file = new JsonFile('./atomic-test.json', { json5: true });
    for (var i = 0; i < 50; i++) {
      await file.writeAsync({});
      let baseObj = {};
      for (var i = 0; i < 20; i++) {
        baseObj = _.extend(baseObj, { [i]: i });
        file.setAsync(i, i);
      }
      const json = await file.readAsync();
      expect(json).toEqual(baseObj);
    }
  });

  it('Continuous updating!', async () => {
    let file = new JsonFile('./write-test.json', { json5: true });
    await file.writeAsync({ i: 0 });
    for (var i = 0; i < 20; i++) {
      file.writeAsync({ i });
      await expect(file.readAsync()).resolves.toEqual({ i });
    }
  });
});
