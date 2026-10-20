// Token enforcement (design-system §2, ADR-0013): visual values come from src/ui/tokens.css only.
/** @type {import('stylelint').Config} */
export default {
  extends: ['stylelint-config-standard'],
  rules: {
    'import-notation': 'string',
    'color-no-hex': true,
    'color-named': 'never',
    'function-disallowed-list': ['rgb', 'rgba', 'hsl', 'hsla', 'hwb', 'lab', 'lch', 'oklab', 'oklch'],
    'declaration-property-unit-disallowed-list': {
      '/^(margin|padding|gap|row-gap|column-gap|inset)/': ['px', 'rem', 'em'],
      '/^border(-.*)?-radius$/': ['px', 'rem', 'em'],
      'font-size': ['px', 'rem', 'em'],
      'box-shadow': ['px'],
      // Durations come from the motion tokens only (design-system §2), in modules and in module custom properties.
      '/^(transition|animation)/': ['ms', 's'],
      '/^--/': ['ms', 's'],
    },
    'selector-class-pattern': '^[a-z][a-zA-Z0-9]*$',
    'property-disallowed-list': ['margin-left', 'margin-right', 'padding-left', 'padding-right', 'left', 'right'],
  },
  overrides: [
    {
      files: ['src/ui/tokens.css'],
      rules: {
        'color-no-hex': null,
        'function-disallowed-list': null,
        'declaration-property-unit-disallowed-list': null,
      },
    },
  ],
}
