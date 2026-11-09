/**
 * 样式守卫：组件样式必须通过设计 token 取值（见 src/styles/_tokens.scss）。
 * 颜色、圆角、字体、间距写字面量会报错；token 文件本身不受限制。
 *
 * @type {import('stylelint').Config}
 */
export default {
  extends: ['stylelint-config-standard-scss'],
  rules: {
    // ---- 设计 token 约束 ----
    'color-no-hex': [true, { message: '请使用 t.color(...) 而不是十六进制颜色' }],
    'color-named': ['never', { message: '请使用 t.color(...) 而不是颜色关键字' }],
    'function-disallowed-list': [
      ['rgb', 'rgba', 'hsl', 'hsla', 'hwb', 'lab', 'lch', 'oklab', 'oklch'],
      { message: '请使用 t.color(...) / t.alpha(...) 而不是颜色函数' },
    ],
    'declaration-property-value-disallowed-list': [
      {
        // 只允许 t.radius(...)，以及 inherit 等关键字
        '/^border(-.+)?-radius$/': ['/\\d/'],
        // 字体相关只能通过 @include t.type(...)
        '/^font(-size|-family|-weight)?$/': ['/^(?!inherit$).+/'],
        'line-height': ['/\\d/'],
        'letter-spacing': ['/\\d/'],
        'box-shadow': ['/^(?!none$|var\\(|t\\.).+/'],
      },
      { message: (prop) => `\`${prop}\` 请使用设计 token（t.radius / t.type / t.elevation）` },
    ],
    'declaration-property-unit-disallowed-list': [
      {
        '/^(margin|padding|gap|row-gap|column-gap)(-.+)?$/': ['px', 'rem', 'em'],
        '/^(top|right|bottom|left|inset)$/': ['rem', 'em'],
      },
      { message: (prop) => `\`${prop}\` 请使用 t.space(...)` },
    ],

    // ---- 与项目约定相适配 ----
    // token 通过 additionalData 注入，命名空间 t 不在文件内声明；
    // 写错的 t.xxx() 会在 Sass 编译期直接报错，无需 lint 检查
    'scss/function-no-unknown': null,
    // 允许 .tone-primary / .add-icon 等 kebab-case 类名
    'selector-class-pattern': [
      '^[a-z][a-z0-9]*(-[a-z0-9]+)*$',
      { message: '类名使用 kebab-case（TS 中以 camelCase 引用）' },
    ],
  },
  overrides: [
    {
      files: ['src/styles/**/*.scss'],
      rules: {
        'color-no-hex': null,
        'color-named': null,
        'function-disallowed-list': null,
        'declaration-property-value-disallowed-list': null,
        'declaration-property-unit-disallowed-list': null,
        // token map 之间习惯空一行
        'scss/dollar-variable-empty-line-before': null,
      },
    },
  ],
}
