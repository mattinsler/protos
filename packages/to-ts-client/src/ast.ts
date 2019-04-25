import * as Core from '@protos/core';

import { Scope } from './scope';

export const enum Types {
  Enum = 'Enum',
  EnumValue = 'EnumValue',
  Field = 'Field',
  Message = 'Message',
  Method = 'Method',
  MethodRequest = 'MethodRequest',
  MethodResponse = 'MethodResponse',
  Package = 'Package',
  Root = 'Root',
  Service = 'Service'
}

export interface Node<T extends string = any> {
  type: T;
}

export namespace Nodes {
  export interface MethodRequest extends Node<Types.MethodRequest> {
    // type: Nodes.Message;
    stream: boolean;
  }
  export interface MethodResponse extends Node<Types.MethodResponse> {
    // type: Nodes.Message;
    stream: boolean;
  }

  export interface Method extends Node<Types.Method> {
    // comments?: string[];
    name: string;
    request: Nodes.MethodRequest;
    response: Nodes.MethodResponse;
  }
  export interface Package extends Node<Types.Package> {
    fullname: string;
    name: string;
    packages: Nodes.Package[];
    services: Nodes.Service[];
  }
  export interface Root extends Node<Types.Root> {
    name: string;
    packages: Nodes.Package[];
  }
  export interface Service extends Node<Types.Service> {
    // comments?: string[];
    filename: string;
    fullname: string;
    methods: Nodes.Method[];
    name: string;
    package: string;
  }
}

type SubType<Base, Condition> = Pick<
  Base,
  { [Key in keyof Base]: Base[Key] extends Condition ? Key : never }[keyof Base]
>;

type NodeKeyNames<N extends Node> = keyof (SubType<N, Node> & SubType<N, Node[]>);

type Unpacked<T> = T extends (infer U)[] ? U : T;
type PathNodeTypeHelper<T> = T extends Node ? Path<T> : never;
type PathNodeType<T> = T extends Node ? Path<T> : T extends Node[] ? PathNodeTypeHelper<Unpacked<T>>[] : never;

type ValueTypes<N extends Node, K extends keyof N> = { [P in K]: Unpacked<N[P]> }[K];

export interface Path<N extends Node> {
  children: ValueTypes<N, NodeKeyNames<N>>[];
  get: <KeyName extends NodeKeyNames<N>>(name: KeyName) => PathNodeType<N[KeyName]>;
  node: N;
  parent: Path<any> | null;
  type: N['type'];
}

export type Visit<N extends Node> =
  | ((path: Path<N>) => void)
  | {
      enter?: (path: Path<N>) => void;
      exit?: (path: Path<N>) => void;
    };

export interface Visitor {
  // Enum = 'Enum',
  // EnumValue = 'EnumValue',
  // Field = 'Field',
  // Message = 'Message',
  Method?: Visit<Nodes.Method>;
  MethodRequest?: Visit<Nodes.MethodRequest>;
  MethodResponse?: Visit<Nodes.MethodResponse>;
  Package?: Visit<Nodes.Package>;
  Root?: Visit<Nodes.Root>;
  Service?: Visit<Nodes.Service>;
}

const SortByName = <T extends { name: string }>(l: T, r: T) => l.name.localeCompare(r.name);
const SortByNodeName = <T extends { node: { name: string } }>(l: T, r: T) => l.node.name.localeCompare(r.node.name);

const NodeCreators = {
  Method: {
    children: (node: Nodes.Method) => [node.request, node.response],
    from: (spec: Core.MethodSpec): Nodes.Method => ({
      name: spec.name,
      request: NodeCreators.MethodRequest.from(spec),
      response: NodeCreators.MethodResponse.from(spec),
      type: Types.Method
    })
  },
  MethodRequest: {
    children: (node: Nodes.MethodRequest) => [],
    from: (spec: Core.MethodSpec): Nodes.MethodRequest => ({
      stream: spec.request.stream,
      type: Types.MethodRequest
    })
  },
  MethodResponse: {
    children: (node: Nodes.MethodResponse) => [],
    from: (spec: Core.MethodSpec): Nodes.MethodResponse => ({
      stream: spec.request.stream,
      type: Types.MethodResponse
    })
  },
  Package: {
    children: (node: Nodes.Package) => [...node.packages, ...node.services],
    from: (scope: Scope): Nodes.Package => ({
      fullname: scope.fullname,
      name: scope.name,
      packages: Object.values(scope.children)
        .map(NodeCreators.Package.from)
        .sort(SortByName),
      services: scope.services.map(NodeCreators.Service.from).sort(SortByName),
      type: Types.Package
    })
  },
  Service: {
    children: (node: Nodes.Service) => node.methods,
    from: (spec: Core.ServiceSpec): Nodes.Service => ({
      filename: spec.filename,
      fullname: spec.fullname,
      methods: spec.methods.map(NodeCreators.Method.from).sort(SortByName),
      name: spec.name,
      package: spec.package,
      type: Types.Service
    })
  },
  Root: {
    children: (node: Nodes.Root) => node.packages,
    from: (protos: Core.ProtoSpec): Nodes.Root => ({
      name: '',
      packages: Object.values(Scope.from(protos).children)
        .map(NodeCreators.Package.from)
        .sort(SortByName),
      type: Types.Root
    })
  }
};

function pathFrom<N extends Node>(node, parent: Path<any> | null): Path<N> {
  const currentPath = {
    children: NodeCreators[node.type].children(node),
    get: name => {
      const child = node[name];
      return Array.isArray(child) ? child.map(c => pathFrom(c, currentPath)) : pathFrom(child, currentPath);
    },
    node,
    parent,
    type: node.type
  };

  return currentPath;
}

function enter<N extends Node>(visit: Visit<N>, path: Path<N>) {
  if (visit && typeof (visit as any).enter === 'function') {
    (visit as any).enter(path);
  }
}

function exit<N extends Node>(visit: Visit<N>, path: Path<N>) {
  if (visit && typeof (visit as any).exit === 'function') {
    (visit as any).exit(path);
  }
}

function handle<N extends Node>(visit: Visit<N>, path: Path<N>) {
  if (visit) {
    if (typeof visit === 'function') {
      visit(path);
    }
  }
}

export function from(protos: Core.ProtoSpec): Path<Nodes.Root> {
  return pathFrom(NodeCreators.Root.from(protos), null);
}

export function traverse<N extends Node>(path: Path<N>, visitor: Visitor) {
  enter(visitor[path.type], path);
  handle(visitor[path.type], path);
  for (let child of path.children) {
    const childPath = pathFrom(child, path);
    traverse(childPath, visitor);
  }
  exit(visitor[path.type], path);
}
