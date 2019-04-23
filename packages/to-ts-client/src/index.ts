import { ProtoSpec, ServiceSpec } from '@protos/core';

interface ProtoSpecVisitor {
  Service(spec: ServiceSpec): any;
}

function visit(protos: ProtoSpec, visitors: ProtoSpecVisitor[]) {}

export function toTypescriptClient(protos: ProtoSpec) {
  return visit(protos, [
    {
      Service(spec) {}
    }
  ]);
}
