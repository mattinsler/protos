import path from 'path';
import fs from 'fs-extra';

import { ProtoFile } from './protofiles';

export async function transformRelativeToAbsoluteImports(protofiles: ProtoFile[]) {
  const filesByDir = protofiles.reduce(
    (o, protofile) => {
      (o[protofile.relativeDir] ? o[protofile.relativeDir] : (o[protofile.relativeDir] = [])).push(protofile.filename);
      return o;
    },
    {} as { [dir: string]: string[] }
  );

  for (let { absoluteDir, filename, relativeDir } of protofiles) {
    const absoluteFilename = path.resolve(absoluteDir, filename);
    let content = await fs.readFile(absoluteFilename, 'utf8');

    let match;
    let pos = 0;
    let hasChanged = false;
    while (null !== (match = content.slice(pos).match(/import\s+(\"([^\"\/]+)\"|\'([^\'\/]+)\')\;/))) {
      const currentpath = match[2];
      const targetpath = path.join(relativeDir, match[2]);
      if (currentpath !== targetpath) {
        if (filesByDir[relativeDir].indexOf(currentpath) === -1) {
          throw new Error(`${filename} imports ${currentpath}, but that file does not exist in ${absoluteDir}.`);
        }
        content = content.replace(match[0], `import "${targetpath}";`);
        hasChanged = true;
      }

      pos += match.index + match[0].length;
    }

    if (hasChanged) {
      fs.writeFileSync(absoluteFilename, content, 'utf8');
    }
  }
}
