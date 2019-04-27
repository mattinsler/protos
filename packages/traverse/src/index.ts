import { ProtoSpec } from '@protos/core';
import { stringVisitor } from './string-visitor';
import { Node, NodeCreators, Nodes, Types } from './ast';
import { BasicVisitor, Path, Visit, Visitor, VisitorWithFinalize, pathFrom, traverseAST } from './traverse';

// from ast
export { Node, NodeCreators, Nodes, Types };
// from traverse
export { BasicVisitor, Path, Visit, Visitor, VisitorWithFinalize, traverseAST };
// from string-visitor
export { stringVisitor };

export function traverse<T = void>(protos: ProtoSpec, visitor: Visitor<T>): T {
  const path = pathFrom(NodeCreators.Root.from(protos), null);
  return traverseAST(path, visitor);
}
