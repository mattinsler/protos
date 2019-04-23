import {
  BasicField,
  ProtoSpec,
  ServiceSpec,
  Type,
  isBasicField,
  isOneOfField,
  isBasicType,
  isEnumType,
  isMapType,
  isMessageType
} from '@protos/core';

import { Scope } from './scope';

interface ProtoSpecVisitor {
  Service(spec: ServiceSpec): any;
  Scope(scope: Scope): any;
}

function traverseScope(scope: Scope) {
  for (let [pkg, child] of Object.entries(scope.children)) {
    traverseScope(child);
  }
}

export function visit(protos: ProtoSpec, visitors: ProtoSpecVisitor[]) {
  const root = Scope.from(protos);
  traverseScope(root);
}
