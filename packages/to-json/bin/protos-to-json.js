#!/usr/bin/env node

const fs = require('fs');
const nopt = require('nopt');
const path = require('path');
const { EOL } = require('os');
const { toJson } = require('../');

function usage(errorMessage) {
  console.log(
    [
      ...(errorMessage ? [`ERROR: ${errorMessage}`, ''] : []),
      'Usage: protos-to-json [OPTIONS] proto_directory',
      '',
      'OPTIONS',
      '  --include,-i dir|url   include third party protos',
      '',
      'EXAMPLES',
      '  # Export all .proto files in /protos to the protos.json file',
      '  protos-to-json /protos > protos.json',
      '',
      '  # Export all .proto files in /protos to STDOUT',
      '  protos-to-json \\',
      '    # Include protos from the grpc/grpc github repo starting at the base directory src/proto/grpc',
      '    -i https://github.com/grpc/grpc.git:src/proto/grpc \\',
      '    -i https://github.com/protocolbuffers/protobuf.git:src/google \\',
      '    /protos',
      ''
    ].join(EOL)
  );
  process.exit(1);
}

const { include, argv, ...other } = nopt(
  {
    include: [Array, String]
  },
  {
    i: ['--include']
  }
);

if (Object.keys(other).length > 0) {
  usage('Unknown options: ' + Object.keys(other).join(', '));
}

if (argv.remain.length !== 1) {
  usage();
}

const protodir = path.isAbsolute(argv.remain[0]) ? argv.remain[0] : path.resolve(process.cwd(), argv.remain[0]);

if (!fs.existsSync(protodir)) {
  usage(`Proto directory ${protodir} does not exist.`);
}

if (!fs.statSync(protodir).isDirectory()) {
  usage(`Proto directory ${protodir} is not a directory.`);
}

const includeProtos = (include || []).map(i => {
  // parse out last colon as the potential base
  const match = i.match(/^(.*):([^:]+)$/);
  if (match) {
    return { url: match[1], base: match[2] };
  } else {
    return { url: i };
  }
});

(async () => {
  try {
    console.log(JSON.stringify(await toJson(protodir, includeProtos), null, 2));
  } catch (err) {
    console.log(err.stack);
  }
})();
