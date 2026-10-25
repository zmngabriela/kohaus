import {expect,it} from 'vitest'
import {capitalizeCity,normalizeCity,cityKey,cityOptions} from './propertyCities'
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
