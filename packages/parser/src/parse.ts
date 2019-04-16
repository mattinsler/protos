import {
  DescriptorProto,
  EnumDescriptorProto,
  FieldDescriptorProto,
  FileDescriptorProto,
  MethodDescriptorProto,
  ServiceDescriptorProto,
  SourceCodeInfo
} from 'google-protobuf/google/protobuf/descriptor_pb';

import {
  BasicField,
  BasicType,
  BasicTypeName,
  EnumSpec,
  MessageSpec,
  MethodSpec,
  OneOfField,
  ProtoSpec,
  ServiceSpec,
  Type,
  isMapType
} from '@protos/core';

const BASIC_TYPE_NAME_MAP: { [type: number]: BasicTypeName } = {
  [FieldDescriptorProto.Type.TYPE_BOOL]: 'bool',
  [FieldDescriptorProto.Type.TYPE_BYTES]: 'bytes',
  [FieldDescriptorProto.Type.TYPE_DOUBLE]: 'double',
  // [FieldDescriptorProto.Type.TYPE_ENUM]: 'enum',
  [FieldDescriptorProto.Type.TYPE_FIXED32]: 'sfixed32',
  [FieldDescriptorProto.Type.TYPE_FIXED64]: 'sfixed64',
  [FieldDescriptorProto.Type.TYPE_FLOAT]: 'float',
  // [FieldDescriptorProto.Type.TYPE_GROUP]: 'group',
  [FieldDescriptorProto.Type.TYPE_INT32]: 'int32',
  [FieldDescriptorProto.Type.TYPE_INT64]: 'int64',
  // [FieldDescriptorProto.Type.TYPE_MESSAGE]: 'message',
  [FieldDescriptorProto.Type.TYPE_SFIXED32]: 'sfixed32',
  [FieldDescriptorProto.Type.TYPE_SFIXED64]: 'sfixed64',
  [FieldDescriptorProto.Type.TYPE_SINT32]: 'sint32',
  [FieldDescriptorProto.Type.TYPE_SINT64]: 'sint64',
  [FieldDescriptorProto.Type.TYPE_STRING]: 'string',
  [FieldDescriptorProto.Type.TYPE_UINT32]: 'uint32',
  [FieldDescriptorProto.Type.TYPE_UINT64]: 'uint64'
};

const pathsMatch = (lhs: number[], rhs: number[]) =>
  lhs.length === rhs.length && lhs.findIndex((l, idx) => l !== rhs[idx]) === -1;

function getComments(path: number[], locationList: ReadonlyArray<SourceCodeInfo.Location.AsObject>): string[] {
  // locations that match by path
  const locations = locationList.filter(l => pathsMatch(l.pathList, path));
  if (locations.length) {
    const { leadingComments, leadingDetachedCommentsList, trailingComments } = locations[locations.length - 1];
    return [
      ...(leadingComments ? [leadingComments] : []),
      ...leadingDetachedCommentsList,
      ...(trailingComments ? [trailingComments] : [])
    ].map(c => c.trim());
  }
  return [];
}

function fromPairs<T>(pairs: [string, T][]): { [key: string]: T } {
  const obj: { [key: string]: T } = {};

  for (let [key, value] of pairs) {
    obj[key] = value;
  }

  return obj;
}

interface ParseFileResult {
  enums: { [fullname: string]: EnumSpec };
  messages: { [fullname: string]: MessageSpec };
  packages: string[];
  services: { [fullname: string]: ServiceSpec };
}

