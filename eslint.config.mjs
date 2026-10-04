import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Paths are relative to this config file (the repo root), not ESLint's cwd,
// so editors and `npx eslint` run from a subfolder agree with `npm run lint`
const repoRoot = path.dirname(fileURLToPath(import.meta.url));

// ESLint 10 workaround: eslint-plugin-react 7.37 crashes when it auto-detects
// the React version (it calls context.getFilename(), removed in ESLint 10).
// Remove once eslint-config-next ships a fixed plugin (vercel/next.js#89764,
// jsx-eslint/eslint-plugin-react#3977).
const { version: reactVersion } = createRequire(import.meta.url)(
  "react/package.json",
);

// A bare path comment such as `// src/lib/twitch.ts`
const PATH_COMMENT = /^src\/\S+$/;

// Every src/ file names itself in a `// src/...` comment before its first
// statement or directive (AGENTS.md convention). The fix also drops stale
// path headers (a renamed or moved file) and misplaced ones (after
// "use client"), so a file never ends up with two.
const fileHeader = {
  meta: {
    type: "suggestion",
    fixable: "code",
    messages: { missing: "Start the file with `// {{expected}}`." },
    schema: [],
  },
  create(context) {
    return {
      Program(node) {
        const expected = path
          .relative(repoRoot, context.filename)
          .split(path.sep)
          .join("/");
        const { sourceCode } = context;
        const { text } = sourceCode;
        // Header area: up to the first statement that isn't a directive
        const firstStatement = node.body.find((statement) => !statement.directive);
        const areaEnd = firstStatement ? firstStatement.range[0] : text.length;
        const firstToken = sourceCode.ast.tokens[0];
        const pathComments = sourceCode
          .getAllComments()
          .filter(
            (comment) =>
              comment.type === "Line" &&
              comment.range[1] <= areaEnd &&
              PATH_COMMENT.test(comment.value.trim()),
          );
        const [header] = pathComments;
        if (
          pathComments.length === 1 &&
          header.value.trim() === expected &&
          (!firstToken || header.range[1] <= firstToken.range[0])
        ) {
          return;
        }
        context.report({
          node,
          loc: { line: 1, column: 0 },
          messageId: "missing",
          data: { expected },
          fix: (fixer) => [
            ...pathComments.map((comment) => {
              const after = comment.range[1];
              const lineEnd = text.startsWith("\r\n", after)
                ? after + 2
                : text[after] === "\n"
                  ? after + 1
                  : after;
              return fixer.removeRange([comment.range[0], lineEnd]);
            }),
            fixer.insertTextBeforeRange([0, 0], `// ${expected}\n`),
          ],
        });
      },
    };
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  { settings: { react: { version: reactVersion } } },
  {
    // The rules in AGENTS.md, enforced instead of remembered
    files: ["src/**/*.{ts,tsx}"],
    plugins: { local: { rules: { "file-header": fileHeader } } },
    rules: {
      "local/file-header": "error",
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "framer-motion",
              message: 'Use "motion/react" and import { m as motion }.',
            },
            {
              name: "motion/react",
              importNames: ["motion"],
              message:
                "Import { m as motion }: the full motion component throws under LazyMotion strict.",
            },
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          // Named imports and React.useX (no-restricted-imports would also
          // flag every `import * as React`)
          selector:
            "ImportDeclaration[source.value='react'] > ImportSpecifier[imported.name=/^(useCallback|useMemo)$/]",
          message: "React Compiler memoizes; don't add useCallback/useMemo.",
        },
        {
          selector:
            "MemberExpression[object.name='React'][property.name=/^(useCallback|useMemo)$/]",
          message: "React Compiler memoizes; don't add useCallback/useMemo.",
        },
        {
          selector:
            "CallExpression[callee.object.name='logger'][callee.property.name='error'][arguments.0.type=/^(Literal|TemplateLiteral)$/]",
          message:
            "Pass the Error first: logger.error(err, { tags }). Messages go to logger.warn/info.",
        },
        {
          selector: "Literal[value=/\\bbg-gradient-to-/]",
          message: "Tailwind v4 renamed bg-gradient-to-* to bg-linear-to-*.",
        },
        {
          selector: "TemplateElement[value.raw=/\\bbg-gradient-to-/]",
          message: "Tailwind v4 renamed bg-gradient-to-* to bg-linear-to-*.",
        },
        {
          // href="…", href={"…"} and href={`…`}
          selector:
            "JSXAttribute[name.name='href'] > Literal[value=/^(https?:|mailto:)/], JSXAttribute[name.name='href'] > JSXExpressionContainer > Literal[value=/^(https?:|mailto:)/], JSXAttribute[name.name='href'] > JSXExpressionContainer > TemplateLiteral > TemplateElement:first-child[value.raw=/^(https?:|mailto:)/]",
          message:
            "No hardcoded URLs in components: add the destination to src/config/links.ts.",
        },
        {
          // The full convention, for every target="_blank" link (relative
          // /go hrefs included, which react/jsx-no-target-blank skips)
          selector:
            "JSXOpeningElement:has(> JSXAttribute[name.name='target'][value.value='_blank']):not(:has(> JSXAttribute[name.name='rel'][value.value=/\\bnoopener\\b/][value.value=/\\bnoreferrer\\b/]))",
          message: 'target="_blank" needs rel="noopener noreferrer".',
        },
      ],
      // Also covers forms, spreads and dynamic rel values
      "react/jsx-no-target-blank": [
        "error",
        { allowReferrer: false, enforceDynamicLinks: "always" },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
