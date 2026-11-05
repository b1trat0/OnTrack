import config from '../../packages/eslint-config-turbotron/web.eslint.mjs'

export default [
  { ignores: ['dist'] },
  ...config,
]