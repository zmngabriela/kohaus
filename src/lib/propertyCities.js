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
 if(properties.some(p=>matchesDestination(p,'costa-brava')) && !cities.has('costa-brava')) cities.set('costa-brava',{value:'costa-brava',label:label('costa-brava')})
 return [...cities.values()].sort((a,b)=>a.label.localeCompare(b.label))
}

// Regional search only; does not rewrite the stored municipality or destination.
// Municipalities: https://www.ddgi.cat/xifra/entorn/municipis2.asp?IdMenu=03010103&amb=3
const regionKey = value => cityKey(value).replace(/[’']/g, '').replace(/[-\s]+/g, ' ').trim()
const costaBravaPlaces = new Set([
 'L’Armentera', 'Begur', 'Blanes', 'Cadaqués', 'Calonge', 'Calonge i Sant Antoni',
 'Castelló d’Empúries', 'Castelló d’Empúries (Empuriabrava)', 'Empuriabrava',
 'Castell-Platja d’Aro', 'Platja d’Aro', 'Playa de Aro', 'S’Agaró', 'Colera',
 'L’Escala', 'Llançà', 'Lloret de Mar', 'Mont-ras', 'Palafrugell', 'Palamós',
 'Palamós i Sant Joan', 'Palau-saverdera', 'Pals', 'Portbou', 'El Port de la Selva',
 'Port de la Selva', 'Regencós', 'Roses', 'Rosas', 'Sant Feliu de Guíxols',
 'Sant Pere Pescador', 'Santa Cristina d’Aro', 'La Selva de Mar', 'Selva de Mar',
 'Torroella de Montgrí', 'Tossa de Mar', 'Vall-llobrega',
 'Calella de Palafrugell', 'Llafranc', 'Tamariu', 'L’Estartit', 'Sant Antoni de Calonge',
].map(regionKey))
export function matchesDestination(property, destination) {
 if (['todos', 'all'].includes(destination)) return true
 const places = [property.destination, property.portalData?.municipality, property.portal_data?.municipality].filter(Boolean)
 if (regionKey(destination) !== 'costa brava') return places.some(place => cityKey(place) === cityKey(destination))
 const country = String(property.country || '').trim().toLowerCase()
 if (country && !['es','españa','espana','spain','espanha'].includes(country)) return false
 return places.some(place => regionKey(place) === 'costa brava' || costaBravaPlaces.has(regionKey(place)))
}
