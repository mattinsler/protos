# protos

protos turns your `.proto` files into typed TypeScript. You parse a `.proto` into a plain JSON description, then walk that description with a visitor to generate whatever you want from it: TypeScript types, a gRPC client, documentation, and so on. You describe your API once and let the tools derive the rest.

Everything is published on npm under the [@protos](https://www.npmjs.com/org/protos) org.

## From a .proto to TypeScript

Say you have a `.proto` file:

```proto
syntax = "proto3";

package fs;

message ReaddirRequest {
  string directory = 1;
}

message ReaddirResponse {
  repeated string filenames = 1;
}

service FileSystem {
  rpc readdir(ReaddirRequest) returns (ReaddirResponse) {};
}
```

protos works off a JSON version of your protos rather than the `.proto` files directly, so the first step is always to convert them. Install the CLI and run it:

```bash
# Install the CLI
npm install -g @protos/to-json

# Parse .proto files into protos.json
protos-to-json ./protos > protos.json

# Third-party imports are resolved from GitHub:
protos-to-json \
  -i https://github.com/grpc/grpc.git:src/proto/grpc \
  -i https://github.com/protocolbuffers/protobuf.git:src/google \
  ./protos > protos.json
```

Now the interesting part. You write a visitor, an object whose keys are the kinds of nodes in your proto (Message, Field, Service, Method, and so on), and protos walks the tree and calls your handlers. Here's one that emits TypeScript:

```typescript
import prettier from 'prettier';
import { ProtoSpec } from '@protos/core';
import { stringVisitor, traverse, traverseAST } from '@protos/traverse';

// A visitor that renders a type reference as a TS type string
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

// The main visitor that walks the AST and emits TypeScript source
const typescriptWriter = stringVisitor({
  BasicField: path => {
    const type = traverseAST(path, typeWriter());
    return `${path.node.name}${path.node.required ? '' : '?'}: ${type}${path.node.repeated ? '[]' : ''};`;
  },
  Enum: {
    enter: ({ node }) => `const enum ${node.name} {`,
    exit: () => '}'
  },
  EnumValue: ({ node }) => `${node.name} = ${node.value},`,
  Message: {
    enter: ({ node }) => `interface ${node.name} {`,
    exit: () => '}'
  },
  Method: path => {
    const req = traverseAST(path.get('request'), typeWriter());
    const res = traverseAST(path.get('response'), typeWriter());
    return `${path.node.name}(req: ${req}): Promise<${res}>;`;
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

const protos = require('./protos.json') as ProtoSpec;
const code = traverse(protos, typescriptWriter());
console.log(prettier.format(code, { parser: 'typescript' }));
```

Run that against the `fs.proto` from above and you get:

```typescript
namespace fs {
  interface ReaddirRequest {
    directory?: string;
  }

  interface ReaddirResponse {
    filenames?: string[];
  }

  interface FileSystem {
    readdir(req: ReaddirRequest): Promise<ReaddirResponse>;
  }
}
```

## Connect a client

The same `protos.json` also drives a real gRPC client at runtime, so you only describe your API once:

```typescript
import { GrpcContainer } from '@protos/client';
import { toPackageDefinition } from '@protos/to-package-definition';

const protos = require('./protos.json');
const packageDefinition = toPackageDefinition(protos);
const container = new GrpcContainer(packageDefinition);

const client = await container.connect('0.0.0.0:50051', 'fs.FileSystem');
const res = await client['readdir']({ directory: '/' });
console.log(res); // { filenames: [ ... ] }
```

## Writing your own generator

TypeScript is just one thing you can emit. A visitor is a plain object. Each key is a node type, and the value is either a function (called instead of recursing into the children) or an `{ enter, exit }` pair (called around the children):

```typescript
// Handler: called instead of recursing into children
Service: ({ node }) => `/* emit something */`

// Enter/exit: called before and after recursing into children
Package: {
  enter: ({ node }) => `namespace ${node.name} {`,
  exit: () => '}'
}
```

The node types you can hook into: `Root`, `Package`, `Message`, `BasicField`, `OneOfField`, `Enum`, `EnumValue`, `Service`, `Method`, `MethodRequest`, `MethodResponse`, `BasicType`, `EnumType`, `MessageType`, `MapType`.

`stringVisitor` is a helper for the common case: it collects whatever strings your handlers return and joins them. It hands you a fresh visitor each time you call it, so every traversal starts clean. See [@protos/traverse](packages/traverse/README.md) for the full API.

## The packages

protos is a handful of small packages. You usually only reach for a couple of them:

- [@protos/to-json](https://www.npmjs.com/package/@protos/to-json): the CLI that turns `.proto` files into a `protos.json`, pulling any third-party imports from GitHub. ([README](packages/to-json/README.md))
- [@protos/traverse](https://www.npmjs.com/package/@protos/traverse): the AST and visitor, the part you use to generate code. ([README](packages/traverse/README.md))
- [@protos/parser](https://www.npmjs.com/package/@protos/parser): reads `.proto` files into a typed object hierarchy, which is what the CLI uses under the hood. ([README](packages/parser/README.md))
- [@protos/to-package-definition](https://www.npmjs.com/package/@protos/to-package-definition): turns a `protos.json` into a gRPC `PackageDefinition`.
- [@protos/client](https://www.npmjs.com/package/@protos/client): `GrpcContainer`, for loading that package definition and connecting a client.
- [@protos/fetch](https://www.npmjs.com/package/@protos/fetch): grabs `.proto` files straight from GitHub repos.
- [@protos/core](https://www.npmjs.com/package/@protos/core): the shared TypeScript types everything else is built on.

Describe your API once as a `.proto`, and let the visitors generate the rest.
