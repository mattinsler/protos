import prettier from 'prettier';
import { ProtoSpec } from '@protos/core';
import { stringVisitor, traverse, traverseAST } from '@protos/traverse';

const typeWriter = stringVisitor({
  BasicType: ({ node }) => node.name,
  EnumType: ({ node }) => node.name,
  MapType: path => {
    const key = traverseAST(path.get('key'), typeWriter());
    const value = traverseAST(path.get('value') as any, typeWriter());
    return `{[key: ${key}]: ${value}}`;
  },
  MessageType: ({ node }) => node.name
});

const typescriptWriter = stringVisitor({
  BasicField: path => {
    const node = path.node;
    const type = traverseAST(path, typeWriter());
    return `${node.name}${node.required ? '' : '?'}: ${type}${node.repeated ? '[]' : ''};`;
  },
  Enum: {
    enter: ({ node }) => `const enum ${node.name} {`,
    exit: () => '}'
  },
  EnumValue: ({ node }) => `${node.name} = ${node.value},`,
  Message: function*(path) {
    const node = path.node;

    if (node.oneofField) {
      const typeNames = [];
      for (let field of node.oneofField.fields) {
        const typeName = `${node.name}_${field.name}`;
        typeNames.push(typeName);

        yield `interface ${typeName} {`;
        yield `${node.oneofField.name}: '${field.name}';`;
        yield traverseAST({ ...field, required: true }, typescriptWriter());
        yield node.basicFields.map(f => traverseAST(f, typescriptWriter()));
        yield '}';
      }

      yield `type ${node.name} = ${typeNames.join(' | ')};`;
    } else {
      yield `interface ${node.name} {`;
      yield path.children.map(c => traverseAST(c, typescriptWriter()));
      yield '}';
    }
  },
  Method: path => {
    const node = path.node;
    const req = traverseAST(path.get('request'), typeWriter());
    const res = traverseAST(path.get('response'), typeWriter());

    return `${node.name}(req: ${req}): Promise<${res}>;`;
  },
  Package: {
    enter: ({ node }) => `namespace ${node.name} {`,
    exit: () => '}'
  },
  Service: {
    enter: ({ node }) => `interface ${node.name} {`,
    exit: () => '}'
  }
});

// main

const protos = require('../protos.json') as ProtoSpec;
const code = traverse(protos, typescriptWriter());
console.log(prettier.format(code, { parser: 'typescript' }));
