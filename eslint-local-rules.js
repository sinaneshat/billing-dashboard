/**
 * Custom ESLint Rules for Cloudflare D1 Batch-First Architecture
 *
 * These rules enforce Cloudflare D1 best practices by prohibiting traditional
 * transaction patterns and encouraging batch operations instead.
 *
 * Why batch over transactions?
 * - Cloudflare D1 has limitations with traditional transactions
 * - Batches are atomic and optimized for serverless environments
 * - Better performance and reliability in edge compute
 */

const rules = {
  /**
   * Prohibit db.transaction() usage - enforce batch operations instead
   *
   * @type {import('eslint').Rule.RuleModule}
   */
  'no-db-transactions': {
    meta: {
      type: 'problem',
      docs: {
        description:
          'Prohibit db.transaction() usage in favor of db.batch() for Cloudflare D1 compatibility',
        category: 'Best Practices',
        recommended: true,
        url: 'https://developers.cloudflare.com/d1/build-with-d1/d1-client-api/#batch-statements',
      },
      messages: {
        noTransaction:
          'db.transaction() is prohibited with Cloudflare D1. Use db.batch() instead for atomic operations. See docs/backend-patterns.md for batch patterns.',
        noNestedTransaction:
          'Nested transactions are not supported in Cloudflare D1. Use db.batch() for atomic multi-operation updates.',
      },
      schema: [],
      fixable: null,
    },

    create(context) {
      return {
        // Detect: db.transaction(...)
        CallExpression(node) {
          // Check if it's a .transaction() call
          if (
            node.callee.type === 'MemberExpression'
            && node.callee.property.type === 'Identifier'
            && node.callee.property.name === 'transaction'
          ) {
            // Check if the object is 'db' or looks like a database instance
            const objectName = node.callee.object.name;
            if (
              objectName === 'db'
              || objectName === 'database'
              || objectName === 'tx'
              || objectName === 'trx'
            ) {
              context.report({
                node,
                messageId: 'noTransaction',
                data: {
                  method: 'transaction',
                },
              });
            }
          }
        },

        // Detect: import { transaction } from 'drizzle-orm'
        ImportDeclaration(node) {
          if (node.source.value === 'drizzle-orm' || node.source.value.includes('drizzle')) {
            node.specifiers.forEach((specifier) => {
              if (
                specifier.type === 'ImportSpecifier'
                && specifier.imported.name === 'transaction'
              ) {
                context.report({
                  node: specifier,
                  message:
                    'Importing transaction utilities from Drizzle ORM is prohibited. Use db.batch() for Cloudflare D1.',
                });
              }
            });
          }
        },
      };
    },
  },

  /**
   * Enforce usage of createHandlerWithBatch for handlers that need database operations
   *
   * @type {import('eslint').Rule.RuleModule}
   */
  'prefer-batch-handler': {
    meta: {
      type: 'suggestion',
      docs: {
        description:
          'Encourage using createHandlerWithBatch when handlers need atomic database operations',
        category: 'Best Practices',
        recommended: true,
      },
      messages: {
        preferBatchHandler:
          'Consider using createHandlerWithBatch if this handler performs multiple database operations. It provides a batch context for atomic operations.',
      },
      schema: [],
    },

    create() {
      return {
        // Detect handlers with multiple db operations
        // Note: This rule is currently a placeholder for future implementation
        // A full implementation would require proper AST traversal to count
        // db.insert, db.update, db.delete calls and suggest createHandlerWithBatch
        // when multiple operations are detected
      };
    },
  },

  /**
   * Warn about using getDbAsync without proper batch context
   *
   * @type {import('eslint').Rule.RuleModule}
   */
  'batch-context-awareness': {
    meta: {
      type: 'suggestion',
      docs: {
        description:
          'Warn when getDbAsync is used in batch handlers instead of using the provided batch.db',
        category: 'Best Practices',
        recommended: true,
      },
      messages: {
        useBatchDb:
          'In createHandlerWithBatch, use batch.db instead of getDbAsync() to leverage automatic batch operations.',
      },
      schema: [],
    },

    create(context) {
      let isInBatchHandler = false;

      return {
        VariableDeclarator(node) {
          if (
            node.init
            && node.init.type === 'CallExpression'
            && node.init.callee.name === 'createHandlerWithBatch'
          ) {
            isInBatchHandler = true;
          }
        },

        CallExpression(node) {
          if (
            isInBatchHandler
            && node.callee.type === 'Identifier'
            && node.callee.name === 'getDbAsync'
          ) {
            context.report({
              node,
              messageId: 'useBatchDb',
            });
          }
        },

        'VariableDeclarator:exit': function (node) {
          if (
            node.init
            && node.init.type === 'CallExpression'
            && node.init.callee.name === 'createHandlerWithBatch'
          ) {
            isInBatchHandler = false;
          }
        },
      };
    },
  },
};

// Export as ESLint plugin
export default {
  rules,
};
