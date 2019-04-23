import { EnumSpec, MessageSpec, ServiceSpec, ProtoSpec } from '@protos/core';

export interface Scope {
  children: {
    [key: string]: Scope;
  };
  enums: EnumSpec[];
  messages: MessageSpec[];
  name: string;
  services: ServiceSpec[];
}

export namespace Scope {
  export const create = (name: string): Scope => ({
    children: {},
    enums: [],
    messages: [],
    name,
    services: []
  });

  const createDeep = (root: Scope, keys: string[]): Scope => {
    let current = root;
    for (let key of keys) {
      if (!current.children[key]) {
        current.children[key] = create(key);
      }
      current = current.children[key];
    }
    return current;
  };

  export const from = ({ enums, messages, services }: ProtoSpec): Scope => {
    const root = create('__ROOT__');

    for (let e of enums) {
      const scope = createDeep(root, e.package.split('.'));
      scope.enums.push(e);
    }
    for (let m of messages) {
      const scope = createDeep(root, m.package.split('.'));
      scope.messages.push(m);
    }
    for (let s of services) {
      const scope = createDeep(root, s.package.split('.'));
      scope.services.push(s);
    }

    return root;
  };
}
