import { readFile, writeFile } from 'node:fs/promises'
const source = await readFile('public/_headers','utf8')
const headers = Object.fromEntries(source.split('\n').filter(line=>/^\s+\S.*:/.test(line)).map(line=>{
 const separator=line.indexOf(':');return [line.slice(0,separator).trim(),line.slice(separator+1).trim()]
}))
await writeFile('dist-ssr/security-headers.json',JSON.stringify(headers))
