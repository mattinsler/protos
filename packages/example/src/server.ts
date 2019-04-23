import fs from 'fs';
import grpc from 'grpc';
import { toPackageDefinition } from '@protos/to-package-definition';

(async () => {
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

  console.log('Listening on 0.0.0.0:50051');
})().catch(err => console.log(err.stack));
