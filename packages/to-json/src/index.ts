import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import crypto from 'crypto';
import { fetch } from '@protos/fetch';
import { ProtoSpec } from '@protos/core';
import { fromProtos } from '@protos/parser';

export async function toJson(
  protodir: string,
  thirdpartyProtos: {
    base?: string;
    url: string;
  }[] = []
): Promise<ProtoSpec> {
  const thirdparty = path.resolve(os.tmpdir(), crypto.randomBytes(16).toString('hex'));
  await fs.mkdirs(thirdparty);
  await Promise.all(thirdpartyProtos.map(({ base, url }) => fetch(url, { base, into: thirdparty })));
  return fromProtos(protodir, { includes: [thirdparty] });
}
