import os from 'os';
import path from 'path';
import execa from 'execa';
import fs from 'fs-extra';
import crypto from 'crypto';
import { ProtoSpec } from '@protos/core';
import loadJsonFile from 'load-json-file';

function findPackage(dir: string) {
  let nextDir;

  do {
    if (fs.existsSync(path.resolve(dir, 'package.json'))) {
      return path.resolve(dir, 'package.json');
    }

    nextDir = path.resolve(dir, '..');
  } while (dir !== nextDir);

  const err = new Error(`Cannot find package.json for '${dir}'`);
  (err as any).code = 'MODULE_NOT_FOUND';
  throw err;
}

function findBinary(pkgName: string, binName: string) {
  const pkgPath = require.resolve(pkgName);
  const pjsonPath = findPackage(path.dirname(pkgPath));
  const pjson = require(pjsonPath);

  if (pjson.bin && pjson.bin[binName]) {
    return path.resolve(path.dirname(pjsonPath), pjson.bin[binName]);
  }

  const err = new Error(`Cannot find binary '${binName}' in package '${pkgName}'`);
  (err as any).code = 'MODULE_NOT_FOUND';
  throw err;
}

const PROTOC = findBinary('grpc-tools', 'grpc_tools_node_protoc');
const PROTOC_GEN_PARSER = require.resolve('./protoc-gen-parser');

export async function protoc(files: string[], includes: string[]): Promise<ProtoSpec> {
  if (files.length === 0) {
    return { enums: [], messages: [], services: [] };
  }

  const tmpdir = path.resolve(os.tmpdir(), crypto.randomBytes(16).toString('hex'));
  await fs.mkdirs(tmpdir);

  await fs.chmod(PROTOC_GEN_PARSER, 0o755);

  await execa(
    PROTOC,
    [
      `--plugin=protoc-gen-parser=${PROTOC_GEN_PARSER}`,
      `--parser_out=${tmpdir}`,
      ...includes.map(include => `--proto_path=${include}`),
      ...files
    ],
    {
      stdio: 'inherit'
    }
  );

  return loadJsonFile(path.resolve(tmpdir, 'protos.json'));
}
