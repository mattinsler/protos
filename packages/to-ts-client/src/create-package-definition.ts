////////////////////////////////////////////////////////////////////////////////////////
//  ALMOST ALL LOT TAKEN FROM                                                         //
//  https://github.com/grpc/grpc-node/blob/master/packages/proto-loader/src/index.ts  //
////////////////////////////////////////////////////////////////////////////////////////

import * as Protobuf from 'protobufjs';
import * as descriptor from 'protobufjs/ext/descriptor';

declare module 'protobufjs' {
  interface Type {
    toDescriptor(protoVersion: string): Protobuf.Message<descriptor.IDescriptorProto> & descriptor.IDescriptorProto;
  }

  interface Root {
    toDescriptor(protoVersion: string): Protobuf.Message<descriptor.IFileDescriptorSet> & descriptor.IFileDescriptorSet;
  }

  interface Enum {
    toDescriptor(
      protoVersion: string
    ): Protobuf.Message<descriptor.IEnumDescriptorProto> & descriptor.IEnumDescriptorProto;
  }
}

export interface Serialize<T> {
  (value: T): Buffer;
}

export interface Deserialize<T> {
  (bytes: Buffer): T;
}

export interface ProtobufTypeDefinition {
  format: string;
  type: object;
  fileDescriptorProtos: Buffer[];
}

export interface MessageTypeDefinition extends ProtobufTypeDefinition {
  format: 'Protocol Buffer 3 DescriptorProto';
}

export interface EnumTypeDefinition extends ProtobufTypeDefinition {
  format: 'Protocol Buffer 3 EnumDescriptorProto';
}

export interface MethodDefinition<RequestType, ResponseType> {
  path: string;
  requestStream: boolean;
  responseStream: boolean;
  requestSerialize: Serialize<RequestType>;
  responseSerialize: Serialize<ResponseType>;
  requestDeserialize: Deserialize<RequestType>;
  responseDeserialize: Deserialize<ResponseType>;
  originalName?: string;
  requestType: MessageTypeDefinition;
  responseType: MessageTypeDefinition;
}

export interface ServiceDefinition {
  [index: string]: MethodDefinition<object, object>;
}

export type AnyDefinition = ServiceDefinition | MessageTypeDefinition | EnumTypeDefinition;

export interface PackageDefinition {
  [index: string]: AnyDefinition;
}

const descriptorOptions: Protobuf.IConversionOptions = {
  longs: String,
  enums: String,
  bytes: String,
  defaults: true,
  oneofs: true,
  json: true
};

function joinName(baseName: string, name: string): string {
  if (baseName === '') {
    return name;
  } else {
    return baseName + '.' + name;
  }
}

type HandledReflectionObject = Protobuf.Service | Protobuf.Type | Protobuf.Enum;

function isHandledReflectionObject(obj: Protobuf.ReflectionObject): obj is HandledReflectionObject {
  return obj instanceof Protobuf.Service || obj instanceof Protobuf.Type || obj instanceof Protobuf.Enum;
}

function isNamespaceBase(obj: Protobuf.ReflectionObject): obj is Protobuf.NamespaceBase {
  return obj instanceof Protobuf.Namespace || obj instanceof Protobuf.Root;
}

function getAllHandledReflectionObjects(
  obj: Protobuf.ReflectionObject,
  parentName: string
): Array<[string, HandledReflectionObject]> {
  const objName = joinName(parentName, obj.name);
  if (isHandledReflectionObject(obj)) {
    return [[objName, obj]];
  } else {
    if (isNamespaceBase(obj) && typeof obj.nested !== undefined) {
      return Object.keys(obj.nested!)
        .map(name => {
          return getAllHandledReflectionObjects(obj.nested![name], objName);
        })
        .reduce((accumulator, currentValue) => accumulator.concat(currentValue), []);
    }
  }
  return [];
}

