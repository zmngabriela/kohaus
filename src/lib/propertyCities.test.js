import {expect,it} from 'vitest'
import {capitalizeCity,normalizeCity,cityKey,cityOptions,matchesDestination} from './propertyCities'
it('keeps new towns, normalizes known destinations and deduplicates city filters',()=>{
 expect(normalizeCity('  Sant   Cugat  ')).toBe('Sant Cugat')
 expect(normalizeCity('Barcelona')).toBe('barcelona')
 expect(cityKey('Mataró')).toBe(cityKey('mataro'))
 expect(cityOptions([{destination:'Mataró'},{destination:'mataro'},{destination:'Sitges'}],x=>x)).toHaveLength(2)
})

it('capitalizes the first letter without changing existing proper-name casing',()=>{
 expect(capitalizeCity('mataró')).toBe('Mataró')
 expect(normalizeCity('  sant cugat  ')).toBe('Sant cugat')
 expect(capitalizeCity('Sant Cugat')).toBe('Sant Cugat')
 expect(capitalizeCity('')).toBe('')
 expect(capitalizeCity('sant ')).toBe('Sant ')
})

it('matches Costa Brava municipalities without altering their stored city',()=>{
 for (const city of ['Palamós', 'PALAMOS', 'Roses', 'Begur', "Castell-Platja d’Aro", 'Calella de Palafrugell', 'Llançà']) {
  const property={destination:city,country:'ES'}
  expect(matchesDestination(property,'costa-brava')).toBe(true)
  expect(property.destination).toBe(city)
 }
 expect(matchesDestination({destination:'Other',portalData:{municipality:'Tossa de Mar'}},'costa-brava')).toBe(true)
 expect(matchesDestination({destination:'Costa Brava'},'costa-brava')).toBe(true)
 for(const city of ['Barcelona','Girona','Sant Andreu de Llavaneres','Sitges']) expect(matchesDestination({destination:city},'costa-brava')).toBe(false)
 expect(matchesDestination({destination:'Roses',country:'US'},'costa-brava')).toBe(false)
 expect(matchesDestination({destination:'Palamós'},'palamos')).toBe(true)
 expect(matchesDestination({destination:'Begur'},'palamos')).toBe(false)
 expect(cityOptions([{destination:'Palamós'}],x=>x)).toContainEqual({value:'costa-brava',label:'costa-brava'})
})
