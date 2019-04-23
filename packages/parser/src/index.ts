import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import crypto from 'crypto';
import { ProtoSpec } from '@protos/core';

import { protoc } from './protoc';
import { collectFiles } from './protofiles';
import { transformRelativeToAbsoluteImports } from './transform';

export async function fromProtos(protodir: string, opts: { includes?: string[] } = {}): Promise<ProtoSpec> {
  const tmpdir = path.resolve(os.tmpdir(), crypto.randomBytes(16).toString('hex'));
  await fs.copy(protodir, tmpdir);

  const files = await collectFiles(tmpdir);
  await transformRelativeToAbsoluteImports(files);

  const protofiles = files.map(f => path.resolve(f.absoluteDir, f.filename));
  if (opts.includes) {
    const includesFiles = await Promise.all(opts.includes.map(collectFiles));
    for (let files of includesFiles) {
      protofiles.push(...files.map(f => path.resolve(f.absoluteDir, f.filename)));
    }
  }

  return protoc(protofiles, [tmpdir, ...(opts.includes || [])]);
}

export async function fromProtoFiles(protofiles: string[], opts: { includes?: string[] } = {}): Promise<ProtoSpec> {
  // const tmpdir = path.resolve(os.tmpdir(), crypto.randomBytes(16).toString('hex'));
  // await fs.copy(protodir, tmpdir);

  // const files = await collectFiles(tmpdir);
  // await transformRelativeToAbsoluteImports(files);

  // const protofiles = files.map(f => path.resolve(f.absoluteDir, f.filename));
  // if (opts.includes) {
  //   const includesFiles = await Promise.all(opts.includes.map(collectFiles));
  //   for (let files of includesFiles) {
  //     protofiles.push(...files.map(f => path.resolve(f.absoluteDir, f.filename)));
  //   }
  // }

  return protoc(protofiles, opts.includes || []);
}
