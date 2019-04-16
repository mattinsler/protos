import * as Protobuf from 'protobufjs';
import { ProtoSpec } from '@protos/core';

import { createJson } from './create-json';
import { createPackageDefinition } from './create-package-definition';

export function toPackageDefinition(protos: ProtoSpec) {
  const json = createJson(protos);
  const root = Protobuf.Root.fromJSON(json);
  return createPackageDefinition(root);
}
