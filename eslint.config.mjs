import js from "@eslint/js";
import html from "eslint-plugin-html";

const noSpaceInfix = {
    meta: { type: "layout", fixable: "whitespace", schema: [] },
    create(context) {
        const operatorsToCheck = new Set(["=", "==", "===", "!=", "&&", "||"]);

        const checkOperator = (node, left, right) => {
            const sourceCode = context.getSourceCode?.();
            if (!sourceCode) return;

            // get all tokens between left and right
            const tokens = sourceCode.getTokensBetween(left, right);

            tokens.forEach(operatorToken => {
                if (!operatorsToCheck.has(operatorToken.value)) return;

                const before = sourceCode.getTokenBefore(operatorToken);
                const after = sourceCode.getTokenAfter(operatorToken);

                const textBefore = sourceCode.text.slice(before.range[1], operatorToken.range[0]);
                const textAfter = sourceCode.text.slice(operatorToken.range[1], after.range[0]);

                if (/\s/.test(textBefore) || /\s/.test(textAfter)) {
                    context.report({
                        node,
                        message: `Operator '${operatorToken.value}' must not have spaces around it.`,
                        fix(fixer) {
                            return fixer.replaceTextRange([before.range[1], after.range[0]], operatorToken.value);
                        }
                    });
                }
            });
        };

        return {
            BinaryExpression(node) { checkOperator(node, node.left, node.right); },
            AssignmentExpression(node) { checkOperator(node, node.left, node.right); },
            LogicalExpression(node) { checkOperator(node, node.left, node.right); }
        };
    }
};

export default [
    js.configs.recommended,
    {
        plugins: {
            html,
            local: { rules: { "no-space-infix": noSpaceInfix } }
        }
    },
    {
        files: ["**/*.js", "**/*.html"],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "script",
            globals: {
                window: "readonly",
                document: "readonly",
                console: "readonly",
                setTimeout: "readonly",
                clearTimeout: "readonly",
                localStorage: "readonly",
                CodeMirror: "readonly",
                Quill: "readonly",
                HTMLIFrameElement: "readonly",
                tailwind: "readonly",
                Blob: "readonly",
                URL: "readonly",
                FileReader: "readonly"
            }
        },
        rules: {
            "space-infix-ops": "off",
            "local/no-space-infix": "warn",
            "arrow-spacing": ["warn", { before: false, after: false }],
            "space-before-blocks": ["warn", "never"],
            "space-before-function-paren": ["warn", "never"],
            "space-in-parens": ["warn", "never"],
            "object-curly-spacing": ["warn", "never"],
            "comma-spacing": ["warn", { before: false, after: false }],
            "space-unary-ops": ["warn", { words: true, nonwords: false }],
            "keyword-spacing": ["warn", {
                before: false,
                after: true, // keeps `case 1:` spacing
                overrides: {
                    return: { after: false },
                    throw: { after: false },
                    if: { after: false },
                    for: { after: false },
                    while: { after: false },
                    switch: { after: false }
                }
            }]
        }
    }
];