function createDeserializer(cls: Protobuf.Type): Deserialize<object> {
  return function deserialize(argBuf: Buffer): object {
    return cls.toObject(cls.decode(argBuf));
  };
}

function createSerializer(cls: Protobuf.Type): Serialize<object> {
  return function serialize(arg: object): Buffer {
    const message = cls.fromObject(arg);
    return cls.encode(message).finish() as Buffer;
  };
}

function createMethodDefinition(method: Protobuf.Method, serviceName: string): MethodDefinition<object, object> {
  /* This is only ever called after the corresponding root.resolveAll(), so we
   * can assume that the resolved request and response types are non-null */
  const requestType: Protobuf.Type = method.resolvedRequestType!;
  const responseType: Protobuf.Type = method.resolvedResponseType!;
  return {
    path: '/' + serviceName + '/' + method.name,
    requestStream: !!method.requestStream,
    responseStream: !!method.responseStream,
    requestSerialize: createSerializer(requestType),
    requestDeserialize: createDeserializer(requestType),
    responseSerialize: createSerializer(responseType),
    responseDeserialize: createDeserializer(responseType),
    // TODO(murgatroid99): Find a better way to handle this
    // originalName: camelCase(method.name),
    originalName: method.name,
    requestType: createMessageDefinition(requestType),
    responseType: createMessageDefinition(responseType)
  };
}

function createServiceDefinition(service: Protobuf.Service, name: string): ServiceDefinition {
  const def: ServiceDefinition = {};
  for (const method of service.methodsArray) {
    def[method.name] = createMethodDefinition(method, name);
  }
  return def;
}

const fileDescriptorCache: Map<Protobuf.Root, Buffer[]> = new Map<Protobuf.Root, Buffer[]>();
function getFileDescriptors(root: Protobuf.Root): Buffer[] {
  if (fileDescriptorCache.has(root)) {
    return fileDescriptorCache.get(root)!;
  } else {
    const descriptorList: descriptor.IFileDescriptorProto[] = root.toDescriptor('proto3').file;
    const bufferList: Buffer[] = descriptorList.map(value =>
      Buffer.from(descriptor.FileDescriptorProto.encode(value).finish())
    );
    fileDescriptorCache.set(root, bufferList);
    return bufferList;
  }
}

function createMessageDefinition(message: Protobuf.Type): MessageTypeDefinition {
  const messageDescriptor: protobuf.Message<descriptor.IDescriptorProto> = message.toDescriptor('proto3');
  return {
    format: 'Protocol Buffer 3 DescriptorProto',
    type: messageDescriptor.$type.toObject(messageDescriptor, descriptorOptions),
    fileDescriptorProtos: getFileDescriptors(message.root)
  };
}

function createEnumDefinition(enumType: Protobuf.Enum): EnumTypeDefinition {
  const enumDescriptor: protobuf.Message<descriptor.IEnumDescriptorProto> = enumType.toDescriptor('proto3');
  return {
    format: 'Protocol Buffer 3 EnumDescriptorProto',
    type: enumDescriptor.$type.toObject(enumDescriptor, descriptorOptions),
    fileDescriptorProtos: getFileDescriptors(enumType.root)
  };
}

function createDefinition(obj: HandledReflectionObject, name: string): AnyDefinition {
  if (obj instanceof Protobuf.Service) {
    return createServiceDefinition(obj, name);
  } else if (obj instanceof Protobuf.Type) {
    return createMessageDefinition(obj);
  } else if (obj instanceof Protobuf.Enum) {
    return createEnumDefinition(obj);
  } else {
    throw new Error('Type mismatch in reflection object handling');
  }
}

export function createPackageDefinition(root: Protobuf.Root): PackageDefinition {
  const def: PackageDefinition = {};
  root.resolveAll();
  for (const [name, obj] of getAllHandledReflectionObjects(root, '')) {
    def[name] = createDefinition(obj, name);
  }
  return def;
}
