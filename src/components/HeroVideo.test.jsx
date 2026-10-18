import { render, screen, fireEvent } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import HeroVideo from './HeroVideo'
it('keeps the poster without a play button when autoplay is refused, and retries on interaction', async () => {
 const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockRejectedValue(new Error('NotAllowedError'))
 const { container, unmount } = render(<HeroVideo />)
 await Promise.resolve()
 expect(screen.queryByRole('button')).toBeNull()
 expect(container.querySelector('.hero-video-poster')).toBeTruthy()
 expect(container.querySelector('video').style.opacity).toBe('0')
 fireEvent.pointerDown(document)
 expect(play).toHaveBeenCalledTimes(2)
 fireEvent.playing(container.querySelector('video'))
 expect(container.querySelector('video').style.opacity).toBe('1')
 unmount()
 play.mockRestore()
})
