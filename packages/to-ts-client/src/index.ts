import prettier from 'prettier';
import { ProtoSpec } from '@protos/core';
import { Visitor, from, traverse } from './ast';
// import { ProtoSpecVisitor, visit } from './visitor';

// function typescriptWriter() {
//   const code: string[] = [];

//   return {
//     get code() {
//       return code.join(' ');
//     },
//     visitor: (): ProtoSpecVisitor => ({
//       EnumSpec: {
//         pre: spec => code.push(`enum ${spec.name} {`),
//         post: spec => code.push('}')
//       },
//       EnumValue: ({ name, value }) => code.push(`${name} = ${value},`),
//       Scope: {
//         pre: scope => code.push(`namespace ${scope.name} {`),
//         post: () => code.push('}')
//       },
//       ServiceSpec: {
//         pre: spec => code.push(`namespace ${spec.name} {`),
//         post: () => code.push('}')
//       },
//       MethodSpec: spec => {
//         traverse(spec);
//         // code.push(`function ${spec.name}(req: ${spec.request.message}): ${spec.response.message};`)
//       }
//     })
//   };
// }

function typeToString() {
  const code: string[] = [];

  return {
    get code() {
      return code.join(' ');
    },
    get visitor(): Visitor {
      return {};
    }
  };
}

function typescriptWriter() {
  const code: string[] = [];

  return {
    get code() {
      return code.join(' ');
    },
    get visitor(): Visitor {
      return {
        // Root: path => {
        //   console.log(path.get('packages').length);
        // },
        Package: {
          enter: ({ node }) => code.push(`namespace ${node.name} {`),
          exit: () => code.push('}')
        },
        Service: {
          enter: ({ node }) => code.push(`namespace ${node.name} {`),
          exit: () => code.push('}')
        }
        // Message: ({ node }) => code.push(`interface ${node.name} {}`),
        // Method: ast => {
        //   // have a way to get a child ast by name... in this case request and response

        //   traverse(ast, typeToString().visitor);
        //   // traverse(spec);
        //   // code.push(`function ${node.name}(req: ${node.request.message}): ${node.response.message};`);
        // },
        // Enum: {
        //   pre: ({ node }) => code.push(`enum ${node.name} {`),
        //   post: () => code.push('}')
        // },
        // EnumValue: ({ node }) => code.push(`${node.name} = ${node.value},`)
      };
    }
  };
}

export function toTypescriptClient(protos: ProtoSpec) {
  const writer = typescriptWriter();

  const ast = from(protos);
  traverse(ast, writer.visitor);

  // visit(protos, [writer.visitor()]);

  return prettier.format(writer.code, { parser: 'typescript' });
}
