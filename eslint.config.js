import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
import { FlatCompat } from '@eslint/eslintrc'

const compat = new FlatCompat({
    baseDirectory: dirname(fileURLToPath(import.meta.url))
})

export default [
    {
        ignores: [
            'dist/*',
            'public/*',
            'test/*.js',
            '**/lib.es5.d.ts'
        ]
    },
    ...compat.config({
        parser: '@typescript-eslint/parser',
        parserOptions: {
            requireConfigFile: false
        },
        extends: [
            'standard',
            'plugin:@typescript-eslint/recommended'
        ],
        plugins: [
            '@typescript-eslint'
        ],
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_'
                }
            ],
            'operator-linebreak': ['off'],
            'multiline-ternary': 'off',
            'no-multiple-empty-lines': [
                'error',
                {
                    max: 1,
                    maxEOF: 1
                }
            ],
            'no-undef': 'off',
            indent: ['error', 4, {
                SwitchCase: 1,
                ignoredNodes: ['TemplateLiteral *']
            }],
            'comma-dangle': 'off',
            'no-multi-spaces': ['error', { ignoreEOLComments: true }]
        }
    })
]
