import { render, screen, waitFor, within, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import App, { fetchPublishedProperties, saveDashboardProperty, updateDashboardProperty } from './App'

const PROPERTY_FIXTURES = [
  {
    id: 'test-eixample', createdAt: '2026-08-20T10:00:00.000Z', title: 'Bright Eixample apartment with terrace and editorial rhythm.',
    reference: 'TEST-BCN-1', operation: 'comprar', destination: 'barcelona', type: 'apartamento', priceLabel: '€1.85M',
    priceValue: 1850000, surface: 132, rooms: 3, bathrooms: 2, status: 'active', observations: '', history: [], extras: ['terraza', 'vistas'], photos: [], portalPublications: [],
  },
  {
    id: 'test-costa-brava', createdAt: '2026-08-20T10:05:00.000Z', title: 'Costa Brava villa.', reference: 'TEST-CBR-2',
    operation: 'comprar', destination: 'costa-brava', type: 'villa', priceLabel: '€3.4M', priceValue: 3400000,
    surface: 280, rooms: 4, bathrooms: 3, status: 'active', observations: '', history: [], extras: ['jardin', 'piscina'], photos: [], portalPublications: [],
  },
  {
    id: 'test-lisbon', createdAt: '2026-08-20T10:10:00.000Z', title: 'Lisbon loft.', reference: 'TEST-LIS-3',
    operation: 'alquilar', destination: 'portugal', type: 'loft', priceLabel: '€4,900 / month', priceValue: 4900,
    surface: 104, rooms: 2, bathrooms: 1, status: 'active', observations: '', history: [], extras: [], photos: [], portalPublications: [],
  },
]

function renderApp(search = '/?view=catalogo&lang=en&op=comprar&dest=todos') {
  window.history.replaceState({}, '', search)
  return render(<App />)
}

function getListingCards(container) {
  return container.querySelectorAll('.listing-card')
}

beforeEach(() => {
  window.localStorage.clear()
  window.localStorage.setItem('kohaus-dashboard-properties-v1', JSON.stringify(PROPERTY_FIXTURES))
  window.history.replaceState({}, '', '/')
})

describe('KOHAUS app regressions', () => {
  it('shows properties from custom cities when opening buy without a destination', async () => {
    window.localStorage.setItem('kohaus-dashboard-properties-v1', JSON.stringify([...PROPERTY_FIXTURES, {...PROPERTY_FIXTURES[0],id:'hospitalet',reference:'KH0115',destination:'Hospitalet',title:'Hospitalet property'}]))
    const {container}=renderApp('/?view=catalogo&lang=en&op=comprar')
    await waitFor(()=>expect(getListingCards(container)).toHaveLength(3))
    expect(screen.getByText('Hospitalet property')).toBeInTheDocument()
  })
  it('filters a custom city without restricting it to the original destination list', async () => {
    window.localStorage.setItem('kohaus-dashboard-properties-v1', JSON.stringify([...PROPERTY_FIXTURES, {...PROPERTY_FIXTURES[0],id:'hospitalet',reference:'KH0115',destination:'Hospitalet',title:'Hospitalet property'}]))
    const {container}=renderApp('/?view=catalogo&lang=en&op=comprar&dest=hospitalet')
    await waitFor(()=>expect(getListingCards(container)).toHaveLength(1))
    expect(screen.getByText('Hospitalet property')).toBeInTheDocument()
  })

  it('shows the site footer on every page', () => {
    const routes = [
      '/?lang=en',
      '/?view=catalogo&lang=en&op=comprar&dest=todos',
      '/?view=captacion&lang=en',
      '/?view=anuncio&lang=en&id=test-eixample',
      '/?view=dashboard&section=properties&lang=en',
    ]

    routes.forEach((route) => {
      const { container, unmount } = renderApp(route)

      expect(container.querySelectorAll('.site-footer')).toHaveLength(1)
      expect(screen.getByText('hola@thekohaus.com')).toBeInTheDocument()

      unmount()
    })
  })

  it('opens the owner form from the header shortcut and keeps navigation concise', async () => {
    const user = userEvent.setup()
    renderApp('/?lang=en')

    expect(screen.queryByRole('link', { name: 'Destinations' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Language' })).toHaveTextContent('English')
    await user.click(screen.getByRole('link', { name: 'Owners' }))

    await waitFor(() => {
      expect(window.location.search).toContain('view=captacion')
    })
    expect(screen.getByRole('heading', { name: 'Thinking about renting or selling your property?' })).toBeInTheDocument()
  })

  it('opens the rental catalog from the header rent button', async () => {
    const user = userEvent.setup()
    renderApp('/?lang=en')

    await user.click(screen.getByRole('link', { name: 'Rent' }))

    await waitFor(() => {
      expect(window.location.search).toContain('view=catalogo')
      expect(window.location.search).toContain('op=alquilar')
    })

    expect(await screen.findByText('Rent our main destinations.')).toBeInTheDocument()
    expect(screen.getByText('1 selected properties')).toBeInTheDocument()
    const destinationTrigger = screen.getByRole('button', { name: 'Destination' })
    expect(destinationTrigger).toHaveTextContent('All')
    expect(window.getComputedStyle(destinationTrigger.querySelector('.custom-select-trigger-label')).display).not.toBe('none')
  })

  it('keeps the same type options when the language changes and only translates labels', async () => {
    const user = userEvent.setup()
    renderApp('/?view=catalogo&lang=en&op=comprar&dest=todos')

    await user.click(screen.getByRole('button', { name: 'Filters' }))
    await user.click(screen.getByRole('button', { name: 'Type' }))
    expect(screen.getAllByRole('button', { name: 'Apartment' })).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Villa' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Loft' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'House' })).not.toBeInTheDocument()
    await user.click(document.body)

    await user.click(screen.getByRole('button', { name: 'Language' }))
    await user.click(screen.getByRole('button', { name: 'Português' }))

    await user.click(screen.getByRole('button', { name: 'Tipo' }))
    expect(screen.getAllByRole('button', { name: 'Apartamento' })).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Vila' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Loft' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Moradia' })).not.toBeInTheDocument()
  })

  it('filters the catalog with multi-select extras', async () => {
    const user = userEvent.setup()
    const { container } = renderApp('/?view=catalogo&lang=en&op=comprar&dest=todos')

    await waitFor(() => {
      expect(getListingCards(container)).toHaveLength(2)
    })

    await user.click(screen.getByRole('button', { name: 'Filters' }))
    await user.click(screen.getByRole('button', { name: 'Extras' }))
    await user.click(screen.getByRole('button', { name: 'Terrace' }))
    await user.click(screen.getByRole('button', { name: 'Views' }))

    await waitFor(() => {
      expect(getListingCards(container)).toHaveLength(1)
    })

    expect(screen.getByText('Bright Eixample apartment with terrace and editorial rhythm.')).toBeInTheDocument()
  })

  it('filters the catalog by a price range inside the dropdown', async () => {
    const user = userEvent.setup()
    const { container } = renderApp('/?view=catalogo&lang=en&op=comprar&dest=todos')

    await waitFor(() => {
      expect(getListingCards(container)).toHaveLength(2)
    })

    await user.click(screen.getByRole('button', { name: 'Filters' }))
    const priceTrigger = screen.getByRole('button', { name: 'Price' })
    await user.click(priceTrigger)

    const priceDialog = screen.getByRole('dialog', { name: 'Price' })
    expect(priceDialog).toHaveClass('catalog-price-menu')
    await user.type(within(priceDialog).getByPlaceholderText('Max EUR'), '2000000')
    await user.click(document.body)

    await waitFor(() => {
      expect(getListingCards(container)).toHaveLength(1)
    })

    expect(screen.getByRole('button', { name: 'Price' })).toHaveTextContent('<= 2M')
    expect(screen.getByText('Bright Eixample apartment with terrace and editorial rhythm.')).toBeInTheDocument()
  })

  it('filters the catalog by minimum bathrooms', async () => {
    const user = userEvent.setup()
    const { container } = renderApp('/?view=catalogo&lang=en&op=comprar&dest=todos')

    await waitFor(() => {
      expect(getListingCards(container)).toHaveLength(2)
    })

    await user.click(screen.getByRole('button', { name: 'Filters' }))
    await user.click(screen.getByRole('button', { name: 'Bathrooms' }))
    await user.click(screen.getByRole('button', { name: '3+' }))

    await waitFor(() => {
      expect(getListingCards(container)).toHaveLength(1)
    })
    expect(screen.getByText('Costa Brava villa.')).toBeInTheDocument()
  })

  it('creates and updates a dashboard property in local mode', async () => {
    const user = userEvent.setup()
    renderApp('/?view=dashboard&section=properties&lang=en')

    await user.click(screen.getByRole('button', { name: 'New property' }))

    const titleInput = screen.getByLabelText('Title')
    const priceValueInput = screen.getByLabelText('Price')
    const surfaceInput = screen.getByLabelText('Area m²')
    const roomsInput = screen.getByLabelText('Bedrooms')
    const bathroomsInput = screen.getByLabelText('Bathrooms')
    const observationsInput = screen.getByLabelText('Notes')

    await user.click(screen.getByRole('button', { name: 'Type' }))
    const propertyTypeList = screen.getByRole('listbox')
    expect(within(propertyTypeList).getAllByRole('button', { name: 'Villa' })).toHaveLength(1)
    expect(within(propertyTypeList).getByRole('button', { name: 'Duplex' })).toBeInTheDocument()
    expect(within(propertyTypeList).getByRole('button', { name: 'Studio' })).toBeInTheDocument()
    await user.click(within(propertyTypeList).getByRole('button', { name: 'Studio' }))

    await user.type(titleInput, 'Barcelona penthouse for investor matching')
    await user.type(priceValueInput, '2100000')
    await user.type(surfaceInput, '146')
    await user.type(roomsInput, '3')
    await user.type(bathroomsInput, '2')
    await user.type(observationsInput, 'Created from the dashboard test flow.')
    const propertyFormElement = screen.getAllByRole('button', { name: 'Add new property' })[0].closest('form')
    fireEvent.submit(propertyFormElement)
    fireEvent.submit(propertyFormElement)
    fireEvent.submit(propertyFormElement)

    expect(await screen.findByText('Barcelona penthouse for investor matching')).toBeInTheDocument()
    expect(screen.getAllByText('Barcelona penthouse for investor matching')).toHaveLength(1)
    const createdPropertyCard = screen.getByText('Barcelona penthouse for investor matching').closest('.dashboard-property-card')
    expect(createdPropertyCard?.querySelector('.crm-record-copy > p')).toHaveTextContent(/^KH[0-9]{4,}/)

    await user.click(screen.getAllByRole('button', { name: 'Edit' }).find((button) =>
      button.closest('.dashboard-property-card')?.textContent?.includes('Barcelona penthouse for investor matching'),
    ))

    expect(screen.queryByText('Update the property file without leaving the dashboard.')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Edit property', level: 1 })).toBeInTheDocument()

    const editTitleInput = screen.getByLabelText('Title')
    const editObservationsInput = screen.getByLabelText('Notes')
    await user.clear(editTitleInput)
    await user.type(editTitleInput, 'Barcelona penthouse updated from dashboard')
    await user.clear(editObservationsInput)
    await user.type(editObservationsInput, 'Updated from the dashboard test flow.')
    await user.click(screen.getAllByRole('button', { name: 'Save changes' })[0])

    expect(await screen.findByText('Barcelona penthouse updated from dashboard')).toBeInTheDocument()
    expect(await screen.findByText('Property updated successfully.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Dismiss notification' }))
    expect(screen.queryByText('Property updated successfully.')).not.toBeInTheDocument()
    expect(screen.queryByText('Updated from the dashboard test flow.')).not.toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: 'Edit' }).find(button => button.closest('.dashboard-property-card')?.textContent?.includes('Barcelona penthouse updated from dashboard')))
    expect(screen.getByLabelText('Notes')).toHaveValue('Updated from the dashboard test flow.')
  })

  it('promotes the KOHAUS Selection label on property details', async () => {
    renderApp('/?view=anuncio&lang=en&id=test-eixample')

    expect(await screen.findByRole('heading', { name: 'KOHAUS Selection', level: 2 })).toBeInTheDocument()
    expect(screen.queryByText('A home with character, chosen with care.')).not.toBeInTheDocument()
    expect(screen.queryByText('A property selected for its value, context and potential.')).not.toBeInTheDocument()
  })

  it('replaces the repeated lower description with structured property details', async () => {
    const detailedProperty = {
      ...PROPERTY_FIXTURES[0],
      observations: 'A singular home with a long editorial description.',
      portalData: {
        province: 'Barcelona', municipality: 'Barcelona', neighborhood: "L'Esquerra de l'Eixample",
        condition: 'Excellent', floor: '9', numberOfFloors: '10', orientation: 'Exterior',
        usefulSurface: '126', builtSurface: '132', nearShops: true, nearPublicTransport: true,
      },
    }
    window.localStorage.setItem('kohaus-dashboard-properties-v1', JSON.stringify([detailedProperty]))
    renderApp('/?view=anuncio&lang=en&id=test-eixample')

    expect(await screen.findByText('Property details')).toBeInTheDocument()
    expect(screen.getByText("L'Esquerra de l'Eixample")).toBeInTheDocument()
    expect(screen.getByText('Number of floors')).toBeInTheDocument()
    expect(screen.getByText('Public transport')).toBeInTheDocument()
    expect(screen.getAllByText('A singular home with a long editorial description.')).toHaveLength(1)
  })

  it('creates a dashboard lead from the property information form', async () => {
    const user = userEvent.setup()
    renderApp('/?view=anuncio&lang=en&id=test-eixample')

    expect(await screen.findByRole('heading', { name: 'Would you like to know more about this property?' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Request information' })).toHaveAttribute('href', '#contacto')

    await user.type(screen.getByLabelText('Name*'), 'Ana')
    await user.type(screen.getByLabelText('Surname*'), 'Silva')
    await user.type(screen.getByLabelText('Phone*'), '+34 600 000 000')
    await user.type(screen.getByLabelText('Email*'), 'ana@example.com')
    await user.type(screen.getByLabelText('What would you like to know?'), 'Is the property available for a visit?')
    await user.click(screen.getByLabelText('I have read and accept the legal notice and privacy policy'))
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }))

    expect(await screen.findByText('Thank you. We have received your enquiry and will be in touch.')).toBeInTheDocument()
    const savedLead = JSON.parse(window.localStorage.getItem('kohaus-owner-leads-v1'))[0]
    expect(savedLead).toMatchObject({
      name: 'Ana',
      surname: 'Silva',
      operation: 'comprar',
      source: 'property_request',
    })
    expect(savedLead.comments).toContain('TEST-BCN-1')
    expect(savedLead.comments).toContain('Is the property available for a visit?')
  })

  it('removes an existing property photo when the edited property is saved', async () => {
    const user = userEvent.setup()
    const propertyWithPhoto = {
      ...PROPERTY_FIXTURES[0],
      photos: [{ id: 'photo-existing-1', name: 'living-room.jpg', url: 'https://example.com/living-room.jpg' }],
    }
    window.localStorage.setItem('kohaus-dashboard-properties-v1', JSON.stringify([propertyWithPhoto]))
    renderApp('/?view=dashboard&section=properties&lang=en')

    await screen.findByText(propertyWithPhoto.title)
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    const removeButton = await screen.findByRole('button', { name: 'Remove photo: living-room.jpg' })
    await user.click(removeButton)

    expect(screen.queryByRole('button', { name: 'Remove photo: living-room.jpg' })).not.toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: 'Save changes' })[0])

    await screen.findByText(propertyWithPhoto.title)
    const savedProperties = JSON.parse(window.localStorage.getItem('kohaus-dashboard-properties-v1'))
    expect(savedProperties[0].photos).toEqual([])
  })

  it('creates selected portal publications as drafts from the property editor', async () => {
    const user = userEvent.setup()
    renderApp('/?view=dashboard&section=properties&lang=en')

    await user.click(screen.getByRole('button', { name: 'New property' }))

    await user.type(screen.getByLabelText('Title'), 'Portal-ready townhouse')
    await user.type(screen.getByLabelText('Price'), '980000')
    await user.type(screen.getByLabelText('Area m²'), '120')
    await user.type(screen.getByLabelText('Bedrooms'), '2')
    await user.type(screen.getByLabelText('Bathrooms'), '1')
    await user.click(screen.getByText('Publish to portals'))
    await user.click(screen.getByRole('checkbox', { name: /Fotocasa/ }))
    await user.click(screen.getAllByRole('button', { name: 'Add new property' })[0])

    expect(await screen.findByText('Portal-ready townhouse')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Portals' }))

    expect(screen.getByText('Portal-ready townhouse')).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: 'Manage' }).find(button => button.closest('.dashboard-portal-card')?.textContent?.includes('Portal-ready townhouse')))
    expect(screen.getAllByText('Draft').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Fotocasa').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Publish · API pending' })).toBeDisabled()
  })

  it('centers the Google Calendar action in visit cards', async () => {
    window.localStorage.setItem('kohaus-dashboard-visits-v1', JSON.stringify([
      {
        id: 'visit-calendar-test',
        scheduledAt: '2026-09-12T10:00:00.000Z',
        durationMinutes: 60,
        status: 'scheduled',
        location: 'Barcelona',
        notes: '',
        history: [],
      },
    ]))

    renderApp('/?view=dashboard&section=visits&lang=en')

    const calendarLink = await screen.findByRole('link', { name: 'Add to calendar' })
    expect(calendarLink).toHaveClass('dashboard-calendar-link')
  })

  it('creates and updates a dashboard client in local mode', async () => {
    const user = userEvent.setup()
    renderApp('/?view=dashboard&section=clients&lang=en')

    await user.click(screen.getByRole('button', { name: 'New client' }))

    const dialog = screen.getByRole('dialog', { name: 'Edit client' })
    await user.type(within(dialog).getByLabelText('Name'), 'Maya')
    await user.type(within(dialog).getByLabelText('Surname'), 'Costa')
    await user.type(within(dialog).getByLabelText('Phone'), '+34 600 111 222')
    await user.type(within(dialog).getByLabelText('Email'), 'maya@example.com')
    await user.type(within(dialog).getByLabelText('Minimum budget'), '1500000')
    await user.type(within(dialog).getByLabelText('Maximum budget'), '2200000')
    await user.type(within(dialog).getByLabelText('Internal notes'), 'Interested in Barcelona and quick closings.')
    await user.click(within(dialog).getByRole('button', { name: 'Save client' }))

    expect(await screen.findByText('Maya Costa')).toBeInTheDocument()
    expect(screen.getByText(/\+34 600 111 222/)).toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: 'Edit client' }).find((button) =>
      button.closest('.dashboard-client-card')?.textContent?.includes('Maya Costa'),
    ))

    const editDialog = screen.getByRole('dialog', { name: 'Edit client' })
    const notesInput = within(editDialog).getByLabelText('Internal notes')
    await user.clear(notesInput)
    await user.type(notesInput, 'Qualified and ready for curated options.')
    await user.click(within(editDialog).getByRole('button', { name: 'Update client' }))

    expect(screen.queryByText('Qualified and ready for curated options.')).not.toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: 'Edit client' }).find(button => button.closest('.dashboard-client-card')?.textContent?.includes('Maya Costa')))
    expect(within(screen.getByRole('dialog', { name: 'Edit client' })).getByLabelText('Internal notes')).toHaveValue('Qualified and ready for curated options.')
  })

  it('persists a property through Supabase and reloads the database result', async () => {
    const insertedRow = {
      id: 'property-db-1', created_at: '2026-09-09T18:00:00.000Z', title: 'Database property', reference: 'KH-000002',
      operation: 'comprar', destination: 'barcelona', type: 'studio', price_label: null, price_value: null,
      surface: 90, rooms: 2, bathrooms: 1, status: 'active', observations: '', history: [], photos: [], portal_publications: [],
    }
    const insert = vi.fn().mockResolvedValue({ error: null })
    const order = vi.fn().mockResolvedValue({ data: [insertedRow], error: null })
    const database = {
      from: vi.fn()
        .mockReturnValueOnce({ insert })
        .mockReturnValueOnce({ select: vi.fn(() => ({ order })) }),
    }

    const result = await saveDashboardProperty({
      title: 'Database property', reference: '', operation: 'comprar', destination: 'barcelona', type: 'apartamento',
      priceLabel: '', priceValue: '', surface: '90', rooms: '2', status: 'active', observations: '',
      publishToPortals: false, selectedPortals: [],
    }, [], database, true)

    expect(insert).toHaveBeenCalledOnce()
    expect(insert.mock.calls[0][0]).not.toHaveProperty('price_label')
    expect(insert).toHaveBeenCalledWith(expect.not.objectContaining({
      id: expect.anything(),
      reference: expect.anything(),
    }))
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ price_value: null }))
    expect(result).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'property-db-1', reference: 'KH-000002' })]))
  })

  it('loads published properties without coupling the query to newly added columns', async () => {
    const rowFromOlderSchema = {
      id: 'property-db-old-schema', created_at: '2026-09-09T18:00:00.000Z', title: 'Existing property', reference: 'KH-000001',
      operation: 'comprar', destination: 'barcelona', type: 'apartamento', price_label: '€900K', price_value: 900000,
      surface: 90, rooms: 2, status: 'active', observations: '', history: [], photos: [], portal_publications: [],
    }
    const order = vi.fn().mockResolvedValue({ data: [rowFromOlderSchema], error: null })
    const eq = vi.fn(() => ({ order }))
    const select = vi.fn(() => ({ eq, in: eq }))
    const database = { from: vi.fn(() => ({ select })) }

    const result = await fetchPublishedProperties(database, true)

    expect(select).toHaveBeenCalledWith('*')
    expect(result).toEqual([
      expect.objectContaining({ id: 'property-db-old-schema', bathrooms: 0 }),
    ])
  })

  it('does not pretend a property was saved when Supabase rejects the insert', async () => {
    const database = {
      from: vi.fn(() => ({ insert: vi.fn().mockResolvedValue({ error: new Error('RLS denied insert') }) })),
    }

    await expect(saveDashboardProperty({
      title: 'Rejected property', reference: 'KH-FAIL-1', operation: 'comprar', destination: 'barcelona', type: 'apartamento',
      priceLabel: '€1M', priceValue: '1000000', surface: '100', rooms: '2', status: 'active', observations: '',
      publishToPortals: false, selectedPortals: [],
    }, [], database, true)).rejects.toThrow('RLS denied insert')
  })

  it('persists property updates through Supabase before reloading', async () => {
    const update = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }))
    const order = vi.fn().mockResolvedValue({ data: [], error: null })
    const database = {
      from: vi.fn()
        .mockReturnValueOnce({ update })
        .mockReturnValueOnce({ select: vi.fn(() => ({ order })) }),
    }

    await updateDashboardProperty('property-db-1', { title: 'Updated in DB' }, database, true)

    expect(update).toHaveBeenCalledWith({ title: 'Updated in DB' })
  })
})

