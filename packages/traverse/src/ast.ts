import * as Core from '@protos/core';

import { Scope } from './scope';

export const enum Types {
  BasicField = 'BasicField',
  BasicType = 'BasicType',
  Enum = 'Enum',
  EnumType = 'EnumType',
  EnumValue = 'EnumValue',
  MapType = 'MapType',
  Message = 'Message',
  MessageType = 'MessageType',
  Method = 'Method',
  MethodRequest = 'MethodRequest',
  MethodResponse = 'MethodResponse',
  OneOfField = 'OneOfField',
  Package = 'Package',
  Root = 'Root',
  Service = 'Service'
}

export interface Node<T extends string = any> {
  nodeType: T;
}

export namespace Nodes {
  export interface BasicField extends Node<Types.BasicField> {
    comments?: string[];
    name: string;
    number: number;
    repeated: boolean;
    required: boolean;
    type: Nodes.Type;
  }
  export interface BasicType extends Node<Types.BasicType> {
    name: string;
  }
  export interface Enum extends Node<Types.Enum> {
    comments?: string[];
    filename: string;
    fullname: string;
    name: string;
    package: string;
    values: Nodes.EnumValue[];
  }
  export interface EnumType extends Node<Types.EnumType> {
    name: string;
  }
  export interface EnumValue extends Node<Types.EnumValue> {
    comments?: string[];
    name: string;
    value: number;
  }
  export type Field = Nodes.BasicField | Nodes.OneOfField;
  export interface MapType extends Node<Types.MapType> {
    key: Nodes.BasicType;
    value: Type;
  }
  export interface Message extends Node<Types.Message> {
    comments?: string[];
    // only basic fields
    basicFields: Nodes.BasicField[];
    // all fields (includes basic and oneof)
    fields: Nodes.Field[];
    filename: string;
    fullname: string;
    name: string;
    // only the oneof field
    oneofField?: Nodes.OneOfField;
    package: string;
  }
  export interface MessageType extends Node<Types.MessageType> {
    name: string;
  }
  export interface Method extends Node<Types.Method> {
    comments?: string[];
    name: string;
    request: Nodes.MethodRequest;
    response: Nodes.MethodResponse;
  }
  export interface MethodRequest extends Node<Types.MethodRequest> {
    stream: boolean;
    type: Nodes.MessageType;
  }
  export interface MethodResponse extends Node<Types.MethodResponse> {
    stream: boolean;
    type: Nodes.MessageType;
  }
  export interface OneOfField extends Node<Types.OneOfField> {
    comments?: string[];
    fields: Nodes.BasicField[];
    name: string;
  }
  export interface Package extends Node<Types.Package> {
    enums: Nodes.Enum[];
    fullname: string;
    messages: Nodes.Message[];
    name: string;
    packages: Nodes.Package[];
    services: Nodes.Service[];
  }
  export interface Root extends Node<Types.Root> {
    name: string;
    packages: Nodes.Package[];
  }
  export interface Service extends Node<Types.Service> {
    comments?: string[];
    filename: string;
    fullname: string;
    methods: Nodes.Method[];
    name: string;
    package: string;
  }
  export type Type = Nodes.BasicType | Nodes.EnumType | Nodes.MapType | Nodes.MessageType;
}

const SortByName = <T extends { name: string }>(l: T, r: T) => l.name.localeCompare(r.name);

