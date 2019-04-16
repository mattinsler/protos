import glob from 'glob';
import path from 'path';

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
