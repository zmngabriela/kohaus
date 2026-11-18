import { expect, it } from 'vitest'
import { renderPage } from './entry-server'
it('renders crawler-visible listing and main-page social previews without JavaScript', () => {
 const rows = [{id:'listing-1',title:'Sunny apartment',status:'active',operation:'comprar',photos:[{url:'https://media.example/first.jpg'}]}]
 const listing = renderPage({view:'anuncio',language:'en',propertyId:'listing-1'}, rows)
 expect(listing.head).toContain('property="og:image" content="https://kohausrealestate.com/api/property-image?id=listing-1"')
 expect(listing.head).toContain('name="twitter:card" content="summary_large_image"')
 const main = renderPage({view:'contact',language:'en'}, rows)
 expect(main.head).toContain('/brand/kohaus-social-monogram.png')
 expect(main.head).not.toContain('/api/property-image')
})
