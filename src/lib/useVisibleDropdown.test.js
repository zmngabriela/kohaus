import { expect, it } from 'vitest'
import { dropdownPosition } from './useVisibleDropdown'
const viewport = {top:0,left:0,width:390,height:700}
it('opens above a trigger at the bottom of the screen', () => {
 const result = dropdownPosition({top:620,bottom:670,left:20,width:180},200,180,viewport)
 expect(result.top).toBe(412)
 expect(result.top + 200).toBeLessThan(620)
})
it('opens below when there is room and stays within horizontal edges', () => {
 const result = dropdownPosition({top:50,bottom:94,left:280,width:100},200,220,viewport)
 expect(result.top).toBe(102)
 expect(result.left + result.width).toBeLessThanOrEqual(378)
})
it('caps long lists inside the visible viewport, including the mobile keyboard', () => {
 const result = dropdownPosition({top:210,bottom:254,left:20,width:200},900,200,{...viewport,height:300})
 expect(result.top).toBeGreaterThanOrEqual(12)
 expect(result.top + result.maxHeight).toBeLessThanOrEqual(288)
})
