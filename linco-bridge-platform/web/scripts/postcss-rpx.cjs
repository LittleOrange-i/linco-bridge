/**
 * PostCSS plugin: compile UniApp rpx units to viewport units (750 design width).
 * 1rpx = 100vw / 750, emitted as calc() so it stays exact at any viewport width.
 */
const RPX_RE = /(-?\d*\.?\d+)rpx/g

function compileRpxPlugin() {
  return {
    postcssPlugin: 'postcss-rpx',
    Declaration(decl) {
      if (!decl.value.includes('rpx')) return
      decl.value = decl.value.replace(RPX_RE, (_, num) => `calc(${num} * 100vw / 750)`)
    },
    AtRule(atRule) {
      if (atRule.params && atRule.params.includes('rpx')) {
        atRule.params = atRule.params.replace(RPX_RE, (_, num) => `calc(${num} * 100vw / 750)`)
      }
    },
  }
}

compileRpxPlugin.postcss = true
module.exports = compileRpxPlugin
