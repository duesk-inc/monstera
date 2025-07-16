/**
 * ハードコーディング防止のためのESLintルール
 */

module.exports = {
  rules: {
    // マジックナンバーの禁止
    'no-magic-numbers': ['warn', {
      ignore: [
        // 一般的に許容される値
        -1, 0, 1, 2,
        // HTTPステータスコード（定数化済み）
        200, 201, 204, 400, 401, 403, 404, 500,
        // パーセンテージ
        100,
        // ビット演算
        4, 8, 16, 32, 64, 128, 256, 512, 1024,
        // 時間関連（ミリ秒）
        1000, 60, 24, 7, 30, 365,
      ],
      ignoreArrayIndexes: true,
      enforceConst: true,
      detectObjects: false,
      ignoreDefaultValues: true,
    }],

    // カスタムルール: ハードコードされたピクセル値
    'no-restricted-syntax': [
      'warn',
      {
        selector: 'Literal[value=/^\\d+px$/]',
        message: 'ハードコードされたピクセル値は使用しないでください。dimensions定数を使用してください。',
      },
      {
        selector: 'TemplateLiteral[quasis.0.value.raw=/\\d+px/]',
        message: 'ハードコードされたピクセル値は使用しないでください。dimensions定数を使用してください。',
      },
      {
        selector: 'MemberExpression[property.name="fontSize"][parent.right.type="Literal"]',
        message: 'fontSizeの直接指定は避けてください。typography定数を使用してください。',
      },
      {
        selector: 'MemberExpression[property.name="fontWeight"][parent.right.type="Literal"]',
        message: 'fontWeightの直接指定は避けてください。typography定数を使用してください。',
      },
      {
        selector: 'Property[key.name="width"][value.type="Literal"][value.value=/^\\d+$/]',
        message: 'widthの数値直接指定は避けてください。dimensions定数を使用してください。',
      },
      {
        selector: 'Property[key.name="height"][value.type="Literal"][value.value=/^\\d+$/]',
        message: 'heightの数値直接指定は避けてください。dimensions定数を使用してください。',
      },
      {
        selector: 'Property[key.name="borderRadius"][value.type="Literal"][value.value=/^\\d+$/]',
        message: 'borderRadiusの数値直接指定は避けてください。dimensions定数を使用してください。',
      },
      {
        selector: 'CallExpression[callee.name="setTimeout"][arguments.1.type="Literal"]',
        message: 'setTimeoutの遅延値は定数を使用してください。delays定数を使用してください。',
      },
      {
        selector: 'CallExpression[callee.name="setInterval"][arguments.1.type="Literal"]',
        message: 'setIntervalの間隔値は定数を使用してください。delays定数を使用してください。',
      },
    ],

    // プロジェクト固有のルール
    '@typescript-eslint/no-magic-numbers': ['warn', {
      ignore: [-1, 0, 1, 2],
      ignoreArrayIndexes: true,
      ignoreEnums: true,
      ignoreNumericLiteralTypes: true,
      ignoreReadonlyClassProperties: true,
      ignoreTypeIndexes: true,
    }],
  },

  overrides: [
    {
      // テストファイルでは緩和
      files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
      rules: {
        'no-magic-numbers': 'off',
        '@typescript-eslint/no-magic-numbers': 'off',
      },
    },
    {
      // 設定ファイルでは緩和
      files: ['*.config.js', '*.config.ts', 'constants/**/*.ts'],
      rules: {
        'no-magic-numbers': 'off',
        '@typescript-eslint/no-magic-numbers': 'off',
      },
    },
    {
      // Storybookファイルでは緩和
      files: ['**/*.stories.tsx'],
      rules: {
        'no-magic-numbers': 'off',
        '@typescript-eslint/no-magic-numbers': 'off',
      },
    },
  ],
};