module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
    jest: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: [
    '@typescript-eslint',
  ],
  rules: {
    'no-console': 'warn',
    'no-unused-vars': 'off',
  },
  overrides: [
    {
      files: ['src/features/youtube/**/*.ts'],
      rules: {
        'no-restricted-syntax': ['error',
          "ImportDeclaration[importKind='value'][source.value=/^\\.\\.\\/video-library\\/(?!types$).+/]",
        ],
      },
    },
    {
      files: ['src/features/video-library/**/*.ts'],
      rules: {
        'no-restricted-syntax': ['error',
          "ImportDeclaration[importKind='value'][source.value=/^\\.\\.\\/youtube\\/(?!types$).+/]",
        ],
      },
    },
  ],
  ignorePatterns: [
    'dist/',
    'node_modules/',
    '*.js',
    '*.d.ts'
  ],
};
