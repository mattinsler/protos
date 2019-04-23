import {
  BasicField,
  ProtoSpec,
  Type,
  isBasicField,
  isOneOfField,
  isBasicType,
  isEnumType,
  isMapType,
  isMessageType
} from '@protos/core';

function relativeTypeName(name: string, ...packageNames: string[]) {
  for (let packageName of packageNames) {
    if (name.startsWith(`${packageName}.`)) {
      const localName = name.slice(packageName.length + 1);
      if (localName.indexOf('.') === -1) {
        return localName;
      }
    }
  }
  return name;
}

function typeName(type: Type, ...packageNames: string[]) {
  if (isBasicType(type)) {
    return type.basic;
  } else if (isEnumType(type)) {
    return relativeTypeName(type.enum, ...packageNames);
  } else if (isMapType(type)) {
    // this method doesn't take map types
    throw new Error(`Cannot handle nested map types`);
  } else if (isMessageType(type)) {
    return relativeTypeName(type.message, ...packageNames);
  }

  throw new Error('never');
}

export function createJson({ enums, messages, services }: ProtoSpec) {
  const packageDefinition = { nested: {} };

  function getPackage(packageName: string) {
    let current = packageDefinition.nested;

    for (let key of packageName.split('.')) {
      if (!current[key]) {
        current[key] = {};
      }

      if (!current[key].nested) {
        current[key].nested = {};
      }

      current = current[key].nested;
    }

    return current;
  }

  for (let message of messages) {
    const pkg = getPackage(message.package);
    pkg[message.name] = {};

    const oneofs = message.fields.filter(isOneOfField);
    const fields: BasicField[] = [
      ...message.fields.filter(isBasicField),
      ...oneofs.reduce((arr, o) => [...arr, ...o.oneof], [])
    ];

    if (oneofs.length > 0) {
      pkg[message.name].oneofs = oneofs.reduce((o, f) => {
        o[f.name] = {
          oneof: f.oneof.map(oneof => oneof.name)
        };
        return o;
      }, {});
    }

    if (fields.length > 0) {
      pkg[message.name].fields = fields.reduce((o, f) => {
        if (isMapType(f.type)) {
          o[f.name] = {
            keyType: typeName(f.type.map.keyType, message.fullname, message.package),
            type: typeName(f.type.map.valueType, message.fullname, message.package),
            id: f.number
          };
        } else {
          o[f.name] = {
            type: typeName(f.type, message.fullname, message.package),
            id: f.number
          };
        }

        f.repeated && (o[f.name].rule = 'repeated');

        return o;
      }, {});
    }
  }

  for (let e of enums) {
    const pkg = getPackage(e.package);
    pkg[e.name] = {
      values: e.values.reduce((o, v) => {
        o[v.name] = v.value;
        return o;
      }, {})
    };
  }

  for (let service of services) {
    const pkg = getPackage(service.package);
    pkg[service.name] = {
      methods: service.methods.reduce((o, m) => {
        o[m.name] = {
          requestType: relativeTypeName(m.request.message, service.package),
          responseType: relativeTypeName(m.response.message, service.package)
        };

        if (m.request.stream) {
          o[m.name].requestStream = true;
        }
        if (m.response.stream) {
          o[m.name].responseStream = true;
        }

        return o;
      }, {})
    };
  }

  return packageDefinition;
}
