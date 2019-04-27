import { BasicVisitor, Visit, VisitorWithFinalize } from './traverse';

function aggregateIterator<T>(it: Iterator<T>): T[] {
  const agg: T[] = [];

  while (true) {
    const { done, value } = it.next();
    if (done) {
      break;
    }
    agg.push(value);
  }

  return agg;
}

export function stringVisitor(
  visitor: BasicVisitor<string | Iterator<string | string[]> | undefined>
): () => VisitorWithFinalize<string, string> {
  return function() {
    let buffer: string[];

    function appendToBuffer(value: string | Iterator<string | string[]>) {
      if (value) {
        if (typeof value === 'string') {
          buffer.push(value);
        } else {
          for (let v of aggregateIterator(value)) {
            if (Array.isArray(v)) {
              buffer.push(...v);
            } else {
              buffer.push(v);
            }
          }
        }
      }
    }

    return {
      init() {
        buffer = [];
      },
      finalize() {
        return buffer.join(' ');
      },
      ...Object.entries(visitor as { [k: string]: Visit<any, string | IterableIterator<string | string[]>> }).reduce(
        (agg, [key, value]) => {
          if (typeof value === 'function') {
            agg[key] = path => appendToBuffer(value(path));
          } else {
            agg[key] = {};
            if (value.enter) {
              agg[key].enter = path => appendToBuffer(value.enter(path));
            }
            if (value.exit) {
              agg[key].exit = path => appendToBuffer(value.exit(path));
            }
          }
          return agg;
        },
        {}
      )
    };
  };
}
