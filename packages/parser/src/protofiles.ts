import glob from 'glob';
import path from 'path';
import fs from 'fs-extra';

import { stripComments } from './strip-comments';

export interface ProtoFile {
  absoluteDir: string;
  relativeDir: string;
  filename: string;
}

export async function collectFiles(rootdir: string): Promise<ProtoFile[]> {
  const files = await new Promise<string[]>((resolve, reject) => {
    glob('**/*.proto', { cwd: rootdir, root: rootdir }, (err, files) => (err ? reject(err) : resolve(files)));
  });
  return files.map(file => {
    const relativeDir = path.dirname(file);

    return {
      absoluteDir: path.resolve(rootdir, relativeDir),
      filename: path.basename(file),
      relativeDir
    };
  });
}

async function extractImports(filename: string): Promise<string[]> {
  const imports: string[] = [];
  const content = stripComments(await fs.readFile(filename, 'utf8'));

  let idx = 0;
  let match;

  while (null !== (match = /import\s+"([^"]+)"/g.exec(content.slice(idx)))) {
    imports.push(match[1]);
    idx += match.index + 1;
  }

  return imports;
}

export async function getDependencyMap(files: string[], includeDirs: string[]) {
  const queue = [...files];
  const dependencyMap: { [file: string]: string[] } = {};

  while (queue.length) {
    const current = queue.pop();
    if (!dependencyMap[current]) {
      dependencyMap[current] = await extractImports(current);

      for (let i of dependencyMap[current]) {
        const include = includeDirs.find(include => fs.existsSync(path.resolve(include, i)));
        if (!include) {
          throw new Error(`Could not find import ${i} from ${current}.`);
        }
        queue.push(path.resolve(include, i));
      }
    }
  }

  return dependencyMap;
}
