import * as Core from '@protos/core';

import { Scope } from './scope';

export type Visit<T extends AST> =
  | ((ast: T) => void)
  | Partial<{
      pre: (node: T) => void;
      post: (node: T) => void;
    }>;

export interface Visitor {
  // BasicField?: Visit<BasicField>;
  // BasicType?: Visit<BasicType>;
  Enum?: Visit<AST.Enum>;
  // EnumType?: Visit<EnumType>;
  EnumValue?: Visit<AST.EnumValue>;
  // Field?: Visit<Field>;
  // MapType?: Visit<MapType>;
  Message?: Visit<AST.Message>;
  // MessageType?: Visit<MessageType>;
  Method?: Visit<AST.Method>;
  // OneOfField?: Visit<OneOfField>;
  Package?: Visit<AST.Package>;
  Root?: Visit<AST.Root>;
  Service?: Visit<AST.Service>;
  // Type?: Visit<Type>;
}

type ASTInstance<AstType extends AST.Type, NodeType, ChildrenType extends AST = undefined> = {
  children: ChildrenType[];
  node: NodeType;
  type: AstType;
};

export namespace AST {
  export namespace Node {
    export type Enum = Core.EnumSpec;
    export type EnumValue = Core.EnumValue;
    export type Message = Core.MessageSpec;
    export type Method = Core.MethodSpec;
    export type Service = Core.ServiceSpec;
    export interface Package {
      name: string;
      fullname: string;
    }
    export interface Root {}
  }

  export const enum Type {
    Enum = 'Enum',
    EnumValue = 'EnumValue',
    Message = 'Message',
    Method = 'Method',
    Package = 'Package',
    Root = 'Root',
    Service = 'Service'
  }

  export interface Enum {
    children: AST.EnumValue[];
    node: Node.Enum;
    type: Type.Enum;
  }
  export namespace Enum {
    export const from = (node: Node.Enum): AST.Enum => ({
      children: node.values.map(AST.EnumValue.from),
      node,
      type: Type.Enum
    });
  }
  export interface EnumValue {
    children: never[];
    node: Node.EnumValue;
    type: Type.EnumValue;
  }
  export namespace EnumValue {
    export const from = (node: Node.EnumValue): AST.EnumValue => ({
      children: [] as never[],
      node,
      type: Type.EnumValue
    });
  }
  export interface Message {
    children: never[];
    node: Node.Message;
    type: Type.Message;
  }
  export namespace Message {
    export const from = (node: Node.Message): AST.Message => ({
      children: [] as never[],
      node,
      type: Type.Message
    });
  }
  export interface Method {
    children: never[];
    node: Node.Method;
    type: Type.Method;
  }
  export namespace Method {
    export const from = (node: Node.Method): AST.Method => ({
      children: [] as never[],
      node,
      type: Type.Method
    });
  }
  export interface Service {
    children: AST.Method[];
    node: Node.Service;
    type: Type.Service;
  }
  export namespace Service {
    export const from = (node: Node.Service): AST.Service => ({
      children: node.methods.map(AST.Method.from),
      node,
      type: Type.Service
    });
  }
  export interface Package {
    children: (AST.Enum | AST.Message | AST.Package | AST.Service)[];
    node: Node.Package;
    type: Type.Package;
  }
  export namespace Package {
    export const from = (node: Node.Package): AST.Package => ({
      children: [],
      node,
      type: Type.Package
    });
  }
  export interface Root {
    children: AST.Package[];
    node: Node.Root;
    type: Type.Root;
  }

  const SortByName = <T extends { name: string }>(l: T, r: T) => l.name.localeCompare(r.name);
  const SortByNodeName = <T extends { node: { name: string } }>(l: T, r: T) => l.node.name.localeCompare(r.node.name);

  export function from(protos: Core.ProtoSpec): AST.Root {
    const root: AST.Root = {
      children: [],
      node: {},
      type: Type.Root
    };

    const fullname: string[] = [];

    const traverseScope = (scope: Scope, ast: AST.Root | AST.Package) => {
      fullname.push(scope.name);

      const packageAST = AST.Package.from({
        fullname: fullname.join('.'),
        name: scope.name
      });

      packageAST.children.push(
        ...[
          ...scope.enums.map(AST.Enum.from),
          ...scope.messages.map(AST.Message.from),
          ...scope.services.map(AST.Service.from)
        ].sort(SortByNodeName)
      );

      ast.children.push(packageAST);

      for (let child of Object.values(scope.children).sort(SortByName)) {
        traverseScope(child, packageAST);
      }
    };

    for (let scope of Object.values(Scope.from(protos).children).sort(SortByName)) {
      traverseScope(scope, root);
    }

    return root;
  }
}
export type AST = AST.Enum | AST.EnumValue | AST.Message | AST.Method | AST.Package | AST.Root | AST.Service;

function pre<T extends AST>(visit: Visit<T>, ast: T) {
  if (visit && typeof (visit as any).pre === 'function') {
    (visit as any).pre(ast);
  }
}

function post<T extends AST>(visit: Visit<T>, ast: T) {
  if (visit && typeof (visit as any).post === 'function') {
    (visit as any).post(ast);
  }
}

function handle<T extends AST>(visit: Visit<T>, ast: T) {
  if (visit) {
    if (typeof visit === 'function') {
      visit(ast);
    }
  }
}

export function traverse(root: AST, visitor: Visitor) {
  function traverseAST(ast: AST) {
    pre(visitor[ast.type], ast);
    handle(visitor[ast.type], ast);
    ast.children.forEach(traverseAST);
    post(visitor[ast.type], ast);
  }

  traverseAST(root);
}
