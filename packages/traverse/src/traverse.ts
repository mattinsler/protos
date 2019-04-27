import { Node, Nodes, NodeCreators } from './ast';

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
  type: N['nodeType'];
}

export type Visit<N extends Node, R = void> =
  | ((path: Path<N>) => R)
  | {
      enter?: (path: Path<N>) => R;
      exit?: (path: Path<N>) => R;
    };

export interface BasicVisitor<R = void> {
  BasicField?: Visit<Nodes.BasicField, R>;
  BasicType?: Visit<Nodes.BasicType, R>;
  Enum?: Visit<Nodes.Enum, R>;
  EnumType?: Visit<Nodes.EnumType, R>;
  EnumValue?: Visit<Nodes.EnumValue, R>;
  MapType?: Visit<Nodes.MapType, R>;
  Message?: Visit<Nodes.Message, R>;
  MessageType?: Visit<Nodes.MessageType, R>;
  Method?: Visit<Nodes.Method, R>;
  MethodRequest?: Visit<Nodes.MethodRequest, R>;
  MethodResponse?: Visit<Nodes.MethodResponse, R>;
  OneOfField?: Visit<Nodes.OneOfField, R>;
  Package?: Visit<Nodes.Package, R>;
  Root?: Visit<Nodes.Root, R>;
  Service?: Visit<Nodes.Service, R>;
}

export interface VisitorWithFinalize<T, R = void> extends BasicVisitor<R> {
  init?(): void;
  finalize(): T;
}

export type Visitor<T = void> = BasicVisitor | VisitorWithFinalize<T>;

function isBasicVisitor(visitor: Visitor): visitor is BasicVisitor {
  return (
    (visitor as VisitorWithFinalize<any>).init === undefined &&
    (visitor as VisitorWithFinalize<any>).finalize === undefined
  );
}

function isVisitorWithFinalize(visitor: Visitor): visitor is VisitorWithFinalize<any> {
  return (visitor as VisitorWithFinalize<any>).finalize !== undefined;
}

export function pathFrom<N extends Node>(node: N, parent: Path<any> | null): Path<N> {
  const currentPath = {
    children: NodeCreators[node.nodeType].children(node),
    get: name => {
      const child = node[name];
      return Array.isArray(child) ? child.map(c => pathFrom(c, currentPath)) : pathFrom(child, currentPath);
    },
    node,
    parent,
    type: node.nodeType
  };

  return currentPath;
}

function hasEnter<N extends Node>(visit: Visit<N>): visit is { enter?: (path: Path<N>) => void } {
  return visit && typeof (visit as any).enter === 'function';
}
function hasExit<N extends Node>(visit: Visit<N>): visit is { exit?: (path: Path<N>) => void } {
  return visit && typeof (visit as any).exit === 'function';
}
function hasHandle<N extends Node>(visit: Visit<N>): visit is (path: Path<N>) => void {
  return visit && typeof visit === 'function';
}

function enter<N extends Node>(visit: Visit<N>, path: Path<N>) {
  hasEnter(visit) && visit.enter(path);
}
function exit<N extends Node>(visit: Visit<N>, path: Path<N>) {
  hasExit(visit) && visit.exit(path);
}
function handle<N extends Node>(visit: Visit<N>, path: Path<N>) {
  hasHandle(visit) && visit(path);
}

function isNode(value: any): value is Node {
  return !!(value as Node).nodeType;
}

function traverseInternal(arg: any, visitor: Visitor) {
  const path = isNode(arg) ? pathFrom(arg, null) : arg;

  const typeVisitor = visitor[path.type];
  if (hasEnter(typeVisitor) || hasExit(typeVisitor)) {
    enter(typeVisitor, path);
    for (let child of path.children) {
      traverseInternal(pathFrom(child, path), visitor);
    }
    exit(typeVisitor, path);
  } else if (hasHandle(typeVisitor)) {
    handle(typeVisitor, path);
  } else {
    for (let child of path.children) {
      traverseInternal(pathFrom(child, path), visitor);
    }
  }
}

export function traverseAST<N extends Node, T = void>(node: N, visitor: Visitor<T>): T;
export function traverseAST<N extends Node, T = void>(path: Path<N>, visitor: Visitor<T>): T;
export function traverseAST(arg: any, visitor: Visitor) {
  if (isVisitorWithFinalize(visitor) && visitor.init) {
    visitor.init();
  }

  traverseInternal(arg, visitor);

  if (isVisitorWithFinalize(visitor)) {
    return visitor.finalize();
  }
}
