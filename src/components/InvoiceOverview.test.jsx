import { paymentState } from './InvoiceOverview'
import { describe, it, expect } from 'vitest'
describe('invoice payment state',()=>{
 it('only marks explicitly unpaid invoices overdue after their due date',()=>{
  const row={payment_status:'pending',snapshot:{dueDate:'2026-11-02'}}
  expect(paymentState(row,'2026-11-02')).toBe('pending')
  expect(paymentState(row,'2026-11-03')).toBe('overdue')
  expect(paymentState({...row,payment_status:'paid'},'2026-11-03')).toBe('paid')
  expect(paymentState({...row,payment_status:null},'2026-11-03')).toBe('unknown')
  expect(paymentState({payment_status:'pending',snapshot:{}},'2026-11-03')).toBe('pending')
 })
})
