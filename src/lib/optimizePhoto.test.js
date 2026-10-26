import { expect, it } from 'vitest'
import { photoDimensions } from './optimizePhoto'

it('limits landscape and portrait photos while preserving proportions', () => {
  expect(photoDimensions(6000, 4000)).toEqual({ width: 2400, height: 1600 })
  expect(photoDimensions(4000, 6000)).toEqual({ width: 1600, height: 2400 })
})
it('does not upscale small images', () => {
  expect(photoDimensions(800, 600)).toEqual({ width: 800, height: 600 })
})
