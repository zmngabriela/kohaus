import {expect,it} from 'vitest'
import {recordChanges} from './recordHistory'

it('records business changes without copying temporary signed links or unrelated fields',()=>{
 const previous={priceValue:100,portalData:{translations:{pt:{title:'Casa'}}},photos:[{id:'1',name:'Sala',url:'temporary'}]}
 expect(recordChanges(previous,{photos:[{id:'1',name:'Sala',url:'renewed'}],priceValue:150,portalData:{translations:{pt:{title:'Loft'}}}})).toEqual([
  {field:'priceValue',before:'100',after:'150'},
  {field:'portalData.translations.pt.title',before:'Casa',after:'Loft'},
 ])
})
