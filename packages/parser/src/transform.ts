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
    let hasChanged = false;
    while (null !== (match = content.match(/import\s+(\"([^\"\/]+)\"|\'([^\'\/]+)\')\;/))) {
      if (filesByDir[relativeDir].indexOf(match[2]) === -1) {
        throw new Error(`${filename} imports ${match[2]}, but that file does not exist in ${absoluteDir}.`);
      }
      content = content.replace(match[0], `import "${path.join(relativeDir, match[2])}";`);
      hasChanged = true;
    }

    if (hasChanged) {
      fs.writeFileSync(absoluteFilename, content, 'utf8');
    }
  }
}
