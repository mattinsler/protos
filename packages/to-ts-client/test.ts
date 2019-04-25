import { Scope } from './src/scope';
import { toTypescriptClient } from './src';

const protos = require('/tmp/foo/protos.json');
const ts = toTypescriptClient(protos);
console.log(ts);
