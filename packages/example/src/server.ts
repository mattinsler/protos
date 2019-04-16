import fs from 'fs';
import grpc from 'grpc';
// import path from 'path';
// import { fromProtos } from '@protos/parser';
import { toPackageDefinition } from '@protos/to-package-definition';

(async () => {
  // const protos = await fromProtos(path.resolve(__dirname, '..', 'protos'));
  const protos = require('../protos.json');
  const packageDefinition = toPackageDefinition(protos);
  const root = grpc.loadPackageDefinition(packageDefinition);

  const server = new grpc.Server();

  server.addService((root as any).fs.FileSystem.service, {
    readdir(call, cb) {
      console.log(call.request);
      cb(null, { filenames: fs.readdirSync(call.request.directory) });
    }
  });

  server.bind('0.0.0.0:50051', grpc.ServerCredentials.createInsecure());
  server.start();
})().catch(err => console.log(err.stack));
