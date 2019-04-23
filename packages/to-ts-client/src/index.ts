import prettier from 'prettier';
import { ProtoSpec } from '@protos/core';
import { ProtoSpecVisitor, visit } from './visitor';

function typescriptVisitor(): ProtoSpecVisitor & { code: string } {
  const code: string[] = [];

  const visitor: ProtoSpecVisitor = {
    EnumSpec: {
      pre: spec => code.push(`enum ${spec.name} {`),
      post: spec => code.push('}')
    },
    EnumValue: ({ name, value }) => code.push(`${name} = ${value},`),
    Scope: {
      pre: scope => code.push(`namespace ${scope.name} {`),
      post: () => code.push('}')
    },
    ServiceSpec: {
      pre: spec => code.push(`namespace ${spec.name} {`),
      post: () => code.push('}')
    },
    MethodSpec: spec => code.push(`function ${spec.name}(req: ${spec.request.message}): ${spec.response.message};`)
  };

  Object.defineProperty(visitor, 'code', {
    get() {
      return code.join(' ');
    }
  });

  return visitor as any;
}

export function toTypescriptClient(protos: ProtoSpec) {
  const visitor = typescriptVisitor();
  visit(protos, [visitor]);
  return prettier.format(visitor.code, { parser: 'typescript' });
}