function parseFile(fileProto: Readonly<FileDescriptorProto.AsObject>): ParseFileResult {
  const pb_package: string | undefined = (fileProto as any).pb_package;
  const filePackage = pb_package ? pb_package.split('.').filter(a => a) : [];

  const locationList = fileProto.sourceCodeInfo.locationList;
  const enums: { [fullname: string]: EnumSpec } = {};
  const messages: { [fullname: string]: MessageSpec } = {};
  const packages = new Set<string>();
  const services: { [fullname: string]: ServiceSpec } = {};

  const parseEnum = (enumProto: Readonly<EnumDescriptorProto.AsObject>, pkg: string[], protoPath: number[]) => {
    const fullname = [...pkg, enumProto.name].join('.');

    enums[fullname] = {
      comments: getComments(protoPath, locationList),
      filename: fileProto.name!,
      fullname,
      name: enumProto.name!,
      package: pkg.join('.'),
      values: enumProto.valueList.map((value, idx) => ({
        comments: getComments([...protoPath, 2, idx], locationList),
        name: value.name!,
        value: value.number!
      }))
    };
  };

  const parseType = (fieldProto: Readonly<FieldDescriptorProto.AsObject>): Type => {
    if (BASIC_TYPE_NAME_MAP[fieldProto.type!]) {
      return {
        basic: BASIC_TYPE_NAME_MAP[fieldProto.type!]
      };
    } else if (fieldProto.type! === FieldDescriptorProto.Type.TYPE_MESSAGE) {
      if (
        fieldProto.label === FieldDescriptorProto.Label.LABEL_REPEATED &&
        fieldProto.typeName!.endsWith(`.${fieldProto.jsonName![0].toUpperCase()}${fieldProto.jsonName!.slice(1)}Entry`)
      ) {
        // return a map type where the key and value will be fixed up later
        const typeName = fieldProto
          .typeName!.split('.')
          .filter(a => a)
          .join('.');
        return {
          map: {
            keyType: { basic: typeName as BasicTypeName },
            valueType: { message: typeName }
          }
        };
      } else {
        return {
          message: fieldProto
            .typeName!.split('.')
            .filter(a => a)
            .join('.')
        };
      }
    } else if (fieldProto.type! === FieldDescriptorProto.Type.TYPE_ENUM) {
      return {
        enum: fieldProto
          .typeName!.split('.')
          .filter(a => a)
          .join('.')
      };
    }

    throw new Error();
  };

  const parseField = (fieldProto: Readonly<FieldDescriptorProto.AsObject>, protoPath: number[]): BasicField => {
    const type = parseType(fieldProto);
    return {
      comments: getComments(protoPath, locationList),
      name: fieldProto.name!,
      number: fieldProto.number!,
      oneof: false,
      repeated: isMapType(type) ? false : FieldDescriptorProto.Label.LABEL_REPEATED === fieldProto.label!,
      required: false,
      type
    };
  };

  const parseMessage = (messageProto: Readonly<DescriptorProto.AsObject>, pkg: string[], protoPath: number[]) => {
    const subpkg = [...pkg, messageProto.name!];
    const fullname = subpkg.join('.');

    (messageProto.enumTypeList || []).forEach((e, idx) => parseEnum(e, subpkg, [...protoPath, 5, idx]));
    (messageProto.nestedTypeList || []).forEach((m, idx) => parseMessage(m, subpkg, [...protoPath, 4, idx]));

    const oneofs: OneOfField[] = (messageProto.oneofDeclList || []).map(o => ({
      comments: [],
      name: o.name!,
      oneof: []
    }));

    const fields = (messageProto.fieldList || []).reduce(
      (arr, f, idx) => {
        const field = parseField(f, [...protoPath, 2, idx]);
        if (f.oneofIndex !== undefined) {
          oneofs[f.oneofIndex].oneof.push(field);
          return arr;
        } else {
          return [...arr, field];
        }
      },
      [] as BasicField[]
    );

    /*
      == fix up map types ==
      find all fields with a map type
      find the referenced map type (in both keyType and valueType as { message: '...' })
      promote the key and value fields from the referenced type
      remove the message type from the global message type list
    */

    for (let field of fields) {
      if (isMapType(field.type)) {
        const keyValueTypeName = field.type.map.keyType.basic;
        const keyValueType = messages[keyValueTypeName];

        field.type.map.keyType = (keyValueType.fields.find(f => f.name === 'key')! as BasicField).type as BasicType;
        field.type.map.valueType = (keyValueType.fields.find(f => f.name === 'value')! as BasicField).type;

        delete messages[keyValueTypeName];
      }
    }

    messages[fullname] = {
      comments: getComments(protoPath, locationList),
      fields: [...fields, ...oneofs],
      filename: fileProto.name!,
      fullname,
      name: messageProto.name!,
      package: pkg.join('.')
    };
  };

  const parseMethod = (methodProto: Readonly<MethodDescriptorProto.AsObject>, protoPath: number[]): MethodSpec => ({
    comments: getComments(protoPath, locationList),
    name: methodProto.name!,
    request: {
      message: methodProto
        .inputType!.split('.')
        .filter(a => a)
        .join('.'),
      stream: methodProto.clientStreaming!
    },
    response: {
      message: methodProto
        .outputType!.split('.')
        .filter(a => a)
        .join('.'),
      stream: methodProto.serverStreaming!
    }
  });

  const parseService = (
    serviceProto: Readonly<ServiceDescriptorProto.AsObject>,
    pkg: string[],
    protoPath: number[]
  ) => {
    const fullname = [...pkg, serviceProto.name].join('.');

    services[fullname] = {
      comments: getComments(protoPath, locationList),
      filename: fileProto.name!,
      fullname,
      methods: (serviceProto.methodList || []).map((m, idx) => parseMethod(m, [...protoPath, 2, idx])),
      name: serviceProto.name!,
      package: pkg.join('.')
    };
  };

  (fileProto.enumTypeList || []).forEach((e, idx) => parseEnum(e, filePackage, [5, idx]));
  (fileProto.messageTypeList || []).forEach((m, idx) => parseMessage(m, filePackage, [4, idx]));
  (fileProto.serviceList || []).forEach((s, idx) => parseService(s, filePackage, [6, idx]));

  return {
    enums,
    messages,
    packages: Array.from(packages),
    services
  };
}

export function parse(protos: ReadonlyArray<FileDescriptorProto.AsObject>): ProtoSpec {
  const results = protos.map(parseFile);

  const enums = Object.values(
    fromPairs(results.map(r => Object.entries(r.enums)).reduce((a, b) => [...a, ...b], []))
  ).sort((l, r) => l.fullname.localeCompare(r.fullname));
  const messages = Object.values(
    fromPairs(results.map(r => Object.entries(r.messages)).reduce((a, b) => [...a, ...b], []))
  ).sort((l, r) => l.fullname.localeCompare(r.fullname));
  const services = Object.values(
    fromPairs(results.map(r => Object.entries(r.services)).reduce((a, b) => [...a, ...b], []))
  ).sort((l, r) => l.fullname.localeCompare(r.fullname));

  return {
    enums,
    messages,
    services
  };
}
