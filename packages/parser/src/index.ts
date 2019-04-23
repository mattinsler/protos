import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import crypto from 'crypto';
import { ProtoSpec } from '@protos/core';

import { protoc } from './protoc';
import { collectFiles, getDependencyMap } from './protofiles';
import { transformRelativeToAbsoluteImports } from './transform';

function merge(specs: ProtoSpec[]): ProtoSpec {
  const combined: ProtoSpec = { enums: [], messages: [], services: [] };

  for (let spec of specs) {
    combined.enums.push(...spec.enums);
    combined.messages.push(...spec.messages);
    combined.services.push(...spec.services);
  }

  return combined;
}

export async function fromProtos(protodir: string, opts: { includes?: string[] } = {}): Promise<ProtoSpec> {
  const { includes = [] } = opts;

  const tmpdir = path.resolve(os.tmpdir(), crypto.randomBytes(16).toString('hex'));
  await fs.copy(protodir, tmpdir);

  const protofiles = await collectFiles(tmpdir);
  await transformRelativeToAbsoluteImports(protofiles);

  const files = protofiles.map(f => path.resolve(f.absoluteDir, f.filename));
  const depfiles = Object.keys(await getDependencyMap(files, [tmpdir, ...includes])).filter(f => !f.startsWith(tmpdir));

  return merge([await protoc(files, [tmpdir, ...includes]), await protoc(depfiles, includes)]);
}

export async function fromProtoFiles(files: string[], opts: { includes?: string[] } = {}): Promise<ProtoSpec> {
  const { includes = [] } = opts;
  const fileSet = new Set(files);
  const depfiles = Object.keys(await getDependencyMap(files, includes)).filter(f => !fileSet.has(f));

  return merge([await protoc(files, includes), await protoc(depfiles, includes)]);
}