export const NodeCreators = {
  BasicField: {
    children: (node: Nodes.BasicField) => [node.type],
    from: (spec: Core.BasicField): Nodes.BasicField => ({
      comments: spec.comments,
      name: spec.name,
      nodeType: Types.BasicField,
      number: spec.number,
      repeated: spec.repeated,
      required: spec.required,
      type: NodeCreators.Type.from(spec.type)
    })
  },
  BasicType: {
    children: (node: Nodes.BasicType) => [],
    from: (type: Core.BasicType): Nodes.BasicType => ({
      name: type.basic,
      nodeType: Types.BasicType
    })
  },
  Enum: {
    children: (node: Nodes.Enum) => node.values,
    from: (spec: Core.EnumSpec): Nodes.Enum => ({
      comments: spec.comments,
      filename: spec.filename,
      fullname: spec.fullname,
      name: spec.name,
      nodeType: Types.Enum,
      package: spec.package,
      values: spec.values.map(NodeCreators.EnumValue.from)
    })
  },
  EnumType: {
    children: (node: Nodes.EnumType) => [],
    from: (type: Core.EnumType): Nodes.EnumType => ({
      name: type.enum,
      nodeType: Types.EnumType
    })
  },
  EnumValue: {
    children: (node: Nodes.EnumValue) => [],
    from: (spec: Core.EnumValue): Nodes.EnumValue => ({
      comments: spec.comments,
      name: spec.name,
      nodeType: Types.EnumValue,
      value: spec.value
    })
  },
  Field: {
    from: (spec: Core.Field) =>
      Core.isBasicField(spec) ? NodeCreators.BasicField.from(spec) : NodeCreators.OneOfField.from(spec)
  },
  MapType: {
    children: (node: Nodes.MapType) => [node.key, node.value],
    from: (type: Core.MapType): Nodes.MapType => ({
      key: NodeCreators.BasicType.from(type.map.keyType),
      nodeType: Types.MapType,
      value: NodeCreators.Type.from(type.map.valueType)
    })
  },
  MessageType: {
    children: (node: Nodes.MessageType) => [],
    from: (type: Core.MessageType): Nodes.MessageType => ({
      name: type.message,
      nodeType: Types.MessageType
    })
  },
  Message: {
    children: (node: Nodes.Message) => node.fields,
    from: (spec: Core.MessageSpec): Nodes.Message => ({
      basicFields: spec.fields
        .filter(Core.isBasicField)
        .map(NodeCreators.BasicField.from)
        .sort(SortByName),
      comments: spec.comments,
      fields: spec.fields.map(NodeCreators.Field.from).sort(SortByName),
      filename: spec.filename,
      fullname: spec.fullname,
      name: spec.name,
      nodeType: Types.Message,
      oneofField: spec.fields.filter(Core.isOneOfField).map(NodeCreators.OneOfField.from)[0],
      package: spec.package
    })
  },
  Method: {
    children: (node: Nodes.Method) => [node.request, node.response],
    from: (spec: Core.MethodSpec): Nodes.Method => ({
      comments: spec.comments,
      name: spec.name,
      nodeType: Types.Method,
      request: NodeCreators.MethodRequest.from(spec),
      response: NodeCreators.MethodResponse.from(spec)
    })
  },
  MethodRequest: {
    children: (node: Nodes.MethodRequest) => [node.type],
    from: (spec: Core.MethodSpec): Nodes.MethodRequest => ({
      nodeType: Types.MethodRequest,
      stream: spec.request.stream,
      type: NodeCreators.MessageType.from(spec.request)
    })
  },
  MethodResponse: {
    children: (node: Nodes.MethodResponse) => [node.type],
    from: (spec: Core.MethodSpec): Nodes.MethodResponse => ({
      nodeType: Types.MethodResponse,
      stream: spec.request.stream,
      type: NodeCreators.MessageType.from(spec.response)
    })
  },
  OneOfField: {
    children: (node: Nodes.OneOfField) => node.fields,
    from: (spec: Core.OneOfField): Nodes.OneOfField => ({
      comments: spec.comments,
      fields: spec.oneof.map(NodeCreators.BasicField.from),
      name: spec.name,
      nodeType: Types.OneOfField
    })
  },
  Package: {
    children: (node: Nodes.Package) =>
      [...node.enums, ...node.messages, ...node.packages, ...node.services].sort(SortByName),
    from: (scope: Scope): Nodes.Package => ({
      enums: scope.enums.map(NodeCreators.Enum.from).sort(SortByName),
      fullname: scope.fullname,
      messages: scope.messages.map(NodeCreators.Message.from).sort(SortByName),
      name: scope.name,
      nodeType: Types.Package,
      packages: Object.values(scope.children)
        .map(NodeCreators.Package.from)
        .sort(SortByName),
      services: scope.services.map(NodeCreators.Service.from).sort(SortByName)
    })
  },
  Service: {
    children: (node: Nodes.Service) => node.methods,
    from: (spec: Core.ServiceSpec): Nodes.Service => ({
      comments: spec.comments,
      filename: spec.filename,
      fullname: spec.fullname,
      methods: spec.methods.map(NodeCreators.Method.from).sort(SortByName),
      name: spec.name,
      nodeType: Types.Service,
      package: spec.package
    })
  },
  Root: {
    children: (node: Nodes.Root) => node.packages,
    from: (protos: Core.ProtoSpec): Nodes.Root => ({
      name: '',
      nodeType: Types.Root,
      packages: Object.values(Scope.from(protos).children)
        .map(NodeCreators.Package.from)
        .sort(SortByName)
    })
  },
  Type: {
    from: (type: Core.Type) =>
      Core.isBasicType(type)
        ? NodeCreators.BasicType.from(type)
        : Core.isEnumType(type)
        ? NodeCreators.EnumType.from(type)
        : Core.isMapType(type)
        ? NodeCreators.MapType.from(type)
        : NodeCreators.MessageType.from(type)
  }
};