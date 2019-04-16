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
  return protoc(files.map(f => path.resolve(f.absoluteDir, f.filename)), [tmpdir, ...(opts.includes || [])]);
}
