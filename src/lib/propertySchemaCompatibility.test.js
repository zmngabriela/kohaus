import {it,expect,vi} from 'vitest'
import {fetchDashboardProperties} from '../App'
it('loads existing properties while the owner column migration is pending',async()=>{
 const order=vi.fn().mockResolvedValueOnce({data:null,error:{code:'42703',message:'column property_private_1.owner_client_id does not exist'}}).mockResolvedValueOnce({data:[{id:'p1',title:'Existing',photos:[],property_private:{address:'Internal'}}],error:null})
 const select=vi.fn(()=>({order})),db={from:()=>({select})}
 const rows=await fetchDashboardProperties(db,true)
 expect(rows[0]).toMatchObject({id:'p1',title:'Existing',privateAddress:'Internal'})
 expect(select).toHaveBeenLastCalledWith('*,property_private(address)')
})
it('does not bypass permission errors',async()=>{
 const order=vi.fn().mockResolvedValue({error:{code:'42501',message:'permission denied'},data:null})
 const db={from:()=>({select:()=>({order})})}
 await expect(fetchDashboardProperties(db,true)).rejects.toMatchObject({code:'42501'})
 expect(order).toHaveBeenCalledTimes(1)
})
