import { GrpcContainer } from '@protos/client';
import { toPackageDefinition } from '@protos/to-package-definition';

(async () => {
  const protos = require('../protos.json');
  const packageDefinition = toPackageDefinition(protos);
  const container = new GrpcContainer(packageDefinition);
  const client = await container.connect('0.0.0.0:50051', 'fs.FileSystem');

  const res = await new Promise((resolve, reject) =>
    client['readdir']({ directory: '/' }, (err, data) => (err ? reject(err) : resolve(data)))
  );
  console.log(res);
})().catch(err => console.log(err.stack));
