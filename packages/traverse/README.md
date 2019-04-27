# @protos/traverse

AST building and traversal for protobuf descriptions.

This module makes it easy to generate code from a protocol buffer or group of
protocol buffers. Just pass in a parsed proto file (use [@protos/to-json](https://www.npmjs.com/package/@protos/to-json) to create the parsed file) and a visitor.

## Example Usage

The following code will take the proto definitions from a local `protos.json` file
and output typescript code that has all enum definitions encased in namespaces that
map to the protobuf packages.

```typescript
import prettier from 'prettier';
import { stringVisitor, traverse } from '@protos/traverse';

const visitor = stringVisitor({
  Enum: {
    enter: ({ node }) => `const enum ${node.name} {`,
    exit: () => '}'
  },
  EnumValue: ({ node }) => `${node.name} = ${node.value},`,
  Package: {
    enter: ({ node }) => `namespace ${node.name} {`,
    exit: () => '}'
  }
});

const code = traverse(require('./protos.json'), visitor);
console.log(prettier.format(code, { parser: 'typescript' }));
```

## Related Modules

- [@protos/core](https://www.npmjs.com/package/@protos/core): Typescript definitions used by all [@protos](https://www.npmjs.com/org/protos) modules.
- [@protos/parser](https://www.npmjs.com/package/@protos/parser): Parser to read .proto files and produce a usable object hierarchy.
- [@protos/to-json](https://www.npmjs.com/package/@protos/to-json): Command-line tool to parse and output a JSON format from .proto files that can be used with other [@protos](https://www.npmjs.com/org/protos) modules.