it('lists opportunities, persists bathroom and feature criteria, and recalculates after editing', async () => {
  const user = userEvent.setup()
  window.localStorage.setItem('kohaus-dashboard-clients-v1', JSON.stringify([{
    id: 'c-opportunity', name: 'Ana', surname: 'Silva', phone: '+34 612345678', email: 'ana@example.com',
    operation: 'comprar', destinations: ['barcelona'], types: ['apartamento'], budgetMin: 0, budgetMax: 2000000,
    minRooms: 2, minBathrooms: 2, minSurface: 0, requiredExtras: ['terraza'], status: 'qualified', notes: '', history: [],
  }]))
  renderApp('/?view=dashboard&section=opportunities&lang=en')
  expect(await screen.findByRole('heading', { name: 'Ana Silva' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute('href', 'https://wa.me/34612345678')
  await user.click(screen.getByRole('button', { name: 'Edit client' }))
  const bathrooms = screen.getByLabelText('Minimum bathrooms')
  expect(bathrooms).toHaveValue(2)
  await user.clear(bathrooms)
  await user.type(bathrooms, '3')
  await user.click(screen.getByRole('button', { name: 'Update client' }))
  await waitFor(() => {
    const client = JSON.parse(localStorage.getItem('kohaus-dashboard-clients-v1'))[0]
    expect(client.minBathrooms).toBe(3)
    expect(client.requiredExtras).toEqual(['terraza'])
  })
  await user.click(screen.getByRole('button', { name: 'Opportunities' }))
  expect(await screen.findByText(/No opportunities right now/)).toBeInTheDocument()
})

it('shows every matching property for one client with its own photo', async () => {
  const property = PROPERTY_FIXTURES[0]
  window.localStorage.setItem('kohaus-dashboard-properties-v1', JSON.stringify([
    { ...property, photos: [{ url: 'https://example.com/first.jpg' }] },
    { ...property, id: 'second-match', title: 'Second matching apartment', reference: 'SECOND', photos: [{ url: 'https://example.com/second.jpg' }] },
  ]))
  window.localStorage.setItem('kohaus-dashboard-clients-v1', JSON.stringify([{
    id: 'one-client', name: 'Ana', surname: 'Silva', status: 'new', operation: 'comprar', types: ['apartamento'], destinations: ['barcelona'],
  }]))
  renderApp('/?view=dashboard&section=opportunities&lang=en')
  expect(await screen.findByRole('img', { name: property.title })).toHaveAttribute('src', 'https://example.com/first.jpg')
  expect(screen.getByRole('img', { name: 'Second matching apartment' })).toHaveAttribute('src', 'https://example.com/second.jpg')
  expect(screen.getAllByRole('heading', { name: 'Ana Silva' })).toHaveLength(2)
})

it('uses the shared catalogue layout for off-market sale and rental listings',async()=>{
 window.localStorage.setItem('kohaus-dashboard-properties-v1',JSON.stringify(PROPERTY_FIXTURES.map((p,i)=>({...p,offMarket:i!==1,photos:[{url:'https://example.com/real-property.jpg'}]}))))
 const {container}=renderApp('/?view=off-market&lang=en')
 await waitFor(()=>expect(container.querySelectorAll('.listing-card')).toHaveLength(2))
 expect(container.querySelector('.catalog-toolbar')).toBeInTheDocument()
 expect(container.querySelector('.catalog-filter-strip')).toBeInTheDocument()
 expect(container.innerHTML).not.toContain('real-property.jpg')
 expect(screen.getAllByRole('button',{name:'Request information'})).toHaveLength(2)
})
