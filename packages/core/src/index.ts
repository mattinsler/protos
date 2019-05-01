export type BasicTypeName =
  | 'double'
  | 'float'
  | 'int32'
  | 'int64'
  | 'uint32'
  | 'uint64'
  | 'sint32'
  | 'sint64'
  | 'fixed32'
  | 'fixed64'
  | 'sfixed32'
  | 'sfixed64'
  | 'bool'
  | 'string'
  | 'bytes';

export interface BasicType {
  basic: BasicTypeName;
}
export interface EnumType {
  enum: string;
}
export interface MapType {
  map: {
    keyType: BasicType;
    valueType: Type;
  };
}
export interface MessageType {
  message: string;
}

export type Type = BasicType | EnumType | MapType | MessageType;

export interface Options {
  [key: string]: any;
}

export interface BasicField {
  comments?: string[];
  name: string;
  number: number;
  oneof: false;
  options?: Options;
  repeated: boolean;
  required: boolean;
  type: Type;
}

export interface OneOfField {
  comments?: string[];
  name: string;
  oneof: BasicField[];
  options?: Options;
}

export type Field = BasicField | OneOfField;

export interface MessageSpec {
  comments?: string[];
  fields: Field[];
  filename: string;
  fullname: string;
  name: string;
  options?: Options;
  package: string;
}

export interface EnumValue {
  comments?: string[];
  name: string;
  options?: Options;
  value: number;
}

export interface EnumSpec {
  comments?: string[];
  filename: string;
  fullname: string;
  name: string;
  options?: Options;
  package: string;
  values: EnumValue[];
}

export interface MethodSpec {
  comments?: string[];
  name: string;
  options?: Options;
  request: MessageType & {
    stream: boolean;
  };
  response: MessageType & {
    stream: boolean;
  };
}

export interface ServiceSpec {
  comments?: string[];
  filename: string;
  fullname: string;
  methods: MethodSpec[];
  name: string;
  options?: Options;
  package: string;
}

export interface ProtoSpec {
  enums: EnumSpec[];
  messages: MessageSpec[];
  services: ServiceSpec[];
}

export function isBasicType(type: Type): type is BasicType {
  return !!(type as BasicType).basic;
}

export function isEnumType(type: Type): type is EnumType {
  return !!(type as EnumType).enum;
}

export function isMapType(type: Type): type is MapType {
  return !!(type as MapType).map;
}

export function isMessageType(type: Type): type is MessageType {
  return !!(type as MessageType).message;
}

export function isBasicField(field: Field): field is BasicField {
  return field.oneof === false;
}

export function isOneOfField(field: Field): field is OneOfField {
  return Array.isArray(field.oneof);
}
