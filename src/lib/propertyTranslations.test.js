import { expect, it } from 'vitest'
import { propertyTranslations } from './propertyTranslations'
it('uses each saved language and falls back for missing or blank translations', () => {
 const property = { title: 'Original', observations: 'Original description', portalData: { translations: { pt: {title:'Casa',description:'Descrição'}, es: {title:'  '}, en: {title:'Home',description:'Description'} } } }
 expect(propertyTranslations(property,'title')).toEqual({pt:'Casa',es:'Original',en:'Home'})
 expect(propertyTranslations(property,'description')).toEqual({pt:'Descrição',es:'Original description',en:'Description'})
 expect(propertyTranslations({title:'Legacy'},'title').en).toBe('Legacy')
})
