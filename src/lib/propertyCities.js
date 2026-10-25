const known={'barcelona':'barcelona','costa brava':'costa-brava','portugal':'portugal','brasil':'brasil','brazil':'brasil'}
export function capitalizeCity(value='') { return value.replace(/\S/u, letter=>letter.toLocaleUpperCase()) }
export function normalizeCity(value='') {
 const name=value.trim().replace(/\s+/g,' ')
 return known[name.toLowerCase()] || capitalizeCity(name)
}
export function cityKey(value='') {return normalizeCity(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}
export function cityOptions(properties,label) {
 const cities=new Map()
 for(const p of properties){const value=normalizeCity(p.destination);if(value && !cities.has(cityKey(value)))cities.set(cityKey(value),{value,label:label(value)})}
 return [...cities.values()].sort((a,b)=>a.label.localeCompare(b.label))
}
