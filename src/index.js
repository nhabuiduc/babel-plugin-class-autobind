import without from 'lodash/array/without';

const PREFIX = 'cb-class-autobind ';
const BIND_PREFIXES = ['on', 'handle', '_on', '_handle'];

export default function ({ types: t }) {
  const constructorVisitor = {
    ClassMethod(path, state) {
      if (path.node.kind === 'constructor') {
        path.container.forEach(node => {
          if (t.isClassMethod(node) && node !== path.node) {
            const [keyPrefix] = node.key.name.split(/[A-Z0-9]/);
            if (~BIND_PREFIXES.indexOf(keyPrefix)) {
              path.get('body').pushContainer('body', t.expressionStatement(
                t.assignmentExpression('=',
                  t.memberExpression(t.thisExpression(), t.identifier(node.key.name)),
                  t.callExpression(t.memberExpression(
                    t.memberExpression(
                      t.thisExpression(),
                      t.identifier(node.key.name),
                      false
                    ),
                    t.identifier('bind'),
                    false
                  ), [
                    t.thisExpression(),
                  ])
                )
              ));
            }
          }
        });
        state.visited = true;
      }
    },
  };

  return {
    visitor: {
      ClassDeclaration(path, { file }) {
        if (file.get('toBind').has(path.node.id.name) || file.get('toBind').has('*')) {
          const state = { visited: false };
          path.traverse(constructorVisitor, state);
          if (!state.visited) {
            const constructorBlock = [];
            if (path.node.superClass) {
              constructorBlock.push(
                t.expressionStatement(
                  t.callExpression(
                    t.identifier('super'),
                    [
                      t.identifier('...arguments'),
                    ]
                  )
                )
              );
            }
            path.get('body').unshiftContainer('body', t.classMethod(
              'constructor',
              t.identifier('constructor'),
              [],
              t.blockStatement(constructorBlock)
            ));
            path.traverse(constructorVisitor, state);
          }
        }
      },
      Program: {
        enter(path, { file }) {
          let { node: { directives } } = path;
          if (directives) {
            const toBind = new Set();
            file.set('toBind', toBind);
            directives = directives.filter(d => d.value.value.startsWith(PREFIX));
            directives.forEach(d => {
              path.node.directives = without(path.node.directives, d);
              const [/* prefix */, components = '*'] = d.value.value.split(' ');
              components
                .split(',')
                .forEach(c => toBind.add(c));
            });
          }
        },
      },
    },
  };
}