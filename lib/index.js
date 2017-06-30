'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

exports.default = function (_ref) {
  var t = _ref.types;

  var constructorVisitor = {
    ClassMethod: function ClassMethod(path, state) {
      if (path.node.kind === 'constructor') {
        path.container.forEach(function (node, idx) {
          if (t.isClassMethod(node) && node !== path.node) {
            var _node$key$name$split = node.key.name.split(/[A-Z0-9]/),
                _node$key$name$split2 = _slicedToArray(_node$key$name$split, 1),
                keyPrefix = _node$key$name$split2[0];

            if (BIND_PREFIXES.indexOf(keyPrefix) > -1) {
              if (node.leadingComments) {
                var ignored = null;
                node.leadingComments.some(function (comment) {
                  if (comment.value.indexOf(IGNORE_PREFIX) > -1) {
                    ignored = comment;
                    return true;
                  }
                  return false;
                });
                if (ignored) {
                  node.leadingComments = (0, _without2.default)(node.leadingComments, ignored);
                  node.start -= 1;
                  if (idx > 0) {
                    path.container[idx - 1].trailingComments = (0, _without2.default)(path.container[idx - 1].trailingComments, ignored);
                  }
                  return;
                }
              }
              path.get('body').pushContainer('body', t.expressionStatement(t.assignmentExpression('=', t.memberExpression(t.thisExpression(), t.identifier(node.key.name)), t.callExpression(t.memberExpression(t.memberExpression(t.thisExpression(), t.identifier(node.key.name), false), t.identifier('bind'), false), [t.thisExpression()]))));
            }
          }
        });
        state.visited = true;
      }
    }
  };

  return {
    visitor: {
      ClassDeclaration: function ClassDeclaration(path, _ref2) {
        var file = _ref2.file;

        if (file.get('toBind').has(path.node.id.name) || file.get('toBind').has('*')) {
          var state = { visited: false };
          path.traverse(constructorVisitor, state);
          if (!state.visited) {
            var constructorBlock = [];
            if (path.node.superClass) {
              constructorBlock.push(t.expressionStatement(t.callExpression(t.identifier('super'), [t.identifier('...arguments')])));
            }
            path.get('body').unshiftContainer('body', t.classMethod('constructor', t.identifier('constructor'), [], t.blockStatement(constructorBlock)));
            path.traverse(constructorVisitor, state);
          }
        }
      },

      Program: {
        enter: function enter(path, _ref3) {
          var file = _ref3.file;
          var directives = path.node.directives;

          if (directives) {
            var toBind = new Set();
            file.set('toBind', toBind);
            directives = directives.filter(function (d) {
              return d.value.value.startsWith(PREFIX);
            });
            directives.forEach(function (d) {
              path.node.directives = (0, _without2.default)(path.node.directives, d);

              var _d$value$value$split = d.value.value.split(' '),
                  _d$value$value$split2 = _slicedToArray(_d$value$value$split, 2),
                  _d$value$value$split3 = _d$value$value$split2[1],
                  components = _d$value$value$split3 === undefined ? '*' : _d$value$value$split3;

              components.split(',').forEach(function (c) {
                return toBind.add(c);
              });
            });
          }
        }
      }
    }
  };
};

var _without = require('lodash/without');

var _without2 = _interopRequireDefault(_without);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var PREFIX = '@autobind ';
var IGNORE_PREFIX = '@autobind-ignore';
var BIND_PREFIXES = ['on', 'handle', '_on', '_handle'];