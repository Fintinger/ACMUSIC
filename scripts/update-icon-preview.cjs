const fs = require('fs'), path = require('path'), vm = require('vm')
const root = path.resolve(__dirname, '..')
const icons = vm.runInNewContext(fs.readFileSync(path.join(root, 'src/config/icon.js'), 'utf8').replace('export default', 'const icons =') + ';icons')
const entries = Object.entries(icons), rows = Math.ceil(entries.length / 8)
const height = 112 + rows * 92
const escape = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="${height}" viewBox="0 0 960 ${height}"><rect width="960" height="${height}" rx="24" fill="#202633"/><text x="32" y="43" font-family="system-ui" font-size="22" fill="#edf1f7">ACMUSIC · SVG ICONS / V1</text><text x="32" y="70" font-family="system-ui" font-size="13" fill="#b0b9c8">24px grid · 1.8px rounded strokes · currentColor</text>`
entries.forEach(([name, icon], index) => {
  if (icon.type !== 'svg' || !icon.path) throw Error('Non-SVG icon: ' + name)
  const x=32+(index%8)*114, y=96+Math.floor(index/8)*92
  svg += `<rect x="${x}" y="${y}" width="104" height="80" rx="12" fill="#29313e"/><g transform="translate(${x+40},${y+14})" color="${name==='likeFill'?'#e5484d':'#edf1f7'}"><path d="${escape(icon.path)}" fill="${icon.fill||'none'}" stroke="${icon.stroke||'currentColor'}" stroke-width="${icon.stroke==='none'?0:1.8}" stroke-linecap="round" stroke-linejoin="round"/></g><text x="${x+52}" y="${y+62}" text-anchor="middle" font-family="system-ui" font-size="11" fill="#c1c9d6">${name}</text>`
})
svg += '</svg>'
fs.mkdirSync(path.join(root,'docs/qa'),{recursive:true})
fs.writeFileSync(path.join(root,'docs/qa/ICON_PREVIEW-V1.svg'),svg)
console.log(`${entries.length} SVG icons; preview regenerated`)
