# @protos/to-json

Command-line tool to parse and output a JSON format from .proto files that can be used with other [@protos](https://www.npmjs.com/org/protos) modules or by anyone who likes dealing
with JSON rather than protocol buffer descriptors.

This module will crate a binary named `protos-to-json` that can be used to parse
protocol buffers and create a JSON description. If your protos use any third party
protos, you can reference them by their github URL and a base directory within
the repo.

## Example Usage

```bash
# Export all .proto files in /protos to STDOUT
protos-to-json \
  # Include protos from the grpc/grpc github repo starting at the base directory src/proto/grpc
  -i https://github.com/grpc/grpc.git:src/proto/grpc \
  # Include protos from the protocolbuffers/protobuf github repo starting at the base directory src/google
  -i https://github.com/protocolbuffers/protobuf.git:src/google \
  /protos
```

## Related Modules

- [@protos/core](https://www.npmjs.com/package/@protos/core): Typescript definitions used by all [@protos](https://www.npmjs.com/org/protos) modules.
- [@protos/parser](https://www.npmjs.com/package/@protos/parser): Parser to read .proto files and produce a usable object hierarchy.
- [@protos/traverse](https://www.npmjs.com/package/@protos/traverse): AST building and traversal for protobuf descriptions.
