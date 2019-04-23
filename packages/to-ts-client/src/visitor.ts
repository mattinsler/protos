import {
  BasicField,
  BasicType,
  BasicTypeName,
  EnumSpec,
  EnumType,
  EnumValue,
  Field,
  MapType,
  MessageSpec,
  MessageType,
  MethodSpec,
  OneOfField,
  ProtoSpec,
  ServiceSpec,
  Type,
  isBasicField,
  isOneOfField,
  isBasicType,
  isEnumType,
  isMapType,
  isMessageType
} from '@protos/core';

import { Scope } from './scope';

function isEnumSpec(value: any): value is EnumSpec {
  return Array.isArray(value.values);
}

function isMessageSpec(value: any): value is MessageSpec {
  return Array.isArray(value.fields);
}

function isServiceSpec(value: any): value is ServiceSpec {
  return Array.isArray(value.methods);
}

type Visit<T> =
  | ((node: T) => void)
  | Partial<{
      pre: (node: T) => void;
      handle: (node: T) => void;
      post: (node: T) => void;
    }>;

export interface ProtoSpecVisitor {
  BasicField?: Visit<BasicField>;
  BasicType?: Visit<BasicType>;
  EnumSpec?: Visit<EnumSpec>;
  EnumType?: Visit<EnumType>;
  EnumValue?: Visit<EnumValue>;
  Field?: Visit<Field>;
  MapType?: Visit<MapType>;
  MessageSpec?: Visit<MessageSpec>;
  MessageType?: Visit<MessageType>;
  MethodSpec?: Visit<MethodSpec>;
  OneOfField?: Visit<OneOfField>;
  Scope?: Visit<Scope>;
  ServiceSpec?: Visit<ServiceSpec>;
  Type?: Visit<Type>;
}

function pre<T>(visit: Visit<T>, node: T) {
  if (visit && typeof (visit as any).pre === 'function') {
    (visit as any).pre(node);
  }
}

function handle<T>(visit: Visit<T>, node: T) {
  if (visit) {
    if (typeof visit === 'function') {
      visit(node);
    } else if (typeof visit.handle === 'function') {
      visit.handle(node);
    }
  }
}

function post<T>(visit: Visit<T>, node: T) {
  if (visit && typeof (visit as any).post === 'function') {
    (visit as any).post(node);
  }
}

const SortByName = (l: { name: string }, r: { name: string }) => l.name.localeCompare(r.name);

function traverseScope(scope: Scope, visitor: ProtoSpecVisitor) {
  pre(visitor.Scope, scope);

  for (let obj of [...scope.enums, ...scope.messages, ...scope.services].sort(SortByName)) {
    if (isEnumSpec(obj)) {
      pre(visitor.EnumSpec, obj);
      for (let value of obj.values) {
        pre(visitor.EnumValue, value);
        handle(visitor.EnumValue, value);
        post(visitor.EnumValue, value);
      }
      post(visitor.EnumSpec, obj);
    } else if (isMessageSpec(obj)) {
      pre(visitor.MessageSpec, obj);
      for (let field of obj.fields) {
        pre(visitor.Field, field);
        handle(visitor.Field, field);
        post(visitor.Field, field);
      }
      post(visitor.MessageSpec, obj);
    } else if (isServiceSpec(obj)) {
      pre(visitor.ServiceSpec, obj);
      for (let method of obj.methods) {
        pre(visitor.MethodSpec, method);
        handle(visitor.MethodSpec, method);
        post(visitor.MethodSpec, method);
      }
      post(visitor.ServiceSpec, obj);
    }
  }

  for (let child of Object.values(scope.children).sort(SortByName)) {
    traverseScope(child, visitor);
  }

  post(visitor.Scope, scope);
}

export function visit(protos: ProtoSpec, visitors: ProtoSpecVisitor[]) {
  const root = Scope.from(protos);
  for (let visitor of visitors) {
    for (let child of Object.values(root.children).sort(SortByName)) {
      traverseScope(child, visitor);
    }
  }
}
