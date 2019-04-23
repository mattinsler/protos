import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import crypto from 'crypto';
import { fetch } from '@protos/fetch';
import { ProtoSpec } from '@protos/core';
import { fromProtos, fromProtoFiles } from '@protos/parser';

const PROTODIR = path.resolve(__dirname, '..', 'protos');

(async () => {
  const thirdparty = path.resolve(os.tmpdir(), crypto.randomBytes(16).toString('hex'));
  await fs.mkdirs(thirdparty);
  // console.log(thirdparty);

  await Promise.all([
    fetch('https://github.com/protocolbuffers/protobuf.git', { base: 'src/google', into: thirdparty })
  ]);

  const protos = await fromProtos(PROTODIR, { includes: [thirdparty] });
  console.log(JSON.stringify(protos, null, 2));

  // const root = '/var/folders/7d/k5mfrg0x1sd2q1hf3d2d3xv00000gp/T/f24b0e221de542f989ce875caa0de1a9';
  // const base = path.resolve(root, 'google', 'protobuf');
  // const files = fs
  //   .readdirSync(base)
  //   .map(f => path.resolve(base, f))
  //   .filter(f => f.endsWith('.proto') && !fs.statSync(f).isDirectory());

  // // console.log(files);
  // // const protos = await fromProtoFiles([path.resolve(root, 'google', 'protobuf', '.proto')], { includes: [root] });
  // const protos = await fromProtoFiles(files, { includes: [root] });
  // console.log(JSON.stringify(protos, null, 2));
})().catch(err => console.log(err.stack));
