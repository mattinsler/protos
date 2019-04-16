import os from 'os';
import got from 'got';
import tar from 'tar';
import glob from 'glob';
import path from 'path';
import fs from 'fs-extra';
import crypto from 'crypto';

import * as github from './github';

export interface FetchOptions {
  base?: string;
  into?: string;
}

// copies files one by one to merge into the destination
async function copyFiles(src: string, dst: string) {
  src = path.resolve(src);
  dst = path.resolve(dst);

  const rootDirname = path.basename(src);

  await fs.mkdirs(path.resolve(dst, rootDirname));

  const files = await new Promise<string[]>((resolve, reject) =>
    glob('**', { cwd: src, root: src }, (err, files) => {
      err ? reject(err) : resolve(files);
    })
  );

  for (let file of files) {
    if ((await fs.stat(path.resolve(src, file))).isDirectory()) {
      await fs.mkdirs(path.resolve(dst, rootDirname, file));
    } else {
      await fs.copyFile(path.resolve(src, file), path.resolve(dst, rootDirname, file));
    }
  }
}

export async function fetch(url: string, opts: FetchOptions = {}): Promise<string> {
  let tmpdir = path.resolve(os.tmpdir(), crypto.randomBytes(16).toString('hex'));

  let parsed;
  if ((parsed = github.parseUrl(url))) {
    await fs.mkdirs(tmpdir);

    const downloadUrl = github.formatDownloadUrl(parsed);
    await new Promise((resolve, reject) => {
      got
        .stream(downloadUrl, { decompress: true })
        .pipe(
          tar.extract({
            cwd: tmpdir,
            strip: 1,
            filter: path => path.endsWith('.proto')
          })
        )
        .on('error', reject)
        .on('close', resolve);
    });
  } else {
    throw new Error(
      [
        `Could not fetch protos from ${url}.`,
        `Currently the supported formats are:`,
        `  - https://github.com/user/repo.git`,
        `  - git@github.com/user/repo.git`,
        ''
      ].join(os.EOL)
    );
  }

  if (opts.base) {
    const basedir = path.resolve(os.tmpdir(), crypto.randomBytes(16).toString('hex'), opts.base);
    await fs.move(path.resolve(tmpdir, opts.base), basedir);
    tmpdir = basedir;
  }
  if (opts.into) {
    await copyFiles(tmpdir, opts.into);
    tmpdir = opts.into;
  }

  return tmpdir;
}
