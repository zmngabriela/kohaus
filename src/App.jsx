import PropertyEditorActions from './components/PropertyEditorActions'
import { capitalizeCity, normalizeCity, cityKey, cityOptions } from './lib/propertyCities'
import PropertyOwner from './components/PropertyOwner'
import PropertyAI from './components/PropertyAI'
import { botCheck } from './lib/botCheck'
import { safeExternalUrl, validatePhoto, validatePhotoContent, signPropertyPhotos, photosForStorage } from './lib/mediaSecurity'
import PasswordRecovery from './components/PasswordRecovery'
import PasswordSetup from './components/PasswordSetup'
import { initialAuthCallback } from './lib/authCallback'
import { readPreferredLanguage } from './lib/analytics'
import EditorDialog from './components/EditorDialog'
import CrmRecord from './components/CrmRecord'
import { useVisibleDropdown } from './lib/useVisibleDropdown'
import HeroVideo from './components/HeroVideo'
import { propertyTranslations } from './lib/propertyTranslations'
import PrivacyConsent from './components/PrivacyConsent'
import { isPublishedListing, belongsInCatalog, listingLabels, closedListingsLast } from './lib/publicListings'
import { AboutPage, ContactPage, companyContact, companyCopy } from './components/CompanyPages'
import { LegalPage } from './components/Legal'
import CookieConsent from './components/CookieConsent'
import OffMarket from './components/OffMarket'
import offMarketImage from './assets/kohaus-intro-concept-mirrorless-v3.png'
import { preferredLanguage, recipientLanguage, visitRecipient } from './lib/language'
import { visitMessage } from './lib/visitMessage'
import { buildVisitEmail } from './lib/visitEmail'
import { propertyPrice, priceFields, CURRENCIES } from './lib/propertyPrice'
import { normalizeTypes, parseBudget } from './lib/clientCriteria'
import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react'
const Invoices = lazy(() => import('./components/Invoices'))
import './App.css'
import './components/PropertyWatermark.css'
import './components/Dropdown.css'
import Tasks from './components/Tasks'
import { unlinkLocalTaskReference } from './lib/tasks'
import Opportunities from './components/Opportunities'
import { opportunityCopy } from './lib/opportunityCopy'
import { propertyExtras } from './lib/opportunities'
import locationBarcelona from './assets/barcelona.jpg'
import locationCostaBrava from './assets/costa-brava.jpg'
import locationPortugal from './assets/portugal.jpg'
import locationBrasil from './assets/brasil.jpg'
import { getPropertyMediaBucket, hasSupabaseConfig, supabase } from './lib/supabase'

const LANGUAGES = ['es', 'en', 'pt']

const PROPERTY_TYPE_OPTIONS = ['piso', 'apartamento', 'atico', 'loft', 'casa', 'villa', 'duplex', 'studio']

const HOME_SEARCH_DEFAULTS = {
  operation: 'comprar',
  destination: 'todos',
  reference: '',
}

const CATALOG_FILTER_DEFAULTS = {
  operation: 'all',
  destination: 'todos',
  reference: '',
  type: [],
  priceCurrency: 'EUR',
  priceMin: '',
  priceMax: '',
  surface: 'all',
  rooms: 'all',
  bathrooms: 'all',
  extras: [],
  order: 'featured',
}

const OWNER_FORM_DEFAULTS = {
  name: '',
  surname: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  operation: 'vender',
  source: 'instagram',
  comments: '',
  legalAccepted: false,
  newsletterAccepted: false,
}

const PROPERTY_INQUIRY_DEFAULTS = {
  name: '',
  surname: '',
  phone: '',
  email: '',
  message: '',
  legalAccepted: false,
}

const PROPERTY_FORM_DEFAULTS = {
  title: '',
  reference: '',
  operation: 'comprar',
  destination: 'barcelona',
  type: 'piso',
  priceLabel: '',
  ownerClientId: '',
  privateAddress: '',
  offMarket: false,
  priceValue: '',
  currency: 'EUR',
  surface: '',
  rooms: '',
  bathrooms: '',
  status: 'draft',
  observations: '',
  photos: [],
  publishToPortals: false,
  selectedPortals: [],
  portalData: {
    street: '', streetNumber: '', postalCode: '', municipality: '', province: '',
    neighborhood: '', latitude: '', longitude: '', addressVisibility: 'street', floor: '', door: '',
    condition: '', buildingYear: '', usefulSurface: '', builtSurface: '', numberOfFloors: '', orientation: '',
    nearCityCenter: false, nearShops: false, nearSchools: false, nearPharmacy: false,
    nearParks: false, nearPolice: false, nearPublicTransport: false,
    cadastralReference: '', energyCertificateStatus: 'available', energyCertificateUrl: '',
    energyConsumptionRating: '', energyConsumptionValue: '', energyEmissionsRating: '', energyEmissionsValue: '',
    contactName: '', contactPhone: '', contactEmail: '',
  },
}

const PROPERTY_EDITOR_DEFAULT = {
  isOpen: false,
  mode: 'create',
  propertyId: null,
}

const CLIENT_FORM_DEFAULTS = {
  language: 'es',
  name: '',
  surname: '',
  phone: '',
  email: '',
  operation: 'comprar',
  destinations: ['barcelona'],
  types: ['piso'],
  budgetMin: '',
  budgetMax: '',
  currency: 'EUR',
  minRooms: '',
  minBathrooms: '',
  requiredExtras: [],
  minSurface: '',
  status: 'new',
  notes: '',
}

const CLIENT_FILTER_DEFAULTS = {
  operation: 'all',
  status: 'all',
  search: '',
}

const CLIENT_EDITOR_DEFAULT = {
  isOpen: false,
  mode: 'create',
  clientId: null,
}

const VISIT_FORM_DEFAULTS = {
  clientId: '',
  propertyId: '',
  leadId: '',
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  location: '',
  scheduledAt: '',
  durationMinutes: '60',
  status: 'scheduled',
  notes: '',
}

const VISIT_FILTER_DEFAULTS = {
  status: 'all',
  search: '',
}

const PORTAL_FILTER_DEFAULTS = {
  search: '',
  portal: 'all',
  status: 'all',
}

const PORTAL_PIPELINE_ID = '__pipeline__'

const PROPERTY_FILTER_DEFAULTS = {
  operation: 'all',
  destination: 'all',
  status: 'all',
  search: '',
}

const DASHBOARD_SECTION_DEFAULT = 'overview'
const LEADS_STORAGE_KEY = 'kohaus-owner-leads-v1'
const PROPERTIES_STORAGE_KEY = 'kohaus-dashboard-properties-v1'
const CLIENTS_STORAGE_KEY = 'kohaus-dashboard-clients-v1'
const VISITS_STORAGE_KEY = 'kohaus-dashboard-visits-v1'

const DESTINATIONS = [
  { slug: 'barcelona', image: locationBarcelona },
  { slug: 'costa-brava', image: locationCostaBrava },
  { slug: 'portugal', image: locationPortugal },
  { slug: 'brasil', image: locationBrasil },
]

const PORTAL_DEFINITIONS = [
  {
    id: 'idealista',
    name: 'idealista',
    publishUrl: 'https://www.idealista.com/info/publicar-anuncio',
  },
  {
    id: 'fotocasa',
    name: 'Fotocasa',
    publishUrl: 'https://www.fotocasa.es/es/',
  },
  {
    id: 'habitaclia',
    name: 'habitaclia',
    publishUrl: 'https://m.habitaclia.com/publicar-anuncio.htm',
  },
  {
    id: 'milanuncios',
    name: 'Milanuncios',
    publishUrl: 'https://www.milanuncios.com/',
  },
]

const PORTAL_DATA_FIELDS = [
  ['street', 'text'], ['streetNumber', 'text'], ['postalCode', 'text'], ['municipality', 'text'],
  ['province', 'text'], ['neighborhood', 'text'], ['latitude', 'number'], ['longitude', 'number'], ['floor', 'text'], ['door', 'text'],
  ['condition', 'text'], ['buildingYear', 'number'], ['usefulSurface', 'number'], ['builtSurface', 'number'],
  ['numberOfFloors', 'number'], ['orientation', 'text'],
  ['cadastralReference', 'text'], ['energyCertificateUrl', 'url'], ['energyConsumptionRating', 'text'],
  ['energyConsumptionValue', 'number'], ['energyEmissionsRating', 'text'], ['energyEmissionsValue', 'number'],
  ['contactName', 'text'], ['contactPhone', 'tel'], ['contactEmail', 'email'],
]

const COPY = {
  es: {
    nav: {
      buy: 'Comprar',
      rent: 'Alquilar',
      sell: 'Vender',
      owners: 'Propietarios',
      language: 'Idioma',
      about: 'Nosotros',
      contact: 'Contacto',
      dashboard: 'Dashboard',
      signOut: 'Salir',
    },
    footer: {
      description: 'Real estate contemporáneo con curaduría, criterio y atención personal.',
      contact: 'Contacto',
      social: 'Redes',
      legal: 'Legal',
      legalLinks: ['Aviso legal', 'Privacidad', 'Cookies'],
    },
    home: {
      title: 'Propiedades con valor. Conexiones que tienen sentido.',
      copy: 'KOHAUS combina curaduría, conocimiento local y atención personalizada para acompañar decisiones inmobiliarias con más claridad y criterio.',
      operation: 'Operación',
      destination: 'Destino',
      reference: 'Referencia',
      referencePlaceholder: 'Barrio, zona o código',
      search: 'Buscar',
      featuredLabel: 'Selección KOHAUS',
      featuredTitle: 'Inmuebles destacados',
      introKicker: 'Curaduría inmobiliaria',
      introTitle: 'Una forma más cercana y contemporánea de vivir el real estate.',
      introCopy: 'Seleccionamos cada propiedad con intención y acompañamos cada proceso de manera estratégica, discreta y humana. Sin ruido, sin fórmulas genéricas.',
      ownerLabel: 'Para propietarios',
      ownerTitle: 'Tu propiedad merece la estrategia adecuada.',
      ownerCopy: 'Cuidamos la presentación, el posicionamiento y la conexión con compradores o inquilinos realmente alineados con el valor de cada propiedad.',
      rentWithUs: 'Alquilar con nosotros',
      sellWithUs: 'Vender con nosotros',
      exploreLabel: 'Explorar por lugar',
      exploreTitle: 'Una selección entre ciudad, costa y nuevos horizontes.',
      seeProperties: 'Ver inmuebles',
      aboutLabel: 'Descubre más sobre nosotros',
      aboutTitle: 'Una marca inmobiliaria de conexión, curaduría y visión internacional.',
      aboutCopy: 'Con una presencia natural entre Barcelona y la Costa Brava, KOHAUS une conocimiento local y perspectiva internacional, manteniendo conexiones puntuales con Portugal y Brasil.',
      aboutCta: 'Sobre nosotros',
    },
    ownerForm: {
      back: 'Volver',
      label: 'Captación KOHAUS',
      title: '¿Pensando en alquilar o vender tu propiedad?',
      copyLead: 'Analizamos cada propiedad con atención para definir su mejor presentación, posicionamiento y estrategia comercial.',
      copyDetail: 'Cuéntanos los detalles esenciales. Nuestro equipo revisará la información y entrará en contacto para entender el inmueble y tus objetivos.',
      panelTitle: 'Cuéntanos sobre tu propiedad.',
      submit: 'Enviar solicitud',
      success: 'Gracias. Esta solicitud ya quedó guardada en el dashboard interno de KOHAUS.',
      viewDashboard: 'Ver dashboard',
      legal: 'He leído y acepto el aviso legal y la política de privacidad',
      newsletter: 'Acepto recibir comunicaciones comerciales',
      fields: {
        name: 'Nombre*',
        surname: 'Apellidos*',
        phone: 'Teléfono*',
        email: 'Email*',
        address: 'Dirección del inmueble',
        city: 'Ciudad*',
        operation: 'Tipo de operación',
        source: 'Cómo nos conociste',
        comments: 'Cuéntanos un poco más',
      },
      operations: {
        comprar: 'Comprar con KOHAUS',
        alquilar: 'Alquilar con KOHAUS',
        vender: 'Vender con KOHAUS',
      },
      sources: {
        instagram: 'Instagram',
        recommendation: 'Recomendación',
        google: 'Google',
        portal: 'Portal inmobiliario',
        property_request: 'Solicitud sobre un inmueble',
        other: 'Otro',
      },
    },
    auth: {
      badge: 'Acceso privado',
      title: 'Entrar al dashboard interno de KOHAUS',
      copy: 'Solo usuarios autorizados pueden abrir leads, inmuebles y clientes desde este panel.',
      email: 'Email',
      password: 'Contraseña',
      submit: 'Entrar',
      loading: 'Verificando acceso...',
      unauthorizedTitle: 'Tu cuenta no tiene acceso al dashboard.',
      unauthorizedCopy: 'Este usuario existe, pero KOHAUS todavía no lo aprovisionó para el dashboard. Ejecuta el schema más reciente en Supabase o sincroniza `dashboard_users` antes de usar el panel.',
      signedInAs: 'Sesión iniciada como',
      accessGranted: 'Acceso aprobado',
      roleLabel: 'Rol',
    },
    dashboard: {
      label: 'Panel interno KOHAUS',
      title: 'Leads recibidos desde el sitio.',
      empty: 'Todavía no hay leads guardados desde el sitio.',
      sections: {
        overview: 'Dashboard',
        leads: 'Leads',
        properties: 'Inmuebles',
        portals: 'Portales',
        visits: 'Visitas',
        tasks: 'Tareas',
        invoices: 'Facturas',
        opportunities: 'Oportunidades',
        clients: 'Clientes',
      },
      propertiesLabel: 'Gestión de inmuebles',
      propertiesTitle: 'Inmuebles cargados y listos para operación interna.',
      propertiesEmpty: 'Todavía no hay inmuebles guardados en el panel.',
      propertyPanelCopy: 'Gestiona la cartera sin saturar la vista. Crea nuevos inmuebles desde una capa dedicada y edita los ya guardados cuando haga falta.',
      addProperty: 'Cargar nuevo inmueble',
      openPropertyEditor: 'Nuevo inmueble',
      editProperty: 'Editar',
      updateProperty: 'Guardar cambios',
      saving: 'Guardando…',
      propertySaved: 'Inmueble actualizado correctamente.',
      propertyCreated: 'Inmueble guardado correctamente.',
      propertyDeleted: 'Inmueble eliminado.',
      clientSaved: 'Cliente actualizado correctamente.',
      clientCreated: 'Cliente guardado correctamente.',
      clientDeleted: 'Cliente eliminado.',
      visitSaved: 'Visita actualizada correctamente.',
      visitCreated: 'Visita guardada correctamente.',
      visitDeleted: 'Visita eliminada.',
      portalSaved: 'Publicación actualizada correctamente.',
      leadSaved: 'Lead actualizado correctamente.',
      leadDeleted: 'Lead eliminado.',
      taskSaved: 'Tarea actualizada correctamente.',
      taskDeleted: 'Tarea eliminada.',
      invoiceSaved: 'Factura guardada correctamente.',
      invoiceIssuerSaved: 'Datos del emisor guardados correctamente.',
      invoiceDeleted: 'Factura eliminada.',
      deleteClient: 'Eliminar cliente',
      deleteLead: 'Eliminar lead',
      deleteVisit: 'Eliminar visita',
      deleteTask: 'Eliminar tarea',
      deleteInvoice: 'Eliminar factura',
      confirmDelete: '¿Eliminar definitivamente “{name}”? Esta acción no se puede deshacer.',
      closeEditor: 'Cerrar',
      backToProperties: 'Volver a inmuebles',
      editorCreateEyebrow: 'Nuevo inmueble',
      editorEditEyebrow: 'Editar inmueble',
      editorCreateTitle: 'Carga un inmueble en una capa enfocada y sin ruido.',
      editorEditTitle: '',
      saveObservation: 'Guardar observación',
      historyTitle: 'Historial interno',
      observationLabel: 'Observaciones internas',
      statusLabel: 'Estado interno',
      photoLabel: 'Fotos del inmueble',
      photoHelp: 'Puedes seleccionar varias imágenes para este inmueble y arrastrarlas para definir el orden.',
      photoOrderHelp: 'Arrastra las fotos para reordenarlas. La primera será la principal.',
      removePhoto: 'Eliminar foto',
      storageMode: hasSupabaseConfig ? 'Supabase active' : 'Modo local',
      stats: {
        total: 'Total leads',
        nuevo: 'Nuevos',
        contactado: 'Contactados',
        cerrado: 'Cerrados',
      },
      columns: {
        operation: 'Operación',
        source: 'Origen',
        status: 'Estado',
        date: 'Entrada',
      },
      propertyColumns: {
        operation: 'Operación',
        destination: 'Destino',
        type: 'Tipo',
        price: 'Precio',
        rooms: 'Habitaciones',
        bathrooms: 'Baños',
        surface: 'Superficie',
      },
      statusOptions: {
        nuevo: 'Nuevo',
        contactado: 'Contactado',
        visita: 'Visita',
        propuesta: 'Propuesta',
        cerrado: 'Cerrado',
      },
      propertyStatusOptions: {
        draft: 'Borrador',
        active: 'Activo',
        paused: 'Pausado',
        closed: 'Cerrado',
      },
      propertyFields: {
        title: 'Título',
        reference: 'Referencia',
        operation: 'Operación',
        destination: 'Destino',
        type: 'Tipo',
        priceLabel: 'Precio visible',
        priceValue: 'Precio',
        surface: 'Superficie m²',
        rooms: 'Habitaciones',
        bathrooms: 'Baños',
        status: 'Estado',
        observations: 'Observaciones',
        photos: 'Fotos',
        publishToPortals: 'Preparar para portales',
        selectedPortals: 'Portales seleccionados',
      },
      propertyFilters: {
        search: 'Buscar',
        operation: 'Operación',
        destination: 'Destino',
        status: 'Estado',
      },
      portalsLabel: 'Publicación en portales',
      portalsTitle: 'Controla qué inmuebles están listos, publicados o pendientes de actualizar.',
      portalsPanelCopy: 'Primero dejamos cada inmueble preparado desde KOHAUS. Después abres el portal, copias el paquete comercial y guardas aquí el enlace y el estado.',
      portalsEmpty: 'Todavía no hay inmuebles preparados para portales.',
      portalsSelectionLabel: 'Selecciona los portales activos para cada inmueble.',
      portalsSelectionEmpty: 'Este inmueble ya está preparado, pero todavía no tiene ningún portal seleccionado.',
      managePortals: 'Gestionar portales',
      openPortal: 'Abrir portal',
      openListing: 'Abrir anuncio',
      copyPortalTitle: 'Copiar título',
      copyPortalDescription: 'Copiar descripción',
      savePortal: 'Guardar portal',
      editPropertyFile: 'Editar inmueble',
      portalReferenceLabel: 'ID / referencia en portal',
      portalListingUrlLabel: 'URL del anuncio',
      portalNotesLabel: 'Notas de publicación',
      portalPublishedAtLabel: 'Publicado',
      portalPortalLabel: 'Portal',
      portalSummaryEmpty: 'Todavía no preparado',
      portalSummaryQueued: 'Preparado para seleccionar portales',
      portalSummaryPublished: 'Publicado en',
      portalSummaryOf: 'de',
      portalSummaryPortals: 'portales',
      portalSummaryNotPublished: 'Todavía no publicado',
      portalFilters: {
        search: 'Buscar publicación',
        portal: 'Portal',
        status: 'Estado',
      },
      portalStatusOptions: {
        draft: 'Borrador',
        ready: 'Listo para publicar',
        posted: 'Publicado',
        update_needed: 'Actualizar',
        paused: 'Pausado',
      },
      visitsLabel: 'Agenda de visitas',
      visitsTitle: 'Visibilidad clara de próximas visitas, pendientes y seguimiento.',
      visitsEmpty: 'Todavía no hay visitas agendadas.',
      visitPanelCopy: 'Programa visitas con contexto, vincúlalas a un cliente cuando exista y mantén una lista clara para no perder seguimiento.',
      addVisit: 'Agendar visita',
      updateVisit: 'Guardar visita',
      editVisit: 'Editar visita',
      newVisit: 'Nueva visita',
      calendarLink: 'Añadir al calendario',
      visitEmail: 'Enviar email',
      visitReminderTip: 'Al crear el evento, configura un recordatorio por email 3 horas antes e invita al cliente. Pídele que compruebe su recordatorio y avise si necesita cancelar.',
      visitEmailMissing: 'Añade el email del cliente para enviar la confirmación.',
      leadToClient: 'Crear cliente',
      leadToVisit: 'Agendar visita',
      leadToProperty: 'Crear inmueble',
      unlinked: 'Sin vincular',
      manualSource: 'Manual',
      visitFields: {
        client: 'Cliente vinculado',
        property: 'Inmueble',
        contactName: 'Nombre de contacto',
        contactPhone: 'Teléfono',
        contactEmail: 'Email',
        location: 'Punto de encuentro / dirección',
        scheduledAt: 'Fecha y hora',
        durationMinutes: 'Duración (min)',
        status: 'Estado de la visita',
        notes: 'Notas de visita',
      },
      visitFilters: {
        search: 'Buscar visita',
        status: 'Estado',
      },
      visitColumns: {
        when: 'Cuándo',
        contact: 'Contacto',
        property: 'Inmueble',
        linkedClient: 'Cliente',
        source: 'Origen',
      },
      visitStatusOptions: {
        scheduled: 'Agendada',
        confirmed: 'Confirmada',
        completed: 'Realizada',
        cancelled: 'Cancelada',
      },
      clientsLabel: 'Clientes compradores e inquilinos',
      clientsTitle: 'Perfiles activos para cruzar demanda con la cartera disponible.',
      clientsEmpty: 'Todavía no hay clientes guardados en el panel.',
      clientPanelCopy: 'Registra preferencias reales del cliente y deja que el sistema priorice los inmuebles más compatibles para trabajar el cierre con más criterio.',
      addClient: 'Guardar cliente',
      updateClient: 'Actualizar cliente',
      editClient: 'Editar cliente',
      newClient: 'Nuevo cliente',
      resetClient: 'Cancelar edición',
      matchTitle: 'Cruce automático con inmuebles',
      noMatches: 'Todavía no hay inmuebles compatibles con este perfil.',
      clientFields: {
        name: 'Nombre',
        surname: 'Apellidos',
        phone: 'Teléfono',
        email: 'Email',
        operation: 'Operación',
        destinations: 'Destinos deseados',
        types: 'Tipologías',
        budgetMin: 'Presupuesto mínimo',
        budgetMax: 'Presupuesto máximo',
        minRooms: 'Habitaciones mínimas',
        minSurface: 'Superficie mínima m²',
        status: 'Estado del cliente',
        notes: 'Notas internas',
      },
      clientColumns: {
        budget: 'Presupuesto',
        criteria: 'Criterios',
        contact: 'Contacto',
      },
      clientFilters: {
        search: 'Buscar cliente',
        operation: 'Operación',
        status: 'Estado',
      },
      clientStatusOptions: {
        new: 'Nuevo',
        qualified: 'Cualificado',
        viewing: 'Buscando visitas',
        negotiation: 'Negociación',
        closed: 'Cerrado',
      },
      matchReasons: {
        destination: 'Destino alineado',
        type: 'Tipología alineada',
        budget: 'Presupuesto encaja',
        rooms: 'Cumple habitaciones',
        surface: 'Cumple superficie',
        active: 'Inmueble activo',
      },
    },
    catalog: {
      all: 'Todos',
      allFeminine: 'Todas',
      searchPlaceholder: 'Ciudad, barrio o referencia',
      selection: 'Selección KOHAUS',
      inMainDestinations: 'nuestros destinos principales',
      exampleProperties: 'propiedades seleccionadas',
      filters: {
        search: 'Buscar',
        destination: 'Destino',
        type: 'Tipo',
        price: 'Precio',
        surface: 'Superficie',
        rooms: 'Habitaciones',
        bathrooms: 'Baños',
        extras: 'Extras',
        order: 'Orden',
      },
      types: {
        piso: 'Piso',
        apartamento: 'Apartamento',
        atico: 'Ático',
        loft: 'Loft',
        casa: 'Casa',
        villa: 'Villa',
        moradia: 'Moradia',
        duplex: 'Dúplex',
        studio: 'Estudio',
      },
      prices: {
        low: 'Entrada',
        mid: 'Media',
        high: 'Alta',
      },
      surfaces: {
        s: 'Hasta 90 m²',
        m: '90 - 160 m²',
        l: '160+ m²',
      },
      extras: {
        terraza: 'Terraza',
        balcon: 'Balcón',
        vistas: 'Vistas',
        piscina: 'Piscina',
        jardin: 'Jardín',
        inversion: 'Inversión',
      },
      orderOptions: {
        featured: 'Destacados',
        priceAsc: 'Precio ascendente',
        priceDesc: 'Precio descendente',
        surfaceDesc: 'Más superficie',
      },
      viewListing: 'Ver anuncio',
    },
    property: {
      contact: 'Solicitar información',
      inquiryLabel: 'Información del inmueble',
      inquiryTitle: '¿Quieres saber más sobre esta propiedad?',
      inquiryCopy: 'Déjanos tus datos y cuéntanos qué necesitas. Te responderemos personalmente con la información del inmueble.',
      inquiryMessage: '¿Qué te gustaría saber?',
      inquirySubmit: 'Enviar solicitud',
      inquirySuccess: 'Gracias. Hemos recibido tu solicitud y nos pondremos en contacto contigo.',
      selection: 'Selección KOHAUS',
      detailsTitle: 'Detalles del inmueble',
      detailsGroups: { overview: 'Información', distribution: 'Distribución', areas: 'Áreas y superficies', surroundings: 'Entorno', features: 'Características' },
      detailLabels: { operation: 'Operación', reference: 'Referencia', province: 'Provincia', municipality: 'Municipio', neighborhood: 'Población / barrio', type: 'Tipo de inmueble', condition: 'Estado / conservación', price: 'Precio', usefulSurface: 'Superficie útil', builtSurface: 'Superficie construida', rooms: 'Habitaciones', bathrooms: 'Baños', floor: 'Planta', numberOfFloors: 'Número de plantas', orientation: 'Interior / exterior', buildingYear: 'Año de construcción', extras: 'Extras', nearCityCenter: 'Centro urbano', nearShops: 'Comercios', nearSchools: 'Escuelas', nearPharmacy: 'Farmacia', nearParks: 'Parques y jardines', nearPolice: 'Policía', nearPublicTransport: 'Transporte público' },
      related: 'También podría interesarte',
      relatedTitle: 'Otras oportunidades seleccionadas por KOHAUS.',
      facts: {
        type: 'Tipo',
        surface: 'Superficie',
        rooms: 'Habitaciones',
        bathrooms: 'Baños',
        extras: 'Extras',
      },
    },
  },
  en: {
    nav: {
      buy: 'Buy',
      rent: 'Rent',
      sell: 'Sell',
      owners: 'Owners',
      language: 'Language',
      about: 'About',
      contact: 'Contact',
      dashboard: 'Dashboard',
      signOut: 'Sign out',
    },
    footer: {
      description: 'Contemporary real estate shaped by curation, discernment and personal service.',
      contact: 'Contact',
      social: 'Social',
      legal: 'Legal',
      legalLinks: ['Legal notice', 'Privacy', 'Cookies'],
    },
    home: {
      title: 'Properties with value. Connections that make sense.',
      copy: 'KOHAUS combines curation, local knowledge and personal service to guide real estate decisions with greater clarity and discernment.',
      operation: 'Operation',
      destination: 'Destination',
      reference: 'Reference',
      referencePlaceholder: 'Neighbourhood, area or code',
      search: 'Search',
      featuredLabel: 'KOHAUS selection',
      featuredTitle: 'Featured properties',
      introKicker: 'Real estate curation',
      introTitle: 'A closer, more contemporary way to experience real estate.',
      introCopy: 'Every property is selected with intention, and every process is handled with strategy, discretion and a human approach. No noise, no generic formulas.',
      ownerLabel: 'For owners',
      ownerTitle: 'Your property deserves the right strategy.',
      ownerCopy: 'We shape its presentation and positioning, connecting it with buyers or tenants who understand the property’s true value.',
      rentWithUs: 'Rent with us',
      sellWithUs: 'Sell with us',
      exploreLabel: 'Explore by location',
      exploreTitle: 'A selection across city, coast and new horizons.',
      seeProperties: 'View properties',
      aboutLabel: 'Discover more about us',
      aboutTitle: 'A real estate brand built around connection, curation and international perspective.',
      aboutCopy: 'With a natural presence across Barcelona and the Costa Brava, KOHAUS brings together local knowledge and an international perspective, with selected connections in Portugal and Brazil.',
      aboutCta: 'About us',
    },
    ownerForm: {
      back: 'Back',
      label: 'KOHAUS Intake',
      title: 'Thinking about renting or selling your property?',
      copyLead: 'We assess every property carefully to define its strongest presentation, positioning and commercial strategy.',
      copyDetail: 'Share the essential details with us. Our team will review the information and get in touch to understand the property and your objectives.',
      panelTitle: 'Tell us about your property.',
      submit: 'Send request',
      success: 'Thank you. This request has already been saved to the internal KOHAUS dashboard.',
      viewDashboard: 'Open dashboard',
      legal: 'I have read and accept the legal notice and privacy policy',
      newsletter: 'I agree to receive commercial communications',
      fields: {
        name: 'Name*',
        surname: 'Surname*',
        phone: 'Phone*',
        email: 'Email*',
        address: 'Property address',
        city: 'City*',
        operation: 'Type of operation',
        source: 'How did you hear about us',
        comments: 'Tell us a bit more',
      },
      operations: {
        comprar: 'Buy with KOHAUS',
        alquilar: 'Rent with KOHAUS',
        vender: 'Sell with KOHAUS',
      },
      sources: {
        instagram: 'Instagram',
        recommendation: 'Recommendation',
        google: 'Google',
        portal: 'Property portal',
        property_request: 'Property enquiry',
        other: 'Other',
      },
    },
    auth: {
      badge: 'Private access',
      title: 'Sign in to the internal KOHAUS dashboard',
      copy: 'Only authorised users can open leads, properties and clients from this internal panel.',
      email: 'Email',
      password: 'Password',
      submit: 'Sign in',
      loading: 'Checking access...',
      unauthorizedTitle: 'This account does not have dashboard access.',
      unauthorizedCopy: 'The user exists, but KOHAUS has not provisioned dashboard access yet. Run the latest Supabase schema or sync `dashboard_users` before using the panel.',
      signedInAs: 'Signed in as',
      accessGranted: 'Access granted',
      roleLabel: 'Role',
    },
    dashboard: {
      label: 'Internal KOHAUS panel',
      title: 'Leads received from the website.',
      empty: 'There are no saved website leads yet.',
      sections: {
        overview: 'Dashboard',
        leads: 'Leads',
        properties: 'Properties',
        portals: 'Portals',
        visits: 'Visits',
        tasks: 'Tasks',
        invoices: 'Invoices',
        opportunities: 'Opportunities',
        clients: 'Clients',
      },
      propertiesLabel: 'Property management',
      propertiesTitle: 'Properties loaded and ready for internal operation.',
      propertiesEmpty: 'There are no saved properties in the panel yet.',
      propertyPanelCopy: 'Manage the portfolio without crowding the view. Create new properties from a dedicated layer and edit saved ones whenever needed.',
      addProperty: 'Add new property',
      openPropertyEditor: 'New property',
      editProperty: 'Edit',
      updateProperty: 'Save changes',
      saving: 'Saving…',
      propertySaved: 'Property updated successfully.',
      propertyCreated: 'Property saved successfully.',
      propertyDeleted: 'Property deleted.',
      clientSaved: 'Client updated successfully.',
      clientCreated: 'Client saved successfully.',
      clientDeleted: 'Client deleted.',
      visitSaved: 'Visit updated successfully.',
      visitCreated: 'Visit saved successfully.',
      visitDeleted: 'Visit deleted.',
      portalSaved: 'Publication updated successfully.',
      leadSaved: 'Lead updated successfully.',
      leadDeleted: 'Lead deleted.',
      taskSaved: 'Task updated successfully.',
      taskDeleted: 'Task deleted.',
      invoiceSaved: 'Invoice saved successfully.',
      invoiceIssuerSaved: 'Issuer details saved successfully.',
      invoiceDeleted: 'Invoice deleted.',
      deleteClient: 'Delete client',
      deleteLead: 'Delete lead',
      deleteVisit: 'Delete visit',
      deleteTask: 'Delete task',
      deleteInvoice: 'Delete invoice',
      confirmDelete: 'Permanently delete “{name}”? This action cannot be undone.',
      closeEditor: 'Close',
      backToProperties: 'Back to properties',
      editorCreateEyebrow: 'New property',
      editorEditEyebrow: 'Edit property',
      editorCreateTitle: 'Add a property in a focused layer with no visual noise.',
      editorEditTitle: '',
      saveObservation: 'Save note',
      historyTitle: 'Internal history',
      observationLabel: 'Internal notes',
      statusLabel: 'Internal status',
      photoLabel: 'Property photos',
      photoHelp: 'You can select multiple images for this property and drag them into the final order.',
      photoOrderHelp: 'Drag photos to reorder them. The first image will be the main one.',
      removePhoto: 'Remove photo',
      storageMode: hasSupabaseConfig ? 'Supabase active' : 'Local mode',
      stats: {
        total: 'Total leads',
        nuevo: 'New',
        contactado: 'Contacted',
        cerrado: 'Closed',
      },
      columns: {
        operation: 'Operation',
        source: 'Source',
        status: 'Status',
        date: 'Received',
      },
      propertyColumns: {
        operation: 'Operation',
        destination: 'Destination',
        type: 'Type',
        price: 'Price',
        rooms: 'Bedrooms',
        bathrooms: 'Bathrooms',
        surface: 'Area',
      },
      statusOptions: {
        nuevo: 'New',
        contactado: 'Contacted',
        visita: 'Visit',
        propuesta: 'Proposal',
        cerrado: 'Closed',
      },
      propertyStatusOptions: {
        draft: 'Draft',
        active: 'Active',
        paused: 'Paused',
        closed: 'Closed',
      },
      propertyFields: {
        title: 'Title',
        reference: 'Reference',
        operation: 'Operation',
        destination: 'Destination',
        type: 'Type',
        priceLabel: 'Visible price',
        priceValue: 'Price',
        surface: 'Area m²',
        rooms: 'Bedrooms',
        bathrooms: 'Bathrooms',
        status: 'Status',
        observations: 'Notes',
        photos: 'Photos',
        publishToPortals: 'Prepare for portals',
        selectedPortals: 'Selected portals',
      },
      propertyFilters: {
        search: 'Search',
        operation: 'Operation',
        destination: 'Destination',
        status: 'Status',
      },
      portalsLabel: 'Portal publishing',
      portalsTitle: 'Track which properties are ready, published or waiting for updates.',
      portalsPanelCopy: 'Prepare the property inside KOHAUS first. Then open the portal, copy the commercial package and save the live URL and status here.',
      portalsEmpty: 'There are no properties prepared for portals yet.',
      portalsSelectionLabel: 'Choose the active portals for each property.',
      portalsSelectionEmpty: 'This property is already prepared, but no portals have been selected yet.',
      managePortals: 'Manage portals',
      openPortal: 'Open portal',
      openListing: 'Open listing',
      copyPortalTitle: 'Copy title',
      copyPortalDescription: 'Copy description',
      savePortal: 'Save portal',
      editPropertyFile: 'Edit property',
      portalReferenceLabel: 'Portal ID / ref',
      portalListingUrlLabel: 'Listing URL',
      portalNotesLabel: 'Publishing notes',
      portalPublishedAtLabel: 'Published',
      portalPortalLabel: 'Portal',
      portalSummaryEmpty: 'Not prepared yet',
      portalSummaryQueued: 'Prepared for portal selection',
      portalSummaryPublished: 'Published in',
      portalSummaryOf: 'of',
      portalSummaryPortals: 'portals',
      portalSummaryNotPublished: 'Not published yet',
      portalFilters: {
        search: 'Search publication',
        portal: 'Portal',
        status: 'Status',
      },
      portalStatusOptions: {
        draft: 'Draft',
        ready: 'Ready to publish',
        posted: 'Posted',
        update_needed: 'Needs update',
        paused: 'Paused',
      },
      visitsLabel: 'Viewing schedule',
      visitsTitle: 'Clear visibility over upcoming visits, pending follow-up and attendance.',
      visitsEmpty: 'There are no visits scheduled yet.',
      visitPanelCopy: 'Schedule visits with context, link them to a client when available, and keep an operational list that is easy to follow.',
      addVisit: 'Schedule visit',
      updateVisit: 'Save visit',
      editVisit: 'Edit visit',
      newVisit: 'New visit',
      calendarLink: 'Add to calendar',
      visitEmail: 'Send email',
      visitReminderTip: 'When creating the event, set an email reminder 3 hours before and invite the client. Ask them to check their reminder and let you know if they need to cancel.',
      visitEmailMissing: 'Add the client email to send the confirmation.',
      leadToClient: 'Create client',
      leadToVisit: 'Schedule visit',
      leadToProperty: 'Create property',
      unlinked: 'Unlinked',
      manualSource: 'Manual',
      visitFields: {
        client: 'Linked client',
        property: 'Property',
        contactName: 'Contact name',
        contactPhone: 'Phone',
        contactEmail: 'Email',
        location: 'Meeting point / address',
        scheduledAt: 'Date and time',
        durationMinutes: 'Duration (min)',
        status: 'Visit status',
        notes: 'Visit notes',
      },
      visitFilters: {
        search: 'Search visit',
        status: 'Status',
      },
      visitColumns: {
        when: 'When',
        contact: 'Contact',
        property: 'Property',
        linkedClient: 'Client',
        source: 'Source',
      },
      visitStatusOptions: {
        scheduled: 'Scheduled',
        confirmed: 'Confirmed',
        completed: 'Completed',
        cancelled: 'Cancelled',
      },
      clientsLabel: 'Buyer and tenant clients',
      clientsTitle: 'Active profiles to match demand with the available portfolio.',
      clientsEmpty: 'There are no saved clients in the panel yet.',
      clientPanelCopy: 'Register real client preferences and let the system prioritise the most compatible properties so the team can work deals with more clarity.',
      addClient: 'Save client',
      updateClient: 'Update client',
      editClient: 'Edit client',
      newClient: 'New client',
      resetClient: 'Cancel editing',
      matchTitle: 'Automatic property matching',
      noMatches: 'There are no compatible properties for this profile yet.',
      clientFields: {
        name: 'Name',
        surname: 'Surname',
        phone: 'Phone',
        email: 'Email',
        operation: 'Operation',
        destinations: 'Desired destinations',
        types: 'Property types',
        budgetMin: 'Minimum budget',
        budgetMax: 'Maximum budget',
        minRooms: 'Minimum bedrooms',
        minSurface: 'Minimum area m²',
        status: 'Client status',
        notes: 'Internal notes',
      },
      clientColumns: {
        budget: 'Budget',
        criteria: 'Criteria',
        contact: 'Contact',
      },
      clientFilters: {
        search: 'Search client',
        operation: 'Operation',
        status: 'Status',
      },
      clientStatusOptions: {
        new: 'New',
        qualified: 'Qualified',
        viewing: 'Booking viewings',
        negotiation: 'Negotiation',
        closed: 'Closed',
      },
      matchReasons: {
        destination: 'Destination aligned',
        type: 'Type aligned',
        budget: 'Budget aligned',
        rooms: 'Bedrooms fit',
        surface: 'Area fits',
        active: 'Active property',
      },
    },
    catalog: {
      all: 'All',
      allFeminine: 'All',
      searchPlaceholder: 'City, neighbourhood or reference',
      selection: 'KOHAUS Selection',
      inMainDestinations: 'our main destinations',
      exampleProperties: 'selected properties',
      filters: {
        search: 'Search',
        destination: 'Destination',
        type: 'Type',
        price: 'Price',
        surface: 'Area',
        rooms: 'Bedrooms',
        bathrooms: 'Bathrooms',
        extras: 'Extras',
        order: 'Sort',
      },
      types: {
        piso: 'Apartment',
        apartamento: 'Apartment',
        atico: 'Penthouse',
        loft: 'Loft',
        casa: 'House',
        villa: 'Villa',
        moradia: 'Villa',
        duplex: 'Duplex',
        studio: 'Studio',
      },
      prices: {
        low: 'Entry',
        mid: 'Mid',
        high: 'High',
      },
      surfaces: {
        s: 'Up to 90 m²',
        m: '90 - 160 m²',
        l: '160+ m²',
      },
      extras: {
        terraza: 'Terrace',
        balcon: 'Balcony',
        vistas: 'Views',
        piscina: 'Pool',
        jardin: 'Garden',
        inversion: 'Investment',
      },
      orderOptions: {
        featured: 'Featured',
        priceAsc: 'Price ascending',
        priceDesc: 'Price descending',
        surfaceDesc: 'Largest area',
      },
      viewListing: 'View listing',
    },
    property: {
      contact: 'Request information',
      inquiryLabel: 'Property information',
      inquiryTitle: 'Would you like to know more about this property?',
      inquiryCopy: 'Leave your details and tell us what you need. We will personally reply with the property information.',
      inquiryMessage: 'What would you like to know?',
      inquirySubmit: 'Send enquiry',
      inquirySuccess: 'Thank you. We have received your enquiry and will be in touch.',
      selection: 'KOHAUS Selection',
      detailsTitle: 'Property details',
      detailsGroups: { overview: 'Information', distribution: 'Layout', areas: 'Areas and surfaces', surroundings: 'Surroundings', features: 'Features' },
      detailLabels: { operation: 'Operation', reference: 'Reference', province: 'Province', municipality: 'Municipality', neighborhood: 'Neighbourhood', type: 'Property type', condition: 'Condition', price: 'Price', usefulSurface: 'Usable area', builtSurface: 'Built area', rooms: 'Bedrooms', bathrooms: 'Bathrooms', floor: 'Floor', numberOfFloors: 'Number of floors', orientation: 'Interior / exterior', buildingYear: 'Construction year', extras: 'Extras', nearCityCenter: 'City centre', nearShops: 'Shops', nearSchools: 'Schools', nearPharmacy: 'Pharmacy', nearParks: 'Parks and gardens', nearPolice: 'Police', nearPublicTransport: 'Public transport' },
      related: 'You may also like',
      relatedTitle: 'Other opportunities selected by KOHAUS.',
      facts: {
        type: 'Type',
        surface: 'Area',
        rooms: 'Bedrooms',
        bathrooms: 'Bathrooms',
        extras: 'Extras',
      },
    },
  },
  pt: {
    nav: {
      buy: 'Comprar',
      rent: 'Alugar',
      sell: 'Vender',
      owners: 'Proprietários',
      language: 'Idioma',
      about: 'Sobre',
      contact: 'Contato',
      dashboard: 'Dashboard',
      signOut: 'Sair',
    },
    footer: {
      description: 'Real estate contemporâneo com curadoria, critério e atendimento próximo.',
      contact: 'Contato',
      social: 'Redes',
      legal: 'Legal',
      legalLinks: ['Aviso legal', 'Privacidade', 'Cookies'],
    },
    home: {
      title: 'Imóveis com valor. Conexões que fazem sentido.',
      copy: 'A KOHAUS une curadoria, conhecimento local e atendimento personalizado para acompanhar decisões imobiliárias com mais clareza e critério.',
      operation: 'Operação',
      destination: 'Destino',
      reference: 'Referência',
      referencePlaceholder: 'Bairro, zona ou código',
      search: 'Buscar',
      featuredLabel: 'Seleção KOHAUS',
      featuredTitle: 'Imóveis em destaque',
      introKicker: 'Curadoria imobiliária',
      introTitle: 'Uma forma mais próxima e contemporânea de viver o real estate.',
      introCopy: 'Selecionamos cada imóvel com intenção e conduzimos cada processo de forma estratégica, discreta e humana. Sem ruído, sem fórmulas genéricas.',
      ownerLabel: 'Para proprietários',
      ownerTitle: 'Seu imóvel merece a estratégia certa.',
      ownerCopy: 'Cuidamos da apresentação, do posicionamento e da conexão com compradores ou inquilinos realmente alinhados ao valor de cada propriedade.',
      rentWithUs: 'Alugar com a gente',
      sellWithUs: 'Vender com a gente',
      exploreLabel: 'Explorar por lugar',
      exploreTitle: 'Uma seleção entre cidade, costa e novos horizontes.',
      seeProperties: 'Ver imóveis',
      aboutLabel: 'Descubra mais sobre nós',
      aboutTitle: 'Uma marca imobiliária feita de conexão, curadoria e visão internacional.',
      aboutCopy: 'Com presença natural entre Barcelona e a Costa Brava, a KOHAUS une conhecimento local e perspectiva internacional, mantendo conexões pontuais com Portugal e Brasil.',
      aboutCta: 'Sobre nós',
    },
    ownerForm: {
      back: 'Voltar',
      label: 'Captação KOHAUS',
      title: 'Pensando em alugar ou vender sua propriedade?',
      copyLead: 'Analisamos cada imóvel com atenção para definir sua melhor apresentação, posicionamento e estratégia comercial.',
      copyDetail: 'Compartilhe as informações essenciais. Nossa equipe irá avaliar os detalhes e entrar em contato para entender o imóvel e os seus objetivos.',
      panelTitle: 'Conte sobre sua propriedade.',
      submit: 'Enviar solicitação',
      success: 'Obrigada. Esta solicitação já ficou salva no dashboard interno da KOHAUS.',
      viewDashboard: 'Ver dashboard',
      legal: 'Li e aceito o aviso legal e a política de privacidade',
      newsletter: 'Aceito receber comunicações comerciais',
      fields: {
        name: 'Nome*',
        surname: 'Sobrenome*',
        phone: 'Telefone*',
        email: 'Email*',
        address: 'Endereço do imóvel',
        city: 'Cidade*',
        operation: 'Tipo de operação',
        source: 'Como nos conheceu',
        comments: 'Conte um pouco mais',
      },
      operations: {
        comprar: 'Comprar com a KOHAUS',
        alquilar: 'Alugar com a KOHAUS',
        vender: 'Vender com a KOHAUS',
      },
      sources: {
        instagram: 'Instagram',
        recommendation: 'Indicação',
        google: 'Google',
        portal: 'Portal imobiliário',
        property_request: 'Pedido sobre um imóvel',
        other: 'Outro',
      },
    },
    auth: {
      badge: 'Acesso privado',
      title: 'Entrar no dashboard interno da KOHAUS',
      copy: 'Só utilizadores autorizados podem abrir leads, imóveis e clientes neste painel interno.',
      email: 'Email',
      password: 'Palavra-passe',
      submit: 'Entrar',
      loading: 'A verificar acesso...',
      unauthorizedTitle: 'Esta conta não tem acesso ao dashboard.',
      unauthorizedCopy: 'O utilizador existe, mas a KOHAUS ainda não lhe deu acesso automático ao dashboard. Executa o schema mais recente no Supabase ou sincroniza `dashboard_users` antes de usar o painel.',
      signedInAs: 'Sessão iniciada como',
      accessGranted: 'Acesso aprovado',
      roleLabel: 'Função',
    },
    dashboard: {
      label: 'Painel interno KOHAUS',
      title: 'Leads recebidos pelo site.',
      empty: 'Ainda não há leads salvos pelo site.',
      sections: {
        overview: 'Dashboard',
        leads: 'Leads',
        properties: 'Imóveis',
        portals: 'Portais',
        visits: 'Visitas',
        tasks: 'Tarefas',
        invoices: 'Faturas',
        opportunities: 'Oportunidades',
        clients: 'Clientes',
      },
      propertiesLabel: 'Gestão de imóveis',
      propertiesTitle: 'Imóveis carregados e prontos para operação interna.',
      propertiesEmpty: 'Ainda não há imóveis salvos no painel.',
      propertyPanelCopy: 'Gerencie a carteira sem poluir a vista. Crie novos imóveis numa camada dedicada e edite os já salvos quando precisar.',
      addProperty: 'Cadastrar novo imóvel',
      openPropertyEditor: 'Novo imóvel',
      editProperty: 'Editar',
      updateProperty: 'Salvar alterações',
      saving: 'Salvando…',
      propertySaved: 'Imóvel atualizado com sucesso.',
      propertyCreated: 'Imóvel salvo com sucesso.',
      propertyDeleted: 'Imóvel excluído.',
      clientSaved: 'Cliente atualizado com sucesso.',
      clientCreated: 'Cliente salvo com sucesso.',
      clientDeleted: 'Cliente excluído.',
      visitSaved: 'Visita atualizada com sucesso.',
      visitCreated: 'Visita salva com sucesso.',
      visitDeleted: 'Visita excluída.',
      portalSaved: 'Publicação atualizada com sucesso.',
      leadSaved: 'Lead atualizado com sucesso.',
      leadDeleted: 'Lead excluído.',
      taskSaved: 'Tarefa atualizada com sucesso.',
      taskDeleted: 'Tarefa excluída.',
      invoiceSaved: 'Fatura salva com sucesso.',
      invoiceIssuerSaved: 'Dados do emissor salvos com sucesso.',
      invoiceDeleted: 'Fatura excluída.',
      deleteClient: 'Excluir cliente',
      deleteLead: 'Excluir lead',
      deleteVisit: 'Excluir visita',
      deleteTask: 'Excluir tarefa',
      deleteInvoice: 'Excluir fatura',
      confirmDelete: 'Excluir “{name}” definitivamente? Esta ação não pode ser desfeita.',
      closeEditor: 'Fechar',
      backToProperties: 'Voltar para imóveis',
      editorCreateEyebrow: 'Novo imóvel',
      editorEditEyebrow: 'Editar imóvel',
      editorCreateTitle: 'Cadastre um imóvel numa camada focada e sem ruído visual.',
      editorEditTitle: '',
      saveObservation: 'Salvar observação',
      historyTitle: 'Histórico interno',
      observationLabel: 'Observações internas',
      statusLabel: 'Status interno',
      photoLabel: 'Fotos do imóvel',
      photoHelp: 'Você pode selecionar várias imagens para este imóvel e arrastá-las para definir a ordem.',
      photoOrderHelp: 'Arraste as fotos para reordenar. A primeira será a principal.',
      removePhoto: 'Remover foto',
      storageMode: hasSupabaseConfig ? 'Supabase active' : 'Modo local',
      stats: {
        total: 'Total de leads',
        nuevo: 'Novos',
        contactado: 'Contactados',
        cerrado: 'Fechados',
      },
      columns: {
        operation: 'Operação',
        source: 'Origem',
        status: 'Status',
        date: 'Entrada',
      },
      propertyColumns: {
        operation: 'Operação',
        destination: 'Destino',
        type: 'Tipo',
        price: 'Preço',
        rooms: 'Quartos',
        bathrooms: 'Banheiros',
        surface: 'Área',
      },
      statusOptions: {
        nuevo: 'Novo',
        contactado: 'Contactado',
        visita: 'Visita',
        propuesta: 'Proposta',
        cerrado: 'Fechado',
      },
      propertyStatusOptions: {
        draft: 'Rascunho',
        active: 'Ativo',
        paused: 'Pausado',
        closed: 'Fechado',
      },
      propertyFields: {
        title: 'Título',
        reference: 'Referência',
        operation: 'Operação',
        destination: 'Destino',
        type: 'Tipo',
        priceLabel: 'Preço visível',
        priceValue: 'Preço',
        surface: 'Área m²',
        rooms: 'Quartos',
        bathrooms: 'Banheiros',
        status: 'Status',
        observations: 'Observações',
        photos: 'Fotos',
        publishToPortals: 'Preparar para portais',
        selectedPortals: 'Portais selecionados',
      },
      propertyFilters: {
        search: 'Buscar',
        operation: 'Operação',
        destination: 'Destino',
        status: 'Status',
      },
      portalsLabel: 'Publicação em portais',
      portalsTitle: 'Controla quais imóveis estão prontos, publicados ou pendentes de atualização.',
      portalsPanelCopy: 'Primeiro preparamos o imóvel dentro da KOHAUS. Depois você abre o portal, copia o pacote comercial e guarda aqui o link e o estado.',
      portalsEmpty: 'Ainda não há imóveis preparados para portais.',
      portalsSelectionLabel: 'Selecione os portais ativos para cada imóvel.',
      portalsSelectionEmpty: 'Este imóvel já está preparado, mas ainda não tem nenhum portal selecionado.',
      managePortals: 'Gerir portais',
      openPortal: 'Abrir portal',
      openListing: 'Abrir anúncio',
      copyPortalTitle: 'Copiar título',
      copyPortalDescription: 'Copiar descrição',
      savePortal: 'Guardar portal',
      editPropertyFile: 'Editar imóvel',
      portalReferenceLabel: 'ID / referência no portal',
      portalListingUrlLabel: 'URL do anúncio',
      portalNotesLabel: 'Notas de publicação',
      portalPublishedAtLabel: 'Publicado',
      portalPortalLabel: 'Portal',
      portalSummaryEmpty: 'Ainda não preparado',
      portalSummaryQueued: 'Preparado para selecionar portais',
      portalSummaryPublished: 'Publicado em',
      portalSummaryOf: 'de',
      portalSummaryPortals: 'portais',
      portalSummaryNotPublished: 'Ainda não publicado',
      portalFilters: {
        search: 'Buscar publicação',
        portal: 'Portal',
        status: 'Estado',
      },
      portalStatusOptions: {
        draft: 'Rascunho',
        ready: 'Pronto para publicar',
        posted: 'Publicado',
        update_needed: 'Atualizar',
        paused: 'Pausado',
      },
      visitsLabel: 'Agenda de visitas',
      visitsTitle: 'Visibilidade clara das próximas visitas, pendências e acompanhamento.',
      visitsEmpty: 'Ainda não há visitas agendadas.',
      visitPanelCopy: 'Agende visitas com contexto, vincule a um cliente quando existir e mantenha uma lista operacional fácil de acompanhar.',
      addVisit: 'Agendar visita',
      updateVisit: 'Salvar visita',
      editVisit: 'Editar visita',
      newVisit: 'Nova visita',
      calendarLink: 'Adicionar ao calendário',
      visitEmail: 'Mandar e-mail',
      visitReminderTip: 'Ao criar o evento, configure um lembrete por e-mail 3 horas antes e convide o cliente. Peça que ele confira o próprio lembrete e avise se precisar cancelar.',
      visitEmailMissing: 'Cadastre o e-mail do cliente para enviar a confirmação.',
      leadToClient: 'Criar cliente',
      leadToVisit: 'Agendar visita',
      leadToProperty: 'Criar imóvel',
      unlinked: 'Sem vínculo',
      manualSource: 'Manual',
      visitFields: {
        client: 'Cliente vinculado',
        property: 'Imóvel',
        contactName: 'Nome do contato',
        contactPhone: 'Telefone',
        contactEmail: 'Email',
        location: 'Ponto de encontro / endereço',
        scheduledAt: 'Data e hora',
        durationMinutes: 'Duração (min)',
        status: 'Status da visita',
        notes: 'Notas da visita',
      },
      visitFilters: {
        search: 'Buscar visita',
        status: 'Status',
      },
      visitColumns: {
        when: 'Quando',
        contact: 'Contato',
        property: 'Imóvel',
        linkedClient: 'Cliente',
        source: 'Origem',
      },
      visitStatusOptions: {
        scheduled: 'Agendada',
        confirmed: 'Confirmada',
        completed: 'Realizada',
        cancelled: 'Cancelada',
      },
      clientsLabel: 'Clientes compradores e inquilinos',
      clientsTitle: 'Perfis ativos para cruzar demanda com a carteira disponível.',
      clientsEmpty: 'Ainda não há clientes salvos no painel.',
      clientPanelCopy: 'Cadastre preferências reais do cliente e deixe o sistema priorizar os imóveis mais compatíveis para trabalhar o fechamento com mais critério.',
      addClient: 'Salvar cliente',
      updateClient: 'Atualizar cliente',
      editClient: 'Editar cliente',
      newClient: 'Novo cliente',
      resetClient: 'Cancelar edição',
      matchTitle: 'Cruzamento automático com imóveis',
      noMatches: 'Ainda não há imóveis compatíveis com esse perfil.',
      clientFields: {
        name: 'Nome',
        surname: 'Sobrenome',
        phone: 'Telefone',
        email: 'Email',
        operation: 'Operação',
        destinations: 'Destinos desejados',
        types: 'Tipologias',
        budgetMin: 'Orçamento mínimo',
        budgetMax: 'Orçamento máximo',
        minRooms: 'Quartos mínimos',
        minSurface: 'Área mínima m²',
        status: 'Status do cliente',
        notes: 'Notas internas',
      },
      clientColumns: {
        budget: 'Orçamento',
        criteria: 'Critérios',
        contact: 'Contato',
      },
      clientFilters: {
        search: 'Buscar cliente',
        operation: 'Operação',
        status: 'Status',
      },
      clientStatusOptions: {
        new: 'Novo',
        qualified: 'Qualificado',
        viewing: 'Marcando visitas',
        negotiation: 'Negociação',
        closed: 'Fechado',
      },
      matchReasons: {
        destination: 'Destino alinhado',
        type: 'Tipologia alinhada',
        budget: 'Orçamento encaixa',
        rooms: 'Cumpre quartos',
        surface: 'Cumpre área',
        active: 'Imóvel ativo',
      },
    },
    catalog: {
      all: 'Todos',
      allFeminine: 'Todas',
      searchPlaceholder: 'Cidade, bairro ou referência',
      selection: 'Seleção KOHAUS',
      inMainDestinations: 'nossos destinos principais',
      exampleProperties: 'imóveis selecionados',
      filters: {
        search: 'Buscar',
        destination: 'Destino',
        type: 'Tipo',
        price: 'Preço',
        surface: 'Área',
        rooms: 'Quartos',
        bathrooms: 'Banheiros',
        extras: 'Extras',
        order: 'Ordem',
      },
      types: {
        piso: 'Apartamento',
        apartamento: 'Apartamento',
        atico: 'Cobertura',
        loft: 'Loft',
        casa: 'Casa',
        villa: 'Vila',
        moradia: 'Moradia',
        duplex: 'Duplex',
        studio: 'Studio',
      },
      prices: {
        low: 'Entrada',
        mid: 'Média',
        high: 'Alta',
      },
      surfaces: {
        s: 'Até 90 m²',
        m: '90 - 160 m²',
        l: '160+ m²',
      },
      extras: {
        terraza: 'Terraço',
        balcon: 'Varanda',
        vistas: 'Vista',
        piscina: 'Piscina',
        jardin: 'Jardim',
        inversion: 'Investimento',
      },
      orderOptions: {
        featured: 'Destaques',
        priceAsc: 'Preço crescente',
        priceDesc: 'Preço decrescente',
        surfaceDesc: 'Maior área',
      },
      viewListing: 'Ver anúncio',
    },
    property: {
      contact: 'Solicitar informação',
      inquiryLabel: 'Informações do imóvel',
      inquiryTitle: 'Quer saber mais sobre este imóvel?',
      inquiryCopy: 'Deixe seus dados e conte o que precisa. Vamos responder pessoalmente com as informações do imóvel.',
      inquiryMessage: 'O que você gostaria de saber?',
      inquirySubmit: 'Enviar pedido',
      inquirySuccess: 'Obrigada. Recebemos seu pedido e entraremos em contato.',
      selection: 'Seleção KOHAUS',
      detailsTitle: 'Detalhes do imóvel',
      detailsGroups: { overview: 'Informações', distribution: 'Distribuição', areas: 'Áreas e superfícies', surroundings: 'Entorno', features: 'Características' },
      detailLabels: { operation: 'Operação', reference: 'Referência', province: 'Província', municipality: 'Município', neighborhood: 'Bairro', type: 'Tipo de imóvel', condition: 'Estado / conservação', price: 'Preço', usefulSurface: 'Área útil', builtSurface: 'Área construída', rooms: 'Quartos', bathrooms: 'Banheiros', floor: 'Andar', numberOfFloors: 'Número de pisos', orientation: 'Interior / exterior', buildingYear: 'Ano de construção', extras: 'Extras', nearCityCenter: 'Centro urbano', nearShops: 'Comércios', nearSchools: 'Escolas', nearPharmacy: 'Farmácia', nearParks: 'Parques e jardins', nearPolice: 'Polícia', nearPublicTransport: 'Transporte público' },
      related: 'Também pode te interessar',
      relatedTitle: 'Outras oportunidades selecionadas pela KOHAUS.',
      facts: {
        type: 'Tipo',
        surface: 'Área',
        rooms: 'Quartos',
        bathrooms: 'Banheiros',
        extras: 'Extras',
      },
    },
  },
}

function createId(prefix) {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`
}

function createFallbackPropertyReference() {
  const existing = readLocalStorage(PROPERTIES_STORAGE_KEY)
  const max = Math.max(114, ...existing.map(p => /^KH[0-9]{4,}$/.test(p.reference) ? Number(p.reference.slice(2)) : 0), Number(localStorage.getItem('kohaus-reference-counter') || 114))
  localStorage.setItem('kohaus-reference-counter', String(max + 1))
  return `KH${String(max + 1).padStart(4, '0')}`
}

function moveItem(items, fromIndex, toIndex) {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) {
    return items
  }

  const next = [...items]
  const [moved] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, moved)
  return next
}

function getPortalDefinition(portalId) {
  return PORTAL_DEFINITIONS.find((portal) => portal.id === portalId) ?? null
}

function normalizePortalPublication(item) {
  return {
    portalId: item?.portalId || '',
    status: item?.status || 'draft',
    listingUrl: safeExternalUrl(item?.listingUrl),
    externalReference: item?.externalReference || '',
    notes: item?.notes || '',
    publishedAt: item?.publishedAt || '',
  }
}

function isPipelinePortalPublication(publication) {
  return normalizePortalPublication(publication).portalId === PORTAL_PIPELINE_ID
}

function getPropertyPortalPublications(property) {
  return (property.portalPublications || [])
    .map(normalizePortalPublication)
    .filter((publication) => publication.portalId && publication.portalId !== PORTAL_PIPELINE_ID)
}

function buildPortalPublications(formState, currentPublications = []) {
  if (!formState.publishToPortals) {
    return []
  }

  const existingByPortal = new Map(
    getPropertyPortalPublications({ portalPublications: currentPublications }).map((publication) => {
      const normalized = normalizePortalPublication(publication)
      return [normalized.portalId, normalized]
    }),
  )
  const existingPipeline = (currentPublications || [])
    .map(normalizePortalPublication)
    .find(isPipelinePortalPublication)

  const selectedPublications = formState.selectedPortals.map((portalId) => {
    const existing = existingByPortal.get(portalId)
    if (existing) {
      return existing
    }

    return {
      portalId,
      status: 'draft',
      listingUrl: '',
      externalReference: '',
      notes: '',
      publishedAt: '',
    }
  })

  if (selectedPublications.length > 0) {
    return selectedPublications
  }

  return [
    existingPipeline || {
      portalId: PORTAL_PIPELINE_ID,
      status: 'draft',
      listingUrl: '',
      externalReference: '',
      notes: '',
      publishedAt: '',
    },
  ]
}

function mapPropertyToForm(property) {
  return {
    ownerClientId: property.ownerClientId || '',
    privateAddress: property.privateAddress || '',
    offMarket: Boolean(property.offMarket),
    title: property.title,
    reference: property.reference,
    operation: property.operation,
    destination: property.destination,
    type: property.type,
    priceLabel: property.priceLabel,
    currency: property.currency || 'EUR',
    priceValue: String(propertyPrice(property) ?? ''),
    surface: String(property.surface || ''),
    rooms: String(property.rooms || ''),
    bathrooms: String(property.bathrooms || ''),
    status: property.status,
    observations: property.observations || '',
    photos: property.photos || [],
    publishToPortals: Boolean(property.portalPublications?.length),
    selectedPortals: (property.portalPublications || []).map((publication) => publication.portalId).filter(Boolean),
    portalData: { ...PROPERTY_FORM_DEFAULTS.portalData, ...(property.portalData || {}), extras: propertyExtras(property) },
  }
}

function getPortalRequiredFields(property) {
  const portalData = property.portalData || {}
  return [
    ['title', property.title], ['price', property.priceValue], ['type', property.type],
    ['rooms', property.rooms], ['bathrooms', property.bathrooms], ['surface', property.surface],
    ['street', portalData.street], ['streetNumber', portalData.streetNumber],
    ['postalCode', portalData.postalCode], ['municipality', portalData.municipality],
    ['province', portalData.province], ['cadastralReference', portalData.cadastralReference],
    ['energyConsumptionRating', portalData.energyConsumptionRating],
    ['energyConsumptionValue', portalData.energyConsumptionValue],
    ['energyEmissionsRating', portalData.energyEmissionsRating],
    ['energyEmissionsValue', portalData.energyEmissionsValue],
    ['contactName', portalData.contactName], ['contactPhone', portalData.contactPhone],
    ['contactEmail', portalData.contactEmail], ['photos', property.photos?.length],
  ]
}

function getPortalMissingFields(property) {
  return getPortalRequiredFields(property).filter(([, value]) => value === '' || value === null || value === undefined || value === 0)
}

function getPortalFormCopy(language) {
  const content = {
    es: { title: 'Datos para portales', help: 'Información exigida para validar y exportar el anuncio.', select: 'Publicar en portales', selectHelp: 'Selecciona los portales; se crearán como borradores.', draft: 'Borrador', missing: 'campos pendientes', api: 'API pendiente', publish: 'Publicar', fields: ['Calle', 'Número', 'Código postal', 'Municipio', 'Provincia', 'Población / barrio', 'Latitud', 'Longitud', 'Planta', 'Puerta', 'Estado del inmueble', 'Año de construcción', 'Superficie útil m²', 'Superficie construida m²', 'Número de plantas', 'Interior / exterior', 'Referencia catastral', 'URL del certificado energético', 'Consumo energético (A-G)', 'Consumo kWh/m² año', 'Emisiones (A-G)', 'Emisiones kg CO₂/m² año', 'Nombre de contacto', 'Teléfono de contacto', 'Email de contacto'] },
    en: { title: 'Portal data', help: 'Information required to validate and export the listing.', select: 'Publish to portals', selectHelp: 'Select portals; each one will be created as a draft.', draft: 'Draft', missing: 'missing fields', api: 'API pending', publish: 'Publish', fields: ['Street', 'Number', 'Postcode', 'Municipality', 'Province', 'Neighbourhood', 'Latitude', 'Longitude', 'Floor', 'Door', 'Property condition', 'Construction year', 'Usable area m²', 'Built area m²', 'Number of floors', 'Interior / exterior', 'Cadastral reference', 'Energy certificate URL', 'Energy consumption (A-G)', 'Consumption kWh/m² year', 'Emissions (A-G)', 'Emissions kg CO₂/m² year', 'Contact name', 'Contact phone', 'Contact email'] },
    pt: { title: 'Dados para portais', help: 'Informações necessárias para validar e exportar o anúncio.', select: 'Publicar nos portais', selectHelp: 'Selecione os portais; cada um será criado como rascunho.', draft: 'Rascunho', missing: 'campos pendentes', api: 'API pendente', publish: 'Publicar', fields: ['Rua', 'Número', 'Código postal', 'Município', 'Província', 'Bairro', 'Latitude', 'Longitude', 'Andar', 'Porta', 'Estado do imóvel', 'Ano de construção', 'Área útil m²', 'Área construída m²', 'Número de pisos', 'Interior / exterior', 'Referência cadastral', 'URL do certificado energético', 'Consumo energético (A-G)', 'Consumo kWh/m² ano', 'Emissões (A-G)', 'Emissões kg CO₂/m² ano', 'Nome de contato', 'Telefone de contato', 'Email de contato'] },
  }
  return content[language] || content.es
}

function getPortalEnvironmentCopy(language) {
  const content = {
    es: { title: 'Entorno', fields: ['Centro urbano', 'Comercios', 'Escuelas', 'Farmacia', 'Parques y jardines', 'Policía', 'Transporte público'] },
    en: { title: 'Surroundings', fields: ['City centre', 'Shops', 'Schools', 'Pharmacy', 'Parks and gardens', 'Police', 'Public transport'] },
    pt: { title: 'Entorno', fields: ['Centro urbano', 'Comércios', 'Escolas', 'Farmácia', 'Parques e jardins', 'Polícia', 'Transporte público'] },
  }
  return content[language] || content.es
}

const PORTAL_ENVIRONMENT_FIELDS = ['nearCityCenter', 'nearShops', 'nearSchools', 'nearPharmacy', 'nearParks', 'nearPolice', 'nearPublicTransport']

function mapPhotosToEditorItems(photos) {
  return (photos || []).map((photo) => ({
    queueId: `existing-${photo.id}`,
    source: 'existing',
    photo,
    name: photo.name || '',
    url: photo.url,
  }))
}

function createEditorItemsFromFiles(files) {
  return files.map((file) => ({
    queueId: createId('queued-photo'),
    source: 'new',
    file,
    name: file.name,
    url: URL.createObjectURL(file),
  }))
}

function revokeEditorItemUrls(items) {
  items.forEach((item) => {
    if (item.source === 'new') {
      URL.revokeObjectURL(item.url)
    }
  })
}

function formatCalendarDate(date) {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  const hours = String(date.getUTCHours()).padStart(2, '0')
  const minutes = String(date.getUTCMinutes()).padStart(2, '0')
  const seconds = String(date.getUTCSeconds()).padStart(2, '0')
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`
}

function buildGoogleCalendarLink(visit, property, client, language = 'es') {
  if (!visit.scheduledAt) {
    return ''
  }

  const start = new Date(visit.scheduledAt)
  if (Number.isNaN(start.getTime())) {
    return ''
  }

  const durationMinutes = Number(visit.durationMinutes || 60)
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000)
  const message = visitMessage(visit, property, client, language)
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: message.subject,
    dates: `${formatCalendarDate(start)}/${formatCalendarDate(end)}`,
    details: message.body,
    add: visit.contactEmail || client?.email || '',
    location: property?.privateAddress || visit.location || property?.title || '',
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

function buildPortalDescription(property, language) {
  const destination = getDestinationMeta(property.destination, language).name
  const operation = getOperationLabel(property.operation, language)
  const roomLabel = COPY[language].dashboard.propertyColumns.rooms.toLowerCase()
  const bathroomLabel = COPY[language].dashboard.propertyColumns.bathrooms.toLowerCase()
  const surfaceLabel = COPY[language].dashboard.propertyColumns.surface.toLowerCase()

  return [
    `Ref ${property.reference}`,
    property.title,
    `${operation} · ${destination}`,
    property.rooms ? `${property.rooms} ${roomLabel}` : '',
    property.bathrooms ? `${property.bathrooms} ${bathroomLabel}` : '',
    property.surface ? `${property.surface} ${surfaceLabel}` : '',
    property.priceLabel || '',
    property.observations || '',
  ]
    .filter(Boolean)
    .join(' · ')
}

function getDashboardPortalItems(properties) {
  return properties.filter((property) => (property.portalPublications || []).length > 0)
}

function filterDashboardPortalItems(items, filters) {
  return items.filter((property) => {
    const publications = getPropertyPortalPublications(property)
    const matchesPortal =
      filters.portal === 'all' || publications.some((publication) => publication.portalId === filters.portal)
    const matchesStatus =
      filters.status === 'all' || publications.some((publication) => publication.status === filters.status)
    const search = filters.search.trim().toLowerCase()
    const portalNames = publications
      .map((publication) => getPortalDefinition(publication.portalId)?.name.toLowerCase() || '')
      .join(' ')
    const matchesSearch =
      !search ||
      property.title.toLowerCase().includes(search) ||
      property.reference.toLowerCase().includes(search) ||
      portalNames.includes(search)

    return matchesPortal && matchesStatus && matchesSearch
  })
}

function getDateTimestamp(value) {
  const timestamp = new Date(value).getTime()
  return Number.isNaN(timestamp) ? 0 : timestamp
}

function toDatetimeLocalValue(value) {
  if (!value) {
    return ''
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const offset = date.getTimezoneOffset()
  const localDate = new Date(date.getTime() - offset * 60 * 1000)
  return localDate.toISOString().slice(0, 16)
}

function inferDestinationFromLead(lead) {
  const haystack = [lead.city, lead.address, lead.comments]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  if (haystack.includes('costa brava')) {
    return 'costa-brava'
  }
  if (haystack.includes('portugal') || haystack.includes('lisboa') || haystack.includes('lisbon')) {
    return 'portugal'
  }
  if (haystack.includes('brasil') || haystack.includes('brazil')) {
    return 'brasil'
  }

  return 'barcelona'
}

function createHistoryEntry(text) {
  return {
    id: createId('history'),
    text,
    createdAt: new Date().toISOString(),
  }
}

function getDestinationMeta(slug, language) {
  const content = {
    barcelona: {
      es: { name: 'Barcelona', description: 'Capital urbana, diseño, inversión y vida mediterránea.' },
      en: { name: 'Barcelona', description: 'Urban capital, design, investment and Mediterranean living.' },
      pt: { name: 'Barcelona', description: 'Capital urbana, design, investimento e vida mediterrânea.' },
    },
    'costa-brava': {
      es: { name: 'Costa Brava', description: 'Costa, refugio y propiedades con ritmo más silencioso.' },
      en: { name: 'Costa Brava', description: 'Coast, retreat and properties with a quieter rhythm.' },
      pt: { name: 'Costa Brava', description: 'Costa, refúgio e propriedades com ritmo mais silencioso.' },
    },
    portugal: {
      es: { name: 'Portugal', description: 'Ciudad, costa y operaciones con mirada internacional.' },
      en: { name: 'Portugal', description: 'City, coast and transactions with an international lens.' },
      pt: { name: 'Portugal', description: 'Cidade, costa e operações com olhar internacional.' },
    },
    brasil: {
      es: { name: 'Brasil', description: 'Selecciones con clima, escala y vocación de segunda residencia.' },
      en: { name: 'Brazil', description: 'Selections with climate, scale and second-home appeal.' },
      pt: { name: 'Brasil', description: 'Seleções com clima, escala e vocação de segunda residência.' },
    },
  }

  return content[normalizeCity(slug)]?.[language] ?? { name: capitalizeCity(slug), description: '' }
}

function getOperationLabel(operation, language) {
  const labels = {
    comprar: COPY[language].nav.buy,
    alquilar: COPY[language].nav.rent,
  }

  return labels[operation] ?? COPY[language].nav.buy
}

function getTypeLabel(type, language) {
  return COPY[language].catalog.types[type] ?? type
}

function getCatalogTypeOptions(properties, language) {
  return [...new Set(properties.map((property) => property.type))].map((type) => ({
    value: type,
    label: getTypeLabel(type, language),
  }))
}

function getPriceTriggerLabel() {
  return 'Any'
}

function parseRoute() {
  const params = new URLSearchParams(window.location.search)
  const view = params.get('view') ?? 'home'
  const language = params.get('lang')
  const operation = params.get('op') ?? (view === 'off-market' ? 'all' : HOME_SEARCH_DEFAULTS.operation)
  const destination = params.get('dest') ?? (view === 'off-market' ? 'todos' : HOME_SEARCH_DEFAULTS.destination)
  const reference = params.get('ref') ?? ''
  const propertyId = params.get('id') ?? ''
  const leadType = params.get('lead') ?? OWNER_FORM_DEFAULTS.operation
  const dashboardSection = params.get('section') ?? DASHBOARD_SECTION_DEFAULT

  return {
    view,
    language: LANGUAGES.includes(language) ? language : detectLanguage(),
    operation,
    destination,
    reference,
    propertyId,
    leadType,
    dashboardSection,
  }
}

function detectLanguage() {
  const remembered = readPreferredLanguage()
  if (LANGUAGES.includes(remembered)) return remembered
  return preferredLanguage(navigator.languages?.length ? navigator.languages : [navigator.language])
}

function toSearch(route) {
  const params = new URLSearchParams()

  if (route.view && route.view !== 'home') {
    params.set('view', route.view)
  }

  if (route.language) {
    params.set('lang', route.language)
  }

  if (route.operation) {
    params.set('op', route.operation)
  }

  if (route.destination) {
    params.set('dest', route.destination)
  }

  if (route.reference) {
    params.set('ref', route.reference)
  }

  if (route.propertyId) {
    params.set('id', route.propertyId)
  }

  if (route.leadType && route.view === 'captacion') {
    params.set('lead', route.leadType)
  }

  if (route.dashboardSection && route.view === 'dashboard') {
    params.set('section', route.dashboardSection)
  }

  const search = params.toString()
  return search ? `?${search}` : '/'
}

function readLocalStorage(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function writeLocalStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

function getLocalDashboardProperties() {
  const storedProperties = readLocalStorage(PROPERTIES_STORAGE_KEY)

  if (storedProperties.length > 0) {
    return storedProperties.map((property) => ({
      ...property,
      portalPublications: Array.isArray(property.portalPublications)
        ? property.portalPublications.map(normalizePortalPublication)
        : [],
    }))
  }

  return []
}

async function fetchOwnerLeads() {
  if (!hasSupabaseConfig || !supabase) {
    return readLocalStorage(LEADS_STORAGE_KEY)
  }

  const { data, error } = await supabase.from('owner_leads').select('*').order('created_at', { ascending: false })
  if (error) {
    throw error
  }

  return data.map(mapLeadFromSupabase)
}

async function saveOwnerLead(payload) {
  if (!hasSupabaseConfig || !supabase) {
    const nextLead = {
      ...payload,
      id: createId('lead'),
      createdAt: new Date().toISOString(),
      status: 'nuevo',
    }
    const next = [nextLead, ...readLocalStorage(LEADS_STORAGE_KEY)]
    writeLocalStorage(LEADS_STORAGE_KEY, next)
    return next
  }

  const insertPayload = {
    id: createId('lead'),
    language: payload.language || 'es',
    name: payload.name,
    surname: payload.surname,
    phone: payload.phone,
    email: payload.email,
    address: payload.address,
    city: payload.city,
    operation: payload.operation,
    source: payload.source,
    comments: payload.comments,
    legal_accepted: payload.legalAccepted,
    newsletter_accepted: payload.newsletterAccepted,
    status: 'nuevo',
  }

  const token = await botCheck(insertPayload.language)
  const response = await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lead: insertPayload, token }) })
  if (!response.ok) throw new Error(response.status === 429 ? 'Muitas tentativas. Aguarde um minuto e tente novamente.' : 'Não foi possível enviar. Tente novamente ou entre em contato por e-mail.')

  // Public submissions must not require read access to the private leads table.
  return [mapLeadFromSupabase({ ...insertPayload, created_at: new Date().toISOString() })]
}

async function updateLeadStatus(id, status) {
  if (!hasSupabaseConfig || !supabase) {
    const next = readLocalStorage(LEADS_STORAGE_KEY).map((lead) => (lead.id === id ? { ...lead, status } : lead))
    writeLocalStorage(LEADS_STORAGE_KEY, next)
    return next
  }

  const { error } = await supabase.from('owner_leads').update({ status }).eq('id', id)
  if (error) {
    throw error
  }

  return fetchOwnerLeads()
}

async function deleteDashboardRecord(table, id, database = supabase, databaseEnabled = hasSupabaseConfig) {
  if (!databaseEnabled || !database) return

  const { data, error } = await database.from(table).delete().eq('id', id).select('id')
  if (error) throw error
  if (!data?.some((record) => record.id === id)) throw new Error('O registro não foi encontrado ou não pode ser excluído.')
}

async function fetchDashboardProperties(database = supabase, databaseEnabled = hasSupabaseConfig) {
  if (!databaseEnabled || !database) {
    return getLocalDashboardProperties()
  }

  let { data, error } = await database
    .from('dashboard_properties')
    .select('*,property_private(address,owner_client_id)')
    .order('created_at', { ascending: false })

  // Keep existing records readable while the additive owner migration is pending.
  // Do not suppress permission, network or unrelated schema errors.
  if (error?.code === '42703' && error.message?.includes('owner_client_id')) {
    const legacy = await database.from('dashboard_properties')
      .select('*,property_private(address)').order('created_at', { ascending: false })
    data = legacy.data
    error = legacy.error
  }
  if (error) throw error

  return signPropertyPhotos(data.map(mapPropertyFromSupabase), database, getPropertyMediaBucket())
}

function publicProperty(property) {
  const { id, createdAt, title, reference, operation, destination, type, priceValue, priceLabel, currency, surface, rooms, bathrooms, status, offMarket } = property
  return { id, createdAt, title, reference, operation, destination, type, priceValue, priceLabel, currency, surface, rooms, bathrooms, status, offMarket, observations: offMarket ? '' : property.observations || '', photos: offMarket ? [] : property.photos || [], portalData: offMarket ? {} : Object.fromEntries(Object.entries(property.portalData || {}).filter(([key]) => ['translations','province','municipality','neighborhood','condition','usefulSurface','builtSurface','orientation','buildingYear','energyConsumptionRating','energyEmissionsRating','nearCityCenter','nearShops','nearSchools','nearPharmacy','nearParks','nearPolice','nearPublicTransport','numberOfFloors'].includes(key))), extras: offMarket ? [] : propertyExtras(property) }
}

async function fetchPublishedProperties(database = supabase, databaseEnabled = hasSupabaseConfig) {
  if (!databaseEnabled || !database) {
    return getLocalDashboardProperties().filter(isPublishedListing).map(publicProperty)
  }

  const { data, error } = await database
    .from('public_properties')
    .select('*')
    .in('status', ['active', 'closed'])
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return signPropertyPhotos(data.map(mapPropertyFromSupabase), database, getPropertyMediaBucket())
}

async function uploadPhotos(files) {
  if (!files.length) {
    return []
  }

  if (!hasSupabaseConfig || !supabase) {
    return Promise.all(files.map(fileToLocalPhoto))
  }

  const bucket = getPropertyMediaBucket()
  const uploaded = []

  for (const file of files) {
    const extension = await validatePhotoContent(file)
    const path = `${crypto.randomUUID()}.${extension}`
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    })

    if (error) {
      throw error
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    uploaded.push({
      id: createId('photo'),
      name: file.name,
      url: data.publicUrl,
      path,
    })
  }

  return uploaded
}

async function resolvePropertyPhotos(photoItems) {
  const newPhotoItems = photoItems.filter((item) => item.source === 'new')
  const uploadedPhotos = await uploadPhotos(newPhotoItems.map((item) => item.file))
  const uploadedByQueueId = new Map(newPhotoItems.map((item, index) => [item.queueId, uploadedPhotos[index]]))

  return photoItems
    .map((item) => {
      if (item.source === 'existing') {
        return item.photo
      }

      return uploadedByQueueId.get(item.queueId) ?? null
    })
    .filter(Boolean)
}

async function saveDashboardProperty(formState, orderedPhotos, database = supabase, databaseEnabled = hasSupabaseConfig) {
  const propertyId = formState.requestId || createId('property')
  const nextProperty = {
    id: propertyId,
    createdAt: new Date().toISOString(),
    ownerClientId: formState.ownerClientId || '',
    privateAddress: formState.privateAddress || '',
    offMarket: Boolean(formState.offMarket),
    title: formState.title,
    reference: formState.reference.trim(),
    operation: formState.operation,
    destination: normalizeCity(formState.destination),
    type: formState.type,
    ...priceFields(formState.priceValue, formState.currency || 'EUR'),
    currency: formState.currency || 'EUR',
    surface: Number(formState.surface || 0),
    rooms: Number(formState.rooms || 0),
    bathrooms: Number(formState.bathrooms || 0),
    status: formState.status,
    observations: formState.observations,
    portalData: formState.portalData || PROPERTY_FORM_DEFAULTS.portalData,
    history: [createHistoryEntry('Property created from dashboard form.')],
    photos: orderedPhotos,
    portalPublications: buildPortalPublications(formState),
  }

  if (!databaseEnabled || !database) {
    if (readLocalStorage(PROPERTIES_STORAGE_KEY).some(p=>p.id===propertyId)) return readLocalStorage(PROPERTIES_STORAGE_KEY)
    nextProperty.reference ||= createFallbackPropertyReference()
    const next = [nextProperty, ...readLocalStorage(PROPERTIES_STORAGE_KEY)]
    writeLocalStorage(PROPERTIES_STORAGE_KEY, next)
    return next
  }

  const insertPayload = {
    id: propertyId,
    owner_client_id: nextProperty.ownerClientId,
    off_market: nextProperty.offMarket,
    title: nextProperty.title,
    operation: nextProperty.operation,
    destination: nextProperty.destination,
    type: nextProperty.type,
    price_value: nextProperty.priceValue,
    currency: nextProperty.currency,
    surface: nextProperty.surface,
    rooms: nextProperty.rooms,
    bathrooms: nextProperty.bathrooms,
    status: nextProperty.status,
    observations: nextProperty.observations,
    history: nextProperty.history,
    photos: photosForStorage(nextProperty.photos, database, getPropertyMediaBucket()),
    portal_publications: nextProperty.portalPublications,
    portal_data: nextProperty.portalData,
  }

  if (nextProperty.reference) {
    insertPayload.reference = nextProperty.reference
  }

  const { error } = formState.privateAddress !== undefined
    ? await database.rpc('save_property_with_address', { p_property: insertPayload, p_address: nextProperty.privateAddress })
    : await database.from('dashboard_properties').insert(insertPayload)
  if (error) throw error

  return fetchDashboardProperties(database, true)
}

async function updateDashboardProperty(id, patch, database = supabase, databaseEnabled = hasSupabaseConfig) {
  if (!databaseEnabled || !database) {
    const next = readLocalStorage(PROPERTIES_STORAGE_KEY).map((property) =>
      property.id === id ? { ...property, ...patch } : property,
    )
    writeLocalStorage(PROPERTIES_STORAGE_KEY, next)
    return next
  }

  const supabasePatch = {}

  if (patch.title !== undefined) {
    supabasePatch.title = patch.title
  }
  if (patch.reference !== undefined) {
    supabasePatch.reference = patch.reference
  }
  if (patch.operation !== undefined) {
    supabasePatch.operation = patch.operation
  }
  if (patch.destination !== undefined) {
    supabasePatch.destination = patch.destination
  }
  if (patch.type !== undefined) {
    supabasePatch.type = patch.type
  }
  if (patch.currency !== undefined) supabasePatch.currency = patch.currency
  if (patch.offMarket !== undefined) supabasePatch.off_market = patch.offMarket
  if (patch.priceValue !== undefined) {
    supabasePatch.price_value = patch.priceValue
  }
  if (patch.surface !== undefined) {
    supabasePatch.surface = patch.surface
  }
  if (patch.rooms !== undefined) {
    supabasePatch.rooms = patch.rooms
  }
  if (patch.bathrooms !== undefined) {
    supabasePatch.bathrooms = patch.bathrooms
  }
  if (patch.status !== undefined) {
    supabasePatch.status = patch.status
  }
  if (patch.observations !== undefined) {
    supabasePatch.observations = patch.observations
  }
  if (patch.history !== undefined) {
    supabasePatch.history = patch.history
  }
  if (patch.photos !== undefined) {
    supabasePatch.photos = photosForStorage(patch.photos, database, getPropertyMediaBucket())
  }
  if (patch.portalPublications !== undefined) {
    supabasePatch.portal_publications = patch.portalPublications
  }
  if (patch.portalData !== undefined) {
    supabasePatch.portal_data = patch.portalData
  }

  if (patch.ownerClientId !== undefined) supabasePatch.owner_client_id = patch.ownerClientId
  const { error } = patch.privateAddress !== undefined
    ? await database.rpc('save_property_with_address', { p_id: id, p_property: supabasePatch, p_address: patch.privateAddress })
    : await database.from('dashboard_properties').update(supabasePatch).eq('id', id)
  if (error) throw error

  return fetchDashboardProperties(database, true)
}

async function fetchDashboardClients() {
  if (!hasSupabaseConfig || !supabase) {
    return readLocalStorage(CLIENTS_STORAGE_KEY)
  }

  const { data, error } = await supabase.from('dashboard_clients').select('*').order('created_at', { ascending: false })
  if (error) {
    throw error
  }

  return data.map(mapClientFromSupabase)
}

async function saveDashboardClient(formState) {
  const nextClient = {
    id: formState.requestId || createId('client'),
    createdAt: new Date().toISOString(),
    language: formState.language || 'es',
    name: formState.name,
    surname: formState.surname,
    phone: formState.phone,
    email: formState.email,
    operation: formState.operation,
    destinations: formState.destinations,
    types: normalizeTypes(formState.types),
    budgetMin: parseBudget(formState.budgetMin),
    budgetMax: parseBudget(formState.budgetMax),
    currency: formState.currency || 'EUR',
    minRooms: Number(formState.minRooms || 0),
    minBathrooms: Number(formState.minBathrooms || 0),
    requiredExtras: formState.requiredExtras || [],
    minSurface: Number(formState.minSurface || 0),
    status: formState.status,
    notes: formState.notes,
    history: [createHistoryEntry('Client profile created from dashboard.')],
  }

  if (!hasSupabaseConfig || !supabase) {
    if (readLocalStorage(CLIENTS_STORAGE_KEY).some(c=>c.id===nextClient.id)) return readLocalStorage(CLIENTS_STORAGE_KEY)
    const next = [nextClient, ...readLocalStorage(CLIENTS_STORAGE_KEY)]
    writeLocalStorage(CLIENTS_STORAGE_KEY, next)
    return next
  }

  const { error } = await supabase.from('dashboard_clients').insert({
    id: nextClient.id,
    language: nextClient.language,
    name: nextClient.name,
    surname: nextClient.surname,
    phone: nextClient.phone,
    email: nextClient.email,
    operation: nextClient.operation,
    destinations: nextClient.destinations,
    types: nextClient.types,
    budget_min: nextClient.budgetMin,
    budget_max: nextClient.budgetMax,
    currency: nextClient.currency,
    min_rooms: nextClient.minRooms,
    min_bathrooms: nextClient.minBathrooms,
    required_extras: nextClient.requiredExtras,
    min_surface: nextClient.minSurface,
    status: nextClient.status,
    notes: nextClient.notes,
    history: nextClient.history,
  })

  if (error) {
    if (formState.requestId && error.code === '23505') {
      const existing = await fetchDashboardClients()
      if(existing.some(c=>c.id===nextClient.id)) return existing
    }
    throw error
  }

  return fetchDashboardClients()
}

async function updateDashboardClient(id, patch) {
  if (!hasSupabaseConfig || !supabase) {
    const next = readLocalStorage(CLIENTS_STORAGE_KEY).map((client) => (client.id === id ? { ...client, ...patch } : client))
    writeLocalStorage(CLIENTS_STORAGE_KEY, next)
    return next
  }

  const supabasePatch = {}
  if (patch.name !== undefined) {
    supabasePatch.name = patch.name
  }
  if (patch.surname !== undefined) {
    supabasePatch.surname = patch.surname
  }
  if (patch.phone !== undefined) {
    supabasePatch.phone = patch.phone
  }
  if (patch.email !== undefined) {
    supabasePatch.email = patch.email
  }
  if (patch.operation !== undefined) {
    supabasePatch.operation = patch.operation
  }
  if (patch.destinations !== undefined) {
    supabasePatch.destinations = patch.destinations
  }
  if (patch.types !== undefined) {
    supabasePatch.types = patch.types
  }
  if (patch.budgetMin !== undefined) {
    supabasePatch.budget_min = patch.budgetMin
  }
  if (patch.currency !== undefined) supabasePatch.currency = patch.currency
  if (patch.language !== undefined) supabasePatch.language = patch.language
  if (patch.budgetMax !== undefined) {
    supabasePatch.budget_max = patch.budgetMax
  }
  if (patch.minBathrooms !== undefined) supabasePatch.min_bathrooms = patch.minBathrooms
  if (patch.requiredExtras !== undefined) supabasePatch.required_extras = patch.requiredExtras
  if (patch.minRooms !== undefined) {
    supabasePatch.min_rooms = patch.minRooms
  }
  if (patch.minSurface !== undefined) {
    supabasePatch.min_surface = patch.minSurface
  }
  if (patch.status !== undefined) {
    supabasePatch.status = patch.status
  }
  if (patch.notes !== undefined) {
    supabasePatch.notes = patch.notes
  }
  if (patch.history !== undefined) {
    supabasePatch.history = patch.history
  }

  const { error } = await supabase.from('dashboard_clients').update(supabasePatch).eq('id', id)
  if (error) {
    throw error
  }

  return fetchDashboardClients()
}

async function fetchDashboardVisits() {
  if (!hasSupabaseConfig || !supabase) {
    return readLocalStorage(VISITS_STORAGE_KEY)
  }

  const { data, error } = await supabase.from('dashboard_visits').select('*').order('scheduled_at', { ascending: true })
  if (error) {
    throw error
  }

  return data.map(mapVisitFromSupabase)
}

async function saveDashboardVisit(formState) {
  const nextVisit = {
    id: createId('visit'),
    createdAt: new Date().toISOString(),
    clientId: formState.clientId || '',
    propertyId: formState.propertyId || '',
    leadId: formState.leadId || '',
    contactName: formState.contactName,
    contactPhone: formState.contactPhone,
    contactEmail: formState.contactEmail,
    location: formState.location,
    scheduledAt: formState.scheduledAt,
    durationMinutes: Number(formState.durationMinutes || 60),
    status: formState.status,
    notes: formState.notes,
    history: [createHistoryEntry('Visit created from dashboard.')],
  }

  if (!hasSupabaseConfig || !supabase) {
    const next = [...readLocalStorage(VISITS_STORAGE_KEY), nextVisit].sort(
      (left, right) => getDateTimestamp(left.scheduledAt) - getDateTimestamp(right.scheduledAt),
    )
    writeLocalStorage(VISITS_STORAGE_KEY, next)
    return next
  }

  const { error } = await supabase.from('dashboard_visits').insert({
    id: nextVisit.id,
    client_id: nextVisit.clientId || null,
    property_id: nextVisit.propertyId || null,
    lead_id: nextVisit.leadId || null,
    contact_name: nextVisit.contactName,
    contact_phone: nextVisit.contactPhone,
    contact_email: nextVisit.contactEmail,
    location: nextVisit.location,
    scheduled_at: nextVisit.scheduledAt,
    duration_minutes: nextVisit.durationMinutes,
    status: nextVisit.status,
    notes: nextVisit.notes,
    history: nextVisit.history,
  })

  if (error) {
    throw error
  }

  return fetchDashboardVisits()
}

async function updateDashboardVisit(id, patch) {
  if (!hasSupabaseConfig || !supabase) {
    const next = readLocalStorage(VISITS_STORAGE_KEY)
      .map((visit) => (visit.id === id ? { ...visit, ...patch } : visit))
      .sort((left, right) => getDateTimestamp(left.scheduledAt) - getDateTimestamp(right.scheduledAt))
    writeLocalStorage(VISITS_STORAGE_KEY, next)
    return next
  }

  const supabasePatch = {}

  if (patch.clientId !== undefined) {
    supabasePatch.client_id = patch.clientId || null
  }
  if (patch.propertyId !== undefined) {
    supabasePatch.property_id = patch.propertyId || null
  }
  if (patch.leadId !== undefined) {
    supabasePatch.lead_id = patch.leadId || null
  }
  if (patch.contactName !== undefined) {
    supabasePatch.contact_name = patch.contactName
  }
  if (patch.contactPhone !== undefined) {
    supabasePatch.contact_phone = patch.contactPhone
  }
  if (patch.contactEmail !== undefined) {
    supabasePatch.contact_email = patch.contactEmail
  }
  if (patch.location !== undefined) {
    supabasePatch.location = patch.location
  }
  if (patch.scheduledAt !== undefined) {
    supabasePatch.scheduled_at = patch.scheduledAt
  }
  if (patch.durationMinutes !== undefined) {
    supabasePatch.duration_minutes = patch.durationMinutes
  }
  if (patch.status !== undefined) {
    supabasePatch.status = patch.status
  }
  if (patch.notes !== undefined) {
    supabasePatch.notes = patch.notes
  }
  if (patch.history !== undefined) {
    supabasePatch.history = patch.history
  }

  const { error } = await supabase.from('dashboard_visits').update(supabasePatch).eq('id', id)
  if (error) {
    throw error
  }

  return fetchDashboardVisits()
}

function mapLeadFromSupabase(row) {
  return {
    language: row.language || null,
    id: row.id,
    createdAt: row.created_at,
    name: row.name,
    surname: row.surname,
    phone: row.phone,
    email: row.email,
    address: row.address ?? '',
    city: row.city,
    operation: row.operation,
    source: row.source,
    comments: row.comments ?? '',
    status: row.status,
    legalAccepted: row.legal_accepted,
    newsletterAccepted: row.newsletter_accepted,
  }
}

function mapPropertyFromSupabase(row) {
  return {
    ownerClientId: row.property_private?.owner_client_id || '',
    privateAddress: row.property_private?.address || '',
    offMarket: Boolean(row.off_market),
    id: row.id,
    createdAt: row.created_at,
    title: row.title,
    reference: row.reference,
    operation: row.operation,
    destination: row.destination,
    type: row.type,
    currency: row.currency || 'EUR',
    ...priceFields(row.price_value, row.currency || 'EUR'),
    surface: Number(row.surface || 0),
    rooms: Number(row.rooms || 0),
    bathrooms: Number(row.bathrooms || 0),
    status: row.status,
    observations: row.observations ?? '',
    portalData: { ...PROPERTY_FORM_DEFAULTS.portalData, ...(row.portal_data || {}) },
    history: Array.isArray(row.history) ? row.history : [],
    photos: Array.isArray(row.photos) ? row.photos : [],
    portalPublications: Array.isArray(row.portal_publications) ? row.portal_publications.map(normalizePortalPublication) : [],
  }
}

function mapClientFromSupabase(row) {
  return {
    language: row.language || null,
    id: row.id,
    createdAt: row.created_at,
    name: row.name,
    surname: row.surname ?? '',
    phone: row.phone ?? '',
    email: row.email ?? '',
    operation: row.operation,
    destinations: Array.isArray(row.destinations) ? row.destinations : [],
    types: Array.isArray(row.types) ? row.types : [],
    budgetMin: Number(row.budget_min || 0),
    budgetMax: Number(row.budget_max || 0),
    currency: row.currency || 'EUR',
    minRooms: Number(row.min_rooms || 0),
    minBathrooms: Number(row.min_bathrooms || 0),
    requiredExtras: Array.isArray(row.required_extras) ? row.required_extras : [],
    minSurface: Number(row.min_surface || 0),
    status: row.status,
    notes: row.notes ?? '',
    history: Array.isArray(row.history) ? row.history : [],
  }
}

function mapVisitFromSupabase(row) {
  return {
    id: row.id,
    createdAt: row.created_at,
    clientId: row.client_id ?? '',
    propertyId: row.property_id ?? '',
    leadId: row.lead_id ?? '',
    contactName: row.contact_name ?? '',
    contactPhone: row.contact_phone ?? '',
    contactEmail: row.contact_email ?? '',
    location: row.location ?? '',
    scheduledAt: row.scheduled_at,
    durationMinutes: Number(row.duration_minutes || 60),
    status: row.status,
    notes: row.notes ?? '',
    history: Array.isArray(row.history) ? row.history : [],
  }
}

function fileToLocalPhoto(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () =>
      resolve({
        id: createId('photo'),
        name: file.name,
        url: reader.result,
      })
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function filterCatalogProperties(properties, filters) {
  return properties
    .filter((property) => filters.operation === 'all' || property.operation === filters.operation)
    .filter((property) => filters.destination === 'todos' || cityKey(property.destination) === cityKey(filters.destination))
    .filter((property) => {
      if (!filters.reference) {
        return true
      }

      const needle = filters.reference.toLowerCase()
      return (
        property.reference.toLowerCase().includes(needle) ||
        property.title.es.toLowerCase().includes(needle) ||
        property.location.es.toLowerCase().includes(needle)
      )
    })
    .filter((property) => filters.type.length === 0 || filters.type.includes(property.type))
    .filter((property) => (!(filters.priceMin || filters.priceMax) || (property.currency || 'EUR') === (filters.priceCurrency || 'EUR')) && matchPriceRange(property.priceValue, filters.priceMin, filters.priceMax))
    .filter((property) => filters.surface === 'all' || matchSurfaceFilter(property.surface, filters.surface))
    .filter((property) => filters.rooms === 'all' || property.rooms >= Number(filters.rooms))
    .filter((property) => filters.bathrooms === 'all' || property.bathrooms >= Number(filters.bathrooms))
    .filter(
      (property) =>
        filters.extras.length === 0 || filters.extras.every((extra) => property.extras.includes(extra)),
    )
    .sort((left, right) => sortCatalogProperties(left, right, filters.order))
}

function matchPriceRange(price, min, max) {
  const parsedMin = Number(min || 0)
  const parsedMax = Number(max || 0)

  if (price === null && (parsedMin || parsedMax)) {
    return false
  }

  if (parsedMin && price < parsedMin) {
    return false
  }

  if (parsedMax && price > parsedMax) {
    return false
  }

  return true
}

function matchSurfaceFilter(surface, filter) {
  if (filter === 's') {
    return surface <= 90
  }
  if (filter === 'm') {
    return surface > 90 && surface <= 160
  }
  if (filter === 'l') {
    return surface > 160
  }
  return true
}

function sortCatalogProperties(left, right, order) {
  const statusOrder = closedListingsLast(left, right)
  if (statusOrder) return statusOrder
  if (order === 'price-asc') {
    return left.priceValue === null ? 1 : right.priceValue === null ? -1 : left.priceValue - right.priceValue
  }
  if (order === 'price-desc') {
    return left.priceValue === null ? 1 : right.priceValue === null ? -1 : right.priceValue - left.priceValue
  }
  if (order === 'surface-desc') {
    return right.surface - left.surface
  }
  return 0
}

function filterDashboardProperties(properties, filters) {
  return properties.filter((property) => {
    const matchesOperation = filters.operation === 'all' || property.operation === filters.operation
    const matchesDestination = filters.destination === 'all' || cityKey(property.destination) === cityKey(filters.destination)
    const matchesStatus = filters.status === 'all' || property.status === filters.status
    const search = filters.search.trim().toLowerCase()
    const matchesSearch =
      !search ||
      property.title.toLowerCase().includes(search) ||
      property.reference.toLowerCase().includes(search)

    return matchesOperation && matchesDestination && matchesStatus && matchesSearch
  })
}

function filterDashboardClients(clients, filters) {
  return clients.filter((client) => {
    const matchesOperation = filters.operation === 'all' || client.operation === filters.operation
    const matchesStatus = filters.status === 'all' || client.status === filters.status
    const search = filters.search.trim().toLowerCase()
    const fullName = `${client.name} ${client.surname}`.toLowerCase()
    const matchesSearch =
      !search ||
      fullName.includes(search) ||
      client.email.toLowerCase().includes(search) ||
      client.phone.toLowerCase().includes(search)

    return matchesOperation && matchesStatus && matchesSearch
  })
}

function filterDashboardVisits(visits, filters) {
  return visits
    .filter((visit) => filters.status === 'all' || visit.status === filters.status)
    .filter((visit) => {
      const search = filters.search.trim().toLowerCase()
      if (!search) {
        return true
      }

      return [
        visit.contactName,
        visit.contactEmail,
        visit.contactPhone,
        visit.location,
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(search))
    })
    .sort((left, right) => getDateTimestamp(left.scheduledAt) - getDateTimestamp(right.scheduledAt))
}

function toggleSelection(values, candidate) {
  return values.includes(candidate) ? values.filter((value) => value !== candidate) : [...values, candidate]
}

function formatBudgetRange(client) {
  if (client.budgetMin && client.budgetMax) {
    return `${client.budgetMin.toLocaleString()} - ${client.budgetMax.toLocaleString()}`
  }
  if (client.budgetMax) {
    return `<= ${client.budgetMax.toLocaleString()}`
  }
  if (client.budgetMin) {
    return `>= ${client.budgetMin.toLocaleString()}`
  }
  return 'Flexible'
}

function formatDate(value, language) {
  return new Intl.DateTimeFormat(language, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function getPropertyText(property, language) {
  return {
    title: property.title[language] ?? property.title.es,
    location: property.location[language] ?? property.location.es,
    summary: property.summary[language] ?? property.summary.es,
    description: property.description[language] ?? property.description.es,
    detailNote: property.detailNote[language] ?? property.detailNote.es,
  }
}

function PropertyDetailGroup({ title, items }) {
  const visibleItems = items.filter((item) => item.value !== '' && item.value !== null && item.value !== undefined && item.value !== false && item.value !== 0)
  if (!visibleItems.length) return null

  return (
    <section className="property-detail-group">
      <h3>{title}</h3>
      <dl>
        {visibleItems.map((item) => (
          <div key={item.label}>
            <dt>{item.label}</dt>
            <dd>{item.value === true ? '✓' : item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function CustomSelect({
  leadingIcon,
  value,
  onChange,
  options,
  className = '',
  ariaLabel,
  light = false,
  disabled = false,
  triggerClassName = '',
  menuClassName = '',
  optionClassName = '',
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  useVisibleDropdown(rootRef, open, setOpen)
  const activeOption = options.find((option) => option.value === value) ?? options[0]

  useEffect(() => {
    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)
    return () => window.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  return (
    <div
      ref={rootRef}
      className={`custom-select ${className} ${light ? 'custom-select-light' : ''}`.trim()}
    >
      <button
        type="button"
        className={`custom-select-trigger ${triggerClassName}`.trim()}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        {leadingIcon}
        <span className="custom-select-trigger-label">{activeOption?.label}</span>
      </button>
      {open ? (
        <div className={`custom-select-menu ${menuClassName}`.trim()} role="listbox">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`custom-select-option ${optionClassName} ${option.value === value ? 'is-active' : ''}`.trim()}
              disabled={disabled}
              onClick={() => {
                onChange(option.value)
                setOpen(false)
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function CustomMultiSelect({
  value,
  onChange,
  options,
  placeholderLabel,
  ariaLabel,
  className = '',
  triggerClassName = '',
  menuClassName = '',
  optionClassName = '',
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  useVisibleDropdown(rootRef, open, setOpen)
  const selectedLabels = options.filter((option) => value.includes(option.value)).map((option) => option.label)
  const triggerLabel = selectedLabels.length > 0 ? selectedLabels.join(', ') : placeholderLabel

  useEffect(() => {
    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)
    return () => window.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  return (
    <div ref={rootRef} className={`custom-select ${className}`.trim()}>
      <button
        type="button"
        className={`custom-select-trigger ${triggerClassName}`.trim()}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="custom-select-trigger-label">{triggerLabel}</span>
      </button>
      {open ? (
        <div className={`custom-select-menu ${menuClassName}`.trim()} role="listbox" aria-multiselectable="true">
          <button
            type="button"
            className={`custom-select-option ${optionClassName} ${value.length === 0 ? 'is-active' : ''}`.trim()}
            onClick={() => onChange([])}
          >
            {placeholderLabel}
          </button>
          {options.map((option) => {
            const active = value.includes(option.value)

            return (
              <button
                key={option.value}
                type="button"
                className={`custom-select-option ${optionClassName} ${active ? 'is-active' : ''}`.trim()}
                aria-selected={active}
                onClick={() => onChange(toggleSelection(value, option.value))}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

function formatCompactPrice(value) {
  const amount = Number(value || 0)

  if (!amount) {
    return ''
  }

  return new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: amount >= 1000000 ? 1 : 0,
  }).format(amount)
}

function PriceRangeSelect({
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
  triggerLabel,
  minPlaceholder,
  maxPlaceholder,
  clearLabel,
  ariaLabel,
  className = '',
  triggerClassName = '',
  menuClassName = '',
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  useVisibleDropdown(rootRef, open, setOpen)
  const hasMin = Boolean(minValue)
  const hasMax = Boolean(maxValue)
  const summary = hasMin && hasMax
    ? `${formatCompactPrice(minValue)} - ${formatCompactPrice(maxValue)}`
    : hasMin
      ? `>= ${formatCompactPrice(minValue)}`
      : hasMax
        ? `<= ${formatCompactPrice(maxValue)}`
        : triggerLabel

  useEffect(() => {
    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)
    return () => window.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  return (
    <div ref={rootRef} className={`custom-select ${className}`.trim()}>
      <button
        type="button"
        className={`custom-select-trigger ${triggerClassName}`.trim()}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="custom-select-trigger-label">{summary}</span>
      </button>
      {open ? (
        <div className={`custom-select-menu ${menuClassName}`.trim()} role="dialog" aria-label={ariaLabel}>
          <div className="catalog-price-dropdown">
            <input
              type="number"
              inputMode="numeric"
              min="0"
              step="10000"
              placeholder={minPlaceholder}
              value={minValue}
              onChange={(event) => onMinChange(event.target.value)}
            />
            <input
              type="number"
              inputMode="numeric"
              min="0"
              step="10000"
              placeholder={maxPlaceholder}
              value={maxValue}
              onChange={(event) => onMaxChange(event.target.value)}
            />
            <button
              type="button"
              className="catalog-price-clear"
              onClick={() => {
                onMinChange('')
                onMaxChange('')
              }}
            >
              {clearLabel}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function TogglePillGroup({ value, options, onChange, ariaLabel }) {
  return (
    <div className="toggle-pill-group" role="group" aria-label={ariaLabel}>
      {options.map((option) => {
        const active = value.includes(option.value)
        return (
          <button
            key={option.value}
            type="button"
            className={active ? 'toggle-pill is-active' : 'toggle-pill'}
            onClick={() => onChange(toggleSelection(value, option.value))}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

function Header({
  copy,
  language,
  onLanguageChange,
  onHomeClick,
  onCatalogClick,
  onOwnerClick,
  onOffMarketClick,
  showSignOut,
  onSignOut,
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuButton = useRef(null)
  const headerRef = useRef(null)
  useLayoutEffect(() => {
    const header = headerRef.current
    if (!header) return
    const updateHeight = () => header.parentElement.style.setProperty('--header-height', `${header.getBoundingClientRect().height}px`)
    updateHeight()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(updateHeight)
    observer.observe(header)
    return () => observer.disconnect()
  }, [])
  const closeLabel = { pt: 'Fechar', es: 'Cerrar', en: 'Close' }[language]
  useEffect(() => {
    function dismiss(event) {
      if (event.key === 'Escape' && menuOpen) {
        setMenuOpen(false)
        menuButton.current?.focus()
      }
    }
    window.addEventListener('keydown', dismiss)
    return () => window.removeEventListener('keydown', dismiss)
  }, [menuOpen])
  return (
    <header ref={headerRef} className={`site-header${menuOpen ? ' menu-open' : ''}`}>
      <button ref={menuButton} type="button" className="mobile-menu-toggle" aria-expanded={menuOpen} aria-controls="header-menu-panel" onClick={() => setMenuOpen(open => !open)}>{menuOpen ? closeLabel : 'Menu'}</button>
      <a
        href="/"
        className="brand-mark"
        onClick={(event) => {
          event.preventDefault()
          setMenuOpen(false)
          onHomeClick()
        }}
      >
        <img src="/brand/kohaus-logo-transparent.png" alt="KOHAUS Real Estate" />
      </a>

      <div className="lang-switch">
        <CustomSelect
          leadingIcon={<svg className="language-globe" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9" /><ellipse cx="12" cy="12" rx="4" ry="9" /><path d="M3 12h18" /></svg>}
          value={language}
          onChange={onLanguageChange}
          options={[
            { value: 'es', label: 'Español' },
            { value: 'en', label: 'English' },
            { value: 'pt', label: 'Português' },
          ]}
          className="lang-switch"
          triggerClassName="lang-switch-trigger"
          menuClassName="lang-switch-menu"
          optionClassName="lang-switch-option"
          ariaLabel={copy.nav.language}
        />
      </div>

      <div className="header-menu-panel" id="header-menu-panel">
      <nav id="primary-navigation" className="nav-group nav-group-left" onClick={() => setMenuOpen(false)} aria-label="Primary">
        <a
          href="?view=catalogo&op=comprar&dest=todos"
          onClick={(event) => {
            event.preventDefault()
            onCatalogClick('comprar')
          }}
        >
          {copy.nav.buy}
        </a>
        <a
          href="?view=catalogo&op=alquilar&dest=todos"
          onClick={(event) => {
            event.preventDefault()
            onCatalogClick('alquilar')
          }}
        >
          {copy.nav.rent}
        </a>
        <a href={`?view=off-market&lang=${language}`} onClick={event => { event.preventDefault(); onOffMarketClick() }}>Off-market</a>
        <a
          href="?view=captacion&lead=vender"
          onClick={(event) => {
            event.preventDefault()
            onOwnerClick()
          }}
        >
          {copy.nav.owners}
        </a>
      </nav>


      <div id="secondary-navigation" className="nav-side">
        <nav className="nav-group nav-group-right" aria-label="Secondary">
          <a href={`?view=about&lang=${language}`}>{companyCopy[language].about}</a>
          <a href={`?view=contact&lang=${language}`}>{companyCopy[language].contact}</a>
          {showSignOut ? (
            <button type="button" className="nav-ghost-button" onClick={onSignOut}>
              {copy.nav.signOut}
            </button>
          ) : null}
        </nav>

      </div>
      </div>
    </header>
  )
}

function Footer({ copy, language }) {
  return (
    <footer className="site-footer" id="contacto">
      <div>
        <div className="footer-logo-frame"><img className="footer-brand-logo" src="/brand/kohaus-logo-transparent.png" alt="KOHAUS Real Estate" /></div>
        <p>{copy.footer.description}</p>
      </div>
      <div className="footer-contact">
        <span>{copy.footer.contact}</span>
        <p>{companyCopy[language].location}</p>
        <p><a href={`mailto:${companyContact.email}`}>{companyContact.email}</a></p>
        <p><a href={`tel:${companyContact.tel}`}>{companyContact.phone}</a></p>
        <nav className="social-links" aria-label={language === 'en' ? 'Social media' : 'Redes sociais'}>
          <a href="https://www.instagram.com/guilhermeconinch.broker/" target="_blank" rel="noopener noreferrer">Instagram</a>
          <a href="https://www.facebook.com/corretorguilhermeconinch/" target="_blank" rel="noopener noreferrer">Facebook</a>
          <a href="https://es.linkedin.com/company/broker-guilherme-coninch" target="_blank" rel="noopener noreferrer">LinkedIn</a>
        </nav>
      </div>
      <div className="footer-legal">
        <span>{copy.footer.legal}</span>
        <nav className="legal-links" aria-label={copy.footer.legal}>
          {['legal', 'privacy', 'cookies'].map((page, index) => <a key={page} href={`?view=${page}&lang=${language}`}>{copy.footer.legalLinks[index]}</a>)}
        </nav>
      </div>
      <div className="footer-copyright">© {new Date().getFullYear()} KOHAUS Real Estate. {companyCopy[language].rights}</div>
    </footer>
  )
}

function DashboardAuthGate({
  language,
  copy,
  authLoading,
  authSession,
  authAccess,
  authForm,
  authError,
  authSubmitting,
  onAuthFormChange,
  onAuthSubmit,
  onSignOut,
}) {
  const [recovering, setRecovering] = useState(false)
  const signedInEmail = authSession?.user?.email ?? ''

  return (
    <main className="dashboard-page">
      <section className="dashboard-auth-shell">
        <div className="dashboard-auth-copy">
          <p className="section-label dashboard-label">{copy.auth.badge}</p>
          <h1 className="section-title">{copy.auth.title}</h1>
        </div>

        <div className="dashboard-auth-card">
          {authLoading ? (
            <div className="dashboard-auth-loading">
              <p>{copy.auth.loading}</p>
            </div>
          ) : authSession && !authAccess ? (
            <div className="dashboard-auth-denied">
              <p className="section-label dashboard-label">{copy.auth.accessGranted}</p>
              <h2>{copy.auth.unauthorizedTitle}</h2>
              <p>{copy.auth.unauthorizedCopy}</p>
              <div className="dashboard-auth-meta">
                <span>{copy.auth.signedInAs}</span>
                <strong>{signedInEmail}</strong>
              </div>
              <button type="button" className="dashboard-auth-submit" onClick={onSignOut}>
                {copy.nav.signOut}
              </button>
            </div>
          ) : recovering ? <PasswordRecovery language={language} client={supabase} initialEmail={authForm.email} onBack={() => setRecovering(false)} /> : (
            <form className="dashboard-auth-form" onSubmit={onAuthSubmit}>
              <label>
                <span>{copy.auth.email}</span>
                <input
                  type="email"
                  autoComplete="email"
                  value={authForm.email}
                  onChange={(event) => onAuthFormChange('email', event.target.value)}
                  required
                />
              </label>
              <label>
                <span>{copy.auth.password}</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={authForm.password}
                  onChange={(event) => onAuthFormChange('password', event.target.value)}
                  required
                />
              </label>
              {authError ? <p className="dashboard-auth-error">{authError}</p> : null}
              <div className="dashboard-auth-actions">
              <button type="submit" className="dashboard-auth-submit" disabled={authSubmitting}>
                {authSubmitting ? copy.auth.loading : copy.auth.submit}
              </button>
              <button type="button" className="outline-button" onClick={() => setRecovering(true)}>{language === 'pt' ? 'Esqueci minha senha' : language === 'en' ? 'Forgot my password' : 'Olvidé mi contraseña'}</button>
              </div>
            </form>
          )}
        </div>
      </section>
    </main>
  )
}

export default function App() {
  const [route, setRoute] = useState(() => parseRoute())
  const [filtersOpen, setFiltersOpen] = useState(false)
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [route.view, route.destination, route.propertyId])
  const [language, setLanguage] = useState(() => parseRoute().language)
  const propertyPhotoItemsRef = useRef([])
  const [passwordSetup, setPasswordSetup] = useState(initialAuthCallback.active)
  const requiresDashboardAuth = hasSupabaseConfig
  const [homeSearch, setHomeSearch] = useState(() => ({
    ...HOME_SEARCH_DEFAULTS,
    operation: route.operation || HOME_SEARCH_DEFAULTS.operation,
    destination: route.destination || HOME_SEARCH_DEFAULTS.destination,
    reference: route.reference || '',
  }))
  const [catalogFilters, setCatalogFilters] = useState(() => ({
    ...CATALOG_FILTER_DEFAULTS,
    operation: route.operation || CATALOG_FILTER_DEFAULTS.operation,
    destination: route.destination || CATALOG_FILTER_DEFAULTS.destination,
    reference: route.reference || '',
  }))
  const [ownerForm, setOwnerForm] = useState(() => ({
    ...OWNER_FORM_DEFAULTS,
    operation: route.leadType || OWNER_FORM_DEFAULTS.operation,
  }))
  const [offMarketSelection, setOffMarketSelection] = useState(null)
  const [ownerSuccess, setOwnerSuccess] = useState(false)
  const [propertyInquiry, setPropertyInquiry] = useState(PROPERTY_INQUIRY_DEFAULTS)
  const [propertyInquirySuccess, setPropertyInquirySuccess] = useState(false)
  const [leads, setLeads] = useState([])
  const [dashboardProperties, setDashboardProperties] = useState([])
  const [publishedProperties, setPublishedProperties] = useState([])
  const [dashboardClients, setDashboardClients] = useState([])
  const [opportunitiesLoading, setOpportunitiesLoading] = useState(true)
  const [dashboardVisits, setDashboardVisits] = useState([])
  const propertySaveLock = useRef(false)
  const propertyRequestId = useRef(null)
  const [propertySaving, setPropertySaving] = useState(false)
  const [dashboardNotice, setDashboardNotice] = useState('')
  const [propertyForm, setPropertyForm] = useState(PROPERTY_FORM_DEFAULTS)
  const [propertyPhotoItems, setPropertyPhotoItems] = useState([])
  const [propertyFilters, setPropertyFilters] = useState(PROPERTY_FILTER_DEFAULTS)
  const [portalFilters, setPortalFilters] = useState(PORTAL_FILTER_DEFAULTS)
  const [clientForm, setClientForm] = useState(CLIENT_FORM_DEFAULTS)
  const [clientFilters, setClientFilters] = useState(CLIENT_FILTER_DEFAULTS)
  const [visitForm, setVisitForm] = useState(VISIT_FORM_DEFAULTS)
  const [visitSaving, setVisitSaving] = useState(false)
  const visitSaveLock = useRef(false)
  const [portalSavingId, setPortalSavingId] = useState('')
  const [leadSavingId, setLeadSavingId] = useState('')
  const [visitFilters, setVisitFilters] = useState(VISIT_FILTER_DEFAULTS)
  const [creatingPropertyOwner, setCreatingPropertyOwner] = useState(false)
  const ownerFlowRef = useRef(false)
  useEffect(()=>{ownerFlowRef.current=creatingPropertyOwner},[creatingPropertyOwner])
  const clientSaveLock = useRef(false)
  const [clientSaving, setClientSaving] = useState(false)
  const [clientEditor, setClientEditor] = useState(CLIENT_EDITOR_DEFAULT)
  const [propertyEditor, setPropertyEditor] = useState(PROPERTY_EDITOR_DEFAULT)
  const [visitEditorId, setVisitEditorId] = useState(null)
  const [visitEditorOpen, setVisitEditorOpen] = useState(false)
  const [draggedPropertyPhotoId, setDraggedPropertyPhotoId] = useState(null)
  const [dashboardSection, setDashboardSection] = useState(route.dashboardSection || DASHBOARD_SECTION_DEFAULT)
  const [authSession, setAuthSession] = useState(null)
  const [authAccess, setAuthAccess] = useState(null)
  const [authLoading, setAuthLoading] = useState(requiresDashboardAuth)
  const [authSubmitting, setAuthSubmitting] = useState(false)
  const [authError, setAuthError] = useState('')
  const [dataError, setDataError] = useState('')
  const [publicDataError, setPublicDataError] = useState('')
  const [publicLoading, setPublicLoading] = useState(true)
  const [authForm, setAuthForm] = useState({
    email: '',
    password: '',
  })

  useEffect(() => {
    function handlePopState() {
      const nextRoute = parseRoute()
      setRoute(nextRoute)
      setLanguage(nextRoute.language)
      setHomeSearch((current) => ({
        ...current,
        operation: nextRoute.operation || current.operation,
        destination: nextRoute.destination || current.destination,
        reference: nextRoute.reference || '',
      }))
      setCatalogFilters((current) => ({
        ...current,
        operation: nextRoute.operation || current.operation,
        destination: nextRoute.destination || current.destination,
        reference: nextRoute.reference || '',
      }))
      setDashboardSection(nextRoute.dashboardSection || DASHBOARD_SECTION_DEFAULT)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    let active = true

    async function loadPublishedProperties() {
      try {
        const properties = await fetchPublishedProperties()
        if (active) {
          setPublishedProperties(properties)
          setPublicLoading(false)
          setPublicDataError('')
        }
      } catch (error) {
        console.error(error)
        if (active) {
          setPublicLoading(false)
          setPublicDataError(error.message || 'Não foi possível carregar os imóveis do banco de dados.')
        }
      }
    }

    void loadPublishedProperties()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!requiresDashboardAuth || !supabase) {
      return undefined
    }

    let active = true

    async function syncAccess(session) {
      if (!session?.user) {
        if (active) {
          setAuthSession(null)
          setAuthAccess(null)
          setAuthLoading(false)
          setLeads([])
          setDashboardProperties([])
          setDashboardClients([])
          setDashboardVisits([])
        }
        return
      }

      if (active) {
        setAuthSession(session)
        setAuthLoading(true)
      }

      const { data, error } = await supabase
        .from('dashboard_users')
        .select('user_id, email, display_name, role')
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (!active) {
        return
      }

      if (error) {
        console.error(error)
        setAuthAccess(null)
        setLeads([])
        setDashboardProperties([])
        setDashboardClients([])
        setDashboardVisits([])
      } else {
        setAuthAccess(data ?? null)
        if (!data) {
          setLeads([])
          setDashboardProperties([])
          setDashboardClients([])
          setDashboardVisits([])
        }
      }

      setAuthLoading(false)
    }

    async function initAuth() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!active) {
        return
      }

      await syncAccess(session)
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setPasswordSetup(true)
      setAuthError('')
      void syncAccess(session)
    })

    void initAuth()

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [requiresDashboardAuth])

  useEffect(() => {
    if (requiresDashboardAuth && !authAccess) {
      return undefined
    }

    let active = true

    async function loadData() {
      try {
        const [loadedLeads, loadedProperties, loadedClients, loadedVisits] = await Promise.all([
          fetchOwnerLeads(),
          fetchDashboardProperties(),
          fetchDashboardClients(),
          fetchDashboardVisits(),
        ])

        if (active) {
          setLeads(loadedLeads)
          setDashboardProperties(loadedProperties)
          setDashboardClients(loadedClients)
          setOpportunitiesLoading(false)
          setDashboardVisits(loadedVisits)
          setDataError('')
        }
      } catch (error) {
        console.error(error)
        if (active) {
          setDataError(error.message || 'Não foi possível carregar os dados do banco de dados.')
        }
      }
    }

    loadData()

    return () => {
      active = false
    }
  }, [authAccess, requiresDashboardAuth])

  useEffect(() => {
    propertyPhotoItemsRef.current = propertyPhotoItems
  }, [propertyPhotoItems])

  useEffect(() => {
    return () => {
      revokeEditorItemUrls(propertyPhotoItemsRef.current)
    }
  }, [])

  useEffect(() => {
    if (route.view !== 'property-editor') {
      if (propertyEditor.isOpen) {
        revokeEditorItemUrls(propertyPhotoItems)
        setPropertyEditor(PROPERTY_EDITOR_DEFAULT)
        setPropertyForm(PROPERTY_FORM_DEFAULTS)
        setPropertyPhotoItems([])
        setDraggedPropertyPhotoId(null)
      }
      return undefined
    }

    if (!propertyEditor.isOpen) {
      if (route.propertyId) {
        const property = dashboardProperties.find((item) => item.id === route.propertyId)
        if (!property) {
          return undefined
        }

        setPropertyForm(mapPropertyToForm(property))
        setPropertyPhotoItems(mapPhotosToEditorItems(property.photos))
        setPropertyEditor({
          isOpen: true,
          mode: 'edit',
          propertyId: property.id,
        })
        return undefined
      }

      setPropertyForm(PROPERTY_FORM_DEFAULTS)
      setPropertyPhotoItems([])
      setPropertyEditor({
        isOpen: true,
        mode: 'create',
        propertyId: null,
      })
    }

    function handleKeydown(event) {
      if (event.key === 'Escape' && !ownerFlowRef.current && !propertySaveLock.current) {
        closePropertyEditor()
      }
    }

    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [route.view, route.propertyId, propertyEditor.isOpen, dashboardProperties])

  useEffect(() => {
    if (!clientEditor.isOpen) {
      return undefined
    }

    function handleKeydown(event) {
      if (event.key === 'Escape') {
        closeClientEditor()
      }
    }

    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [clientEditor.isOpen])

  const copy = COPY[language]
  const portalFormCopy = getPortalFormCopy(language)
  const portalEnvironmentCopy = getPortalEnvironmentCopy(language)
  const catalogProperties = publishedProperties
  .filter((property) => belongsInCatalog(property, route.view === 'off-market'))
  .map((property) => ({
    ...property,

    image: property.offMarket ? offMarketImage : property.photos?.[0]?.url ?? '',

    gallery: property.photos?.map((photo) => photo.url) ?? [],

    extras: propertyExtras(property),

    note: '',

    title: propertyTranslations(property, 'title'),

    location: {
      es: getDestinationMeta(property.destination, 'es').name,
      en: getDestinationMeta(property.destination, 'en').name,
      pt: getDestinationMeta(property.destination, 'pt').name,
    },

    summary: propertyTranslations(property, 'description'),

    description: propertyTranslations(property, 'description'),

    detailNote: {
      es: '',
      en: '',
      pt: '',
    },
  }))

  const selectedProperty =
    route.view === 'anuncio'
      ? catalogProperties.find((item) => item.id === route.propertyId)
      : null

  const selectedPropertyText = selectedProperty
    ? getPropertyText(selectedProperty, language)
    : null

  const filteredCatalog = filterCatalogProperties(
    catalogProperties,
    catalogFilters
  )

  const featuredProperties = [...catalogProperties]
    .filter((property) => property.image)
    .sort((a, b) => closedListingsLast(a, b) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4)

  const filteredDashboardProperties = filterDashboardProperties(
    dashboardProperties,
    propertyFilters
  )

  const filteredDashboardClients = filterDashboardClients(
    dashboardClients,
    clientFilters
  )
  const filteredDashboardVisits = filterDashboardVisits(
    dashboardVisits,
    visitFilters
  )
  const leadStatusOptions = Object.entries(copy.dashboard.statusOptions).map(([value, label]) => ({ value, label }))
  const propertyStatusOptions = Object.entries(copy.dashboard.propertyStatusOptions).map(([value, label]) => ({
    value,
    label,
  }))
  const clientStatusOptions = Object.entries(copy.dashboard.clientStatusOptions).map(([value, label]) => ({
    value,
    label,
  }))
  const destinationOptions = cityOptions(route.view === 'dashboard' ? dashboardProperties : publishedProperties.filter(property => belongsInCatalog(property, route.view === 'off-market') && ((route.view === 'home' ? homeSearch.operation : catalogFilters.operation) === 'all' || property.operation === (route.view === 'home' ? homeSearch.operation : catalogFilters.operation))), value => getDestinationMeta(value, language).name)
  const visitStatusOptions = Object.entries(copy.dashboard.visitStatusOptions).map(([value, label]) => ({
    value,
    label,
  }))
  const portalStatusOptions = Object.entries(copy.dashboard.portalStatusOptions).map(([value, label]) => ({
    value,
    label,
  }))
  const clientOptions = [
    { value: '', label: copy.dashboard.unlinked },
    ...dashboardClients.map((client) => ({
      value: client.id,
      label: `${client.name} ${client.surname}`.trim(),
    })),
  ]
  const propertyOptions = [
    { value: '', label: copy.dashboard.unlinked },
    ...dashboardProperties.map((property) => ({
      value: property.id,
      label: `${property.reference} · ${property.title}`,
    })),
  ]
  const portalOptions = [
    { value: 'all', label: copy.catalog.all },
    ...PORTAL_DEFINITIONS.map((portal) => ({
      value: portal.id,
      label: portal.name,
    })),
  ]
  const catalogTypeOptions = getCatalogTypeOptions(
    catalogProperties,
    language
  )
  const priceTriggerLabel = getPriceTriggerLabel(language)
  const dashboardStats = {
    total: leads.length,
    nuevo: leads.filter((lead) => lead.status === 'nuevo').length,
    contactado: leads.filter((lead) => lead.status === 'contactado').length,
    cerrado: leads.filter((lead) => lead.status === 'cerrado').length,
  }
  const dashboardPortalItems = getDashboardPortalItems(dashboardProperties)
  const filteredPortalItems = filterDashboardPortalItems(dashboardPortalItems, portalFilters)
  const upcomingVisitsCount = dashboardVisits.filter((visit) => ['scheduled', 'confirmed'].includes(visit.status)).length
  const readyPortalsCount = dashboardPortalItems.reduce(
    (total, property) => total + getPropertyPortalPublications(property).filter((publication) => publication.status === 'ready').length,
    0,
  )
  const relatedProperties = selectedProperty
  ? catalogProperties
      .filter(
        (property) =>
          property.id !== selectedProperty.id &&
          (
            property.destination === selectedProperty.destination ||
            property.operation === selectedProperty.operation
          ),
      )
      .sort(closedListingsLast)
      .slice(0, 2)
  : []
  useEffect(() => {
    if (!supabase) return undefined
    const timer = setInterval(() => {
      void fetchPublishedProperties().then(setPublishedProperties).catch(() => {})
      if (authAccess) void fetchDashboardProperties().then(setDashboardProperties).catch(() => {})
    }, 30 * 60 * 1000)
    return () => clearInterval(timer)
  }, [authAccess])
  const canOpenDashboard = !requiresDashboardAuth || Boolean(authAccess)
  const isDashboardRoute = route.view === 'dashboard' || route.view === 'property-editor'
  const showDashboardAuthGate = isDashboardRoute && requiresDashboardAuth && !canOpenDashboard

  function handleAuthFormChange(field, value) {
    setAuthForm((current) => ({ ...current, [field]: value }))
  }

  function syncRoute(nextRoute) {
    setRoute(nextRoute)
    const nextSearch = toSearch(nextRoute)
    window.history.pushState({}, '', nextSearch)
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }

  function goHome() {
    setOwnerSuccess(false)
    syncRoute({
      view: 'home',
      language,
      operation: HOME_SEARCH_DEFAULTS.operation,
      destination: HOME_SEARCH_DEFAULTS.destination,
      reference: '',
      dashboardSection: DASHBOARD_SECTION_DEFAULT,
      leadType: OWNER_FORM_DEFAULTS.operation,
      propertyId: '',
    })
  }

  function goCatalog(operation, destination = 'todos', reference = '', preserveFilters = false) {
    setHomeSearch((current) => ({
      ...current,
      operation,
      destination,
      reference,
    }))
    setCatalogFilters((current) => ({
      ...(preserveFilters ? current : CATALOG_FILTER_DEFAULTS),
      operation,
      destination,
      reference,
    }))
    syncRoute({
      view: 'catalogo',
      language,
      operation,
      destination,
      reference,
      dashboardSection,
      leadType: ownerForm.operation,
      propertyId: '',
    })
  }

  function goDashboard(section = DASHBOARD_SECTION_DEFAULT) {
    setDashboardSection(section)
    syncRoute({
      view: 'dashboard',
      language,
      operation: HOME_SEARCH_DEFAULTS.operation,
      destination: HOME_SEARCH_DEFAULTS.destination,
      reference: '',
      dashboardSection: section,
      leadType: ownerForm.operation,
      propertyId: '',
    })
  }

  function openPropertyEditorRoute(mode, propertyId = '') {
    setDashboardSection('properties')
    syncRoute({
      view: 'property-editor',
      language,
      operation: HOME_SEARCH_DEFAULTS.operation,
      destination: HOME_SEARCH_DEFAULTS.destination,
      reference: '',
      dashboardSection: 'properties',
      leadType: ownerForm.operation,
      propertyId: mode === 'edit' ? propertyId : '',
    })
  }

  async function handleAuthSubmit(event) {
    event.preventDefault()

    if (!supabase) {
      return
    }

    setAuthSubmitting(true)
    setAuthError('')

    const { error } = await supabase.auth.signInWithPassword({
      email: authForm.email.trim(),
      password: authForm.password,
    })

    if (error) {
      setAuthError(error.message)
    }

    setAuthSubmitting(false)
  }

  async function handleSignOut() {
    if (!supabase) {
      return
    }

    await supabase.auth.signOut()
    setAuthForm((current) => ({ ...current, password: '' }))
    setAuthAccess(null)
  }

  function goOwnerForm(operation) {
    setOwnerSuccess(false)
    setOwnerForm({ ...OWNER_FORM_DEFAULTS, operation })
    syncRoute({
      view: 'captacion',
      language,
      operation: HOME_SEARCH_DEFAULTS.operation,
      destination: HOME_SEARCH_DEFAULTS.destination,
      reference: '',
      dashboardSection,
      leadType: operation,
      propertyId: '',
    })
  }

  function goProperty(property) {
    setPropertyInquiry(PROPERTY_INQUIRY_DEFAULTS)
    setPropertyInquirySuccess(false)
    syncRoute({
      view: 'anuncio',
      language,
      operation: property.operation,
      destination: property.destination,
      reference: property.reference,
      dashboardSection,
      leadType: ownerForm.operation,
      propertyId: property.id,
    })
  }

  function handleLanguageChange(nextLanguage) {
    setLanguage(nextLanguage)
    const nextRoute = {
      ...route,
      language: nextLanguage,
    }
    setRoute(nextRoute)
    window.history.replaceState({}, '', toSearch(nextRoute))
  }

  async function handleLeadSubmit(event) {
    event.preventDefault()
    try {
      const nextLeads = await saveOwnerLead({ ...ownerForm, language })
      setLeads(nextLeads)
      setOwnerForm({ ...OWNER_FORM_DEFAULTS, operation: ownerForm.operation })
      setOwnerSuccess(true)
      setDataError('')
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    } catch (error) {
      console.error(error)
      setDataError(error.message || 'Não foi possível salvar os dados no banco de dados.')
    }
  }

  async function handlePropertyInquirySubmit(event) {
    event.preventDefault()
    if (!selectedProperty) {
      return
    }

    const propertyLabel = `${selectedProperty.reference} · ${selectedPropertyText.title}`
    const inquiryMessage = propertyInquiry.message.trim()
    const payload = {
      language,
      name: propertyInquiry.name.trim(),
      surname: propertyInquiry.surname.trim(),
      phone: propertyInquiry.phone.trim(),
      email: propertyInquiry.email.trim(),
      address: propertyLabel,
      city: getDestinationMeta(selectedProperty.destination, language).name,
      operation: selectedProperty.operation,
      source: 'property_request',
      comments: [propertyLabel, inquiryMessage].filter(Boolean).join('\n\n'),
      legalAccepted: propertyInquiry.legalAccepted,
      newsletterAccepted: false,
    }

    try {
      const nextLeads = await saveOwnerLead(payload)
      setLeads(nextLeads)
      setPropertyInquiry(PROPERTY_INQUIRY_DEFAULTS)
      setPropertyInquirySuccess(true)
      setDataError('')
    } catch (error) {
      console.error(error)
      setDataError(error.message || 'Não foi possível salvar os dados no banco de dados.')
    }
  }

  function confirmDashboardDelete(name) {
    return window.confirm(copy.dashboard.confirmDelete.replace('{name}', name))
  }

  async function handleLeadStatusChange(id, status) {
    setLeadSavingId(id)
    setDashboardNotice('')
    try {
      const next = await updateLeadStatus(id, status)
      setLeads(next)
      setDashboardNotice(copy.dashboard.leadSaved)
      setDataError('')
    } catch (error) {
      console.error(error)
      setDataError(error.message || 'Não foi possível atualizar o lead.')
    } finally {
      setLeadSavingId('')
    }
  }

  async function handleDeleteLead(lead) {
    if (leadSavingId || !confirmDashboardDelete(`${lead.name} ${lead.surname}`.trim())) return
    setLeadSavingId(lead.id)
    setDashboardNotice('')
    setDataError('')
    try {
      await deleteDashboardRecord('owner_leads', lead.id)
      if (!hasSupabaseConfig || !supabase) {
        writeLocalStorage(LEADS_STORAGE_KEY, readLocalStorage(LEADS_STORAGE_KEY).filter((item) => item.id !== lead.id))
        writeLocalStorage(VISITS_STORAGE_KEY, readLocalStorage(VISITS_STORAGE_KEY).map((visit) => visit.leadId === lead.id ? { ...visit, leadId: '' } : visit))
        unlinkLocalTaskReference('lead_id', lead.id, false)
      }
      setLeads((current) => current.filter((item) => item.id !== lead.id))
      setDashboardVisits((current) => current.map((visit) => visit.leadId === lead.id ? { ...visit, leadId: '' } : visit))
      setDashboardNotice(copy.dashboard.leadDeleted)
    } catch (error) {
      console.error(error)
      setDataError(error.message || 'Não foi possível excluir o lead.')
    } finally {
      setLeadSavingId('')
    }
  }

  async function handleDeleteProperty() {
    if (propertySaveLock.current) return
    if (!window.confirm(language === 'pt' ? 'Excluir este imóvel definitivamente? As visitas e tarefas serão mantidas sem o vínculo. As fotos não serão apagadas do armazenamento.' : language === 'es' ? '¿Eliminar este inmueble definitivamente? Las visitas y tareas se conservarán sin vínculo. Las fotos permanecerán en almacenamiento.' : 'Permanently delete this property? Viewings and tasks will remain unlinked. Stored photos will be retained.')) return
    setDashboardNotice('')
    propertySaveLock.current=true;setPropertySaving(true)
    try {
      if (hasSupabaseConfig && supabase) {
        const {data,error}=await supabase.from('dashboard_properties').delete().eq('id',propertyEditor.propertyId).select('id')
        if(error || !data?.length)throw error || new Error('Não foi possível excluir o imóvel.')
      } else {
        writeLocalStorage(PROPERTIES_STORAGE_KEY, dashboardProperties.filter((property) => property.id !== propertyEditor.propertyId))
        const nextVisits = dashboardVisits.map((visit) => visit.propertyId === propertyEditor.propertyId ? { ...visit, propertyId: '' } : visit)
        writeLocalStorage(VISITS_STORAGE_KEY, nextVisits)
        setDashboardVisits(nextVisits)
        unlinkLocalTaskReference('property_id', propertyEditor.propertyId, false)
      }
      const next=dashboardProperties.filter(p=>p.id!==propertyEditor.propertyId)
      setDashboardProperties(next);setPublishedProperties(next.filter(isPublishedListing).map(publicProperty));setDataError('');closePropertyEditor()
      setDashboardNotice(copy.dashboard.propertyDeleted)
    } catch(error){setDataError(error.message)} finally{propertySaveLock.current=false;setPropertySaving(false)}
  }

  async function handlePropertySubmit(event) {
    event.preventDefault()
    if (propertySaveLock.current) return
    propertySaveLock.current = true
    setPropertySaving(true)
    setDashboardNotice('')
    setDataError('')
    try {
      const orderedPhotos = propertyForm.offMarket ? propertyPhotoItems.filter(item => item.source === 'existing').map(item => item.photo) : await resolvePropertyPhotos(propertyPhotoItems)
      const currentProperty = propertyEditor.propertyId
        ? dashboardProperties.find((property) => property.id === propertyEditor.propertyId)
        : null
      const portalPublications = buildPortalPublications(propertyForm, currentProperty?.portalPublications || [])
      let next

      if (propertyEditor.mode === 'edit' && propertyEditor.propertyId) {
        const nextHistory = [createHistoryEntry('Property updated from dashboard editor.'), ...(currentProperty?.history || [])]
        next = await updateDashboardProperty(propertyEditor.propertyId, {
          ownerClientId: propertyForm.ownerClientId, privateAddress: propertyForm.privateAddress, offMarket: propertyForm.offMarket, title: propertyForm.title, operation: propertyForm.operation,
          destination: normalizeCity(propertyForm.destination), type: propertyForm.type, ...priceFields(propertyForm.priceValue, propertyForm.currency), currency: propertyForm.currency, surface: Number(propertyForm.surface || 0),
          rooms: Number(propertyForm.rooms || 0), bathrooms: Number(propertyForm.bathrooms || 0), status: propertyForm.status,
          observations: propertyForm.observations, portalData: propertyForm.portalData,
          history: nextHistory, photos: orderedPhotos, portalPublications,
        })
      } else {
        propertyRequestId.current ||= createId('property')
        next = await saveDashboardProperty({ ...propertyForm, requestId: propertyRequestId.current }, orderedPhotos)
      }

      setDashboardProperties(next)
      setPublishedProperties(next.filter(isPublishedListing).map(publicProperty))
      setDataError('')
      closePropertyEditor()
      setDashboardNotice(propertyEditor.mode === 'edit' ? copy.dashboard.propertySaved : copy.dashboard.propertyCreated)
    } catch (error) {
      console.error(error)
      setDataError(error.message || 'Não foi possível salvar o imóvel no banco de dados.')
    } finally { propertySaveLock.current = false; setPropertySaving(false) }
  }

  async function handleClientSubmit(event) {
    event.preventDefault()
    if (clientSaveLock.current) return
    clientSaveLock.current = true
    setClientSaving(true)
    setDashboardNotice('')
    try {
      let next
      if (clientEditor.mode === 'edit' && clientEditor.clientId) {
        const currentClient = dashboardClients.find((client) => client.id === clientEditor.clientId)
        next = await updateDashboardClient(clientEditor.clientId, {
          name: clientForm.name, surname: clientForm.surname, phone: clientForm.phone, email: clientForm.email,
          language: clientForm.language, operation: clientForm.operation, destinations: clientForm.destinations, types: normalizeTypes(clientForm.types),
          budgetMin: parseBudget(clientForm.budgetMin), budgetMax: parseBudget(clientForm.budgetMax), currency: clientForm.currency,
          minBathrooms: Number(clientForm.minBathrooms || 0), requiredExtras: clientForm.requiredExtras,
          minRooms: Number(clientForm.minRooms || 0), minSurface: Number(clientForm.minSurface || 0),
          status: clientForm.status, notes: clientForm.notes,
          history: [createHistoryEntry('Client profile updated from dashboard.'), ...(currentClient?.history || [])],
        })
      } else {
        next = await saveDashboardClient(clientForm)
      }

      setDashboardClients(next)
      if (creatingPropertyOwner) {
        setPropertyForm(current=>({...current,ownerClientId:clientForm.requestId}))
        setCreatingPropertyOwner(false)
      }
      setClientForm(CLIENT_FORM_DEFAULTS)
      setClientEditor(CLIENT_EDITOR_DEFAULT)
      setDataError('')
      setDashboardNotice(clientEditor.mode === 'edit' ? copy.dashboard.clientSaved : copy.dashboard.clientCreated)
    } catch (error) {
      console.error(error)
      setDataError(error.message || 'Não foi possível salvar o cliente no banco de dados.')
    } finally { clientSaveLock.current=false;setClientSaving(false) }
  }

  async function handleDeleteClient() {
    const client = dashboardClients.find((item) => item.id === clientEditor.clientId)
    if (!client || clientSaveLock.current || !confirmDashboardDelete(`${client.name} ${client.surname}`.trim())) return
    clientSaveLock.current = true
    setClientSaving(true)
    setDashboardNotice('')
    setDataError('')
    try {
      await deleteDashboardRecord('dashboard_clients', client.id)
      if (!hasSupabaseConfig || !supabase) {
        const nextProperties = dashboardProperties.map((property) => property.ownerClientId === client.id ? { ...property, ownerClientId: '' } : property)
        const nextVisits = dashboardVisits.map((visit) => visit.clientId === client.id ? { ...visit, clientId: '' } : visit)
        writeLocalStorage(PROPERTIES_STORAGE_KEY, nextProperties)
        writeLocalStorage(VISITS_STORAGE_KEY, nextVisits)
        setDashboardProperties(nextProperties)
        setDashboardVisits(nextVisits)
        unlinkLocalTaskReference('client_id', client.id, false)
      } else {
        setDashboardProperties((current) => current.map((property) => property.ownerClientId === client.id ? { ...property, ownerClientId: '' } : property))
        setDashboardVisits((current) => current.map((visit) => visit.clientId === client.id ? { ...visit, clientId: '' } : visit))
      }
      const nextClients = dashboardClients.filter((item) => item.id !== client.id)
      if (!hasSupabaseConfig || !supabase) writeLocalStorage(CLIENTS_STORAGE_KEY, nextClients)
      setDashboardClients(nextClients)
      setCreatingPropertyOwner(false)
      setClientForm(CLIENT_FORM_DEFAULTS)
      setClientEditor(CLIENT_EDITOR_DEFAULT)
      setDashboardNotice(copy.dashboard.clientDeleted)
    } catch (error) {
      console.error(error)
      setDataError(error.message || 'Não foi possível excluir o cliente.')
    } finally {
      clientSaveLock.current = false
      setClientSaving(false)
    }
  }

  async function handleVisitSubmit(event) {
    event.preventDefault()
    if (visitSaveLock.current) return
    visitSaveLock.current = true
    setVisitSaving(true)
    setDashboardNotice('')
    try {
      let next
      if (visitEditorId) {
        const currentVisit = dashboardVisits.find((visit) => visit.id === visitEditorId)
        next = await updateDashboardVisit(visitEditorId, {
          clientId: visitForm.clientId, propertyId: visitForm.propertyId, leadId: visitForm.leadId,
          contactName: visitForm.contactName, contactPhone: visitForm.contactPhone,
          contactEmail: visitForm.contactEmail, location: visitForm.location, scheduledAt: visitForm.scheduledAt,
          durationMinutes: Number(visitForm.durationMinutes || 60), status: visitForm.status, notes: visitForm.notes,
          history: [createHistoryEntry('Visit updated from dashboard.'), ...(currentVisit?.history || [])],
        })
      } else {
        next = await saveDashboardVisit(visitForm)
      }

      setDashboardVisits(next)
      if (visitForm.leadId) {
        const nextLeads = await updateLeadStatus(visitForm.leadId, 'visita')
        setLeads(nextLeads)
      }
      setVisitForm(VISIT_FORM_DEFAULTS)
      setVisitEditorOpen(false)
      setVisitEditorId(null)
      setDataError('')
      setDashboardNotice(visitEditorId ? copy.dashboard.visitSaved : copy.dashboard.visitCreated)
      goDashboard('visits')
    } catch (error) {
      console.error(error)
      setDataError(error.message || 'Não foi possível salvar a visita no banco de dados.')
    } finally {
      visitSaveLock.current = false
      setVisitSaving(false)
    }
  }

  async function handleDeleteVisit() {
    const visit = dashboardVisits.find((item) => item.id === visitEditorId)
    if (!visit || visitSaveLock.current || !confirmDashboardDelete(visit.contactName)) return
    visitSaveLock.current = true
    setVisitSaving(true)
    setDashboardNotice('')
    setDataError('')
    try {
      await deleteDashboardRecord('dashboard_visits', visit.id)
      const next = dashboardVisits.filter((item) => item.id !== visit.id)
      if (!hasSupabaseConfig || !supabase) writeLocalStorage(VISITS_STORAGE_KEY, next)
      setDashboardVisits(next)
      closeVisitEditor()
      setDashboardNotice(copy.dashboard.visitDeleted)
    } catch (error) {
      console.error(error)
      setDataError(error.message || 'Não foi possível excluir a visita.')
    } finally {
      visitSaveLock.current = false
      setVisitSaving(false)
    }
  }

  function closeVisitEditor() {
    setVisitEditorOpen(false)
    setVisitEditorId(null)
    setVisitForm(VISIT_FORM_DEFAULTS)
  }

  function openVisitEditor(visit) {
    setVisitEditorOpen(true)
    setVisitForm({
      clientId: visit.clientId || '',
      propertyId: visit.propertyId || '',
      leadId: visit.leadId || '',
      contactName: visit.contactName || '',
      contactPhone: visit.contactPhone || '',
      contactEmail: visit.contactEmail || '',
      location: visit.location || '',
      scheduledAt: toDatetimeLocalValue(visit.scheduledAt),
      durationMinutes: String(visit.durationMinutes || 60),
      status: visit.status,
      notes: visit.notes || '',
    })
    setVisitEditorId(visit.id)
    goDashboard('visits')
  }

  function openCreateVisit(lead = null) {
    setVisitEditorOpen(true)
    setVisitEditorId(null)
    setVisitForm(
      lead
        ? {
            ...VISIT_FORM_DEFAULTS,
            leadId: lead.id,
            contactName: `${lead.name} ${lead.surname}`.trim(),
            contactPhone: lead.phone,
            contactEmail: lead.email,
            location: [lead.address, lead.city].filter(Boolean).join(', '),
            status: 'scheduled',
            notes: lead.comments || '',
          }
        : VISIT_FORM_DEFAULTS,
    )
    goDashboard('visits')
  }

  function openCreateClientFromLead(lead) {
    setClientForm({
      ...CLIENT_FORM_DEFAULTS,
      language: lead.language || 'es',
      name: lead.name,
      surname: lead.surname,
      phone: lead.phone,
      email: lead.email,
      operation: lead.operation === 'alquilar' ? 'alquilar' : 'comprar',
      notes: [lead.comments, `Lead source: ${(copy.ownerForm.sources[lead.source] || companyCopy[language].contact)}`].filter(Boolean).join('\n'),
    })
    setClientEditor({
      isOpen: true,
      mode: 'create',
      clientId: null,
    })
    goDashboard('leads')
  }

  function openCreatePropertyFromLead(lead) {
    setPropertyForm({
      ...PROPERTY_FORM_DEFAULTS,
      title: [lead.city, lead.address].filter(Boolean).join(' · ') || `${lead.name} ${lead.surname}`.trim(),
      reference: '',
      operation: lead.operation === 'alquilar' ? 'alquilar' : 'comprar',
      destination: inferDestinationFromLead(lead),
      observations: [
        lead.comments,
        lead.address ? `Address: ${lead.address}` : '',
        lead.city ? `City: ${lead.city}` : '',
        `Lead source: ${(copy.ownerForm.sources[lead.source] || companyCopy[language].contact)}`,
        `Owner contact: ${lead.name} ${lead.surname}`.trim(),
        lead.phone ? `Phone: ${lead.phone}` : '',
        lead.email ? `Email: ${lead.email}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
    })
    revokeEditorItemUrls(propertyPhotoItems)
    setPropertyPhotoItems([])
    setDraggedPropertyPhotoId(null)
    setPropertyEditor({
      isOpen: true,
      mode: 'create',
      propertyId: null,
    })
    openPropertyEditorRoute('create')
  }

  function handleVisitClientChange(clientId) {
    const client = dashboardClients.find((item) => item.id === clientId)

    setVisitForm((current) => ({
      ...current,
      clientId,
      contactName: client ? `${client.name} ${client.surname}`.trim() : current.contactName,
      contactPhone: client?.phone || current.contactPhone,
      contactEmail: client?.email || current.contactEmail,
    }))
  }

  function openClientEditor(client) {
    setClientForm({
      language: client.language || 'es',
      name: client.name,
      surname: client.surname,
      phone: client.phone,
      email: client.email,
      operation: client.operation,
      destinations: client.destinations,
      types: normalizeTypes(client.types),
      budgetMin: String(client.budgetMin || ''),
      budgetMax: String(client.budgetMax || ''),
      currency: client.currency || 'EUR',
      minBathrooms: String(client.minBathrooms || ''),
      requiredExtras: client.requiredExtras || [],
      minRooms: String(client.minRooms || ''),
      minSurface: String(client.minSurface || ''),
      status: client.status,
      notes: client.notes,
    })
    setClientEditor({
      isOpen: true,
      mode: 'edit',
      clientId: client.id,
    })
  }

  function closeClientEditor() {
    if(clientSaveLock.current)return
    setCreatingPropertyOwner(false)
    setClientForm(CLIENT_FORM_DEFAULTS)
    setClientEditor(CLIENT_EDITOR_DEFAULT)
  }

  function openCreateClientEditor() {
    setClientForm(CLIENT_FORM_DEFAULTS)
    setClientEditor({
      isOpen: true,
      mode: 'create',
      clientId: null,
    })
  }

  function closePropertyEditor() {
    revokeEditorItemUrls(propertyPhotoItems)
    setPropertyEditor(PROPERTY_EDITOR_DEFAULT)
    setPropertyForm(PROPERTY_FORM_DEFAULTS)
    setPropertyPhotoItems([])
    setDraggedPropertyPhotoId(null)
    goDashboard('properties')
  }

  function openCreatePropertyEditor() {
    propertyRequestId.current = null
    setDashboardNotice('')
    setPropertyForm(PROPERTY_FORM_DEFAULTS)
    revokeEditorItemUrls(propertyPhotoItems)
    setPropertyPhotoItems([])
    setDraggedPropertyPhotoId(null)
    setPropertyEditor({
      isOpen: true,
      mode: 'create',
      propertyId: null,
    })
    openPropertyEditorRoute('create')
  }

  function openEditPropertyEditor(property) {
    revokeEditorItemUrls(propertyPhotoItems)
    setPropertyForm(mapPropertyToForm(property))
    setPropertyPhotoItems(mapPhotosToEditorItems(property.photos))
    setDraggedPropertyPhotoId(null)
    setPropertyEditor({
      isOpen: true,
      mode: 'edit',
      propertyId: property.id,
    })
    openPropertyEditorRoute('edit', property.id)
  }

  function handlePropertyPhotoFilesChange(event) {
    const nextFiles = Array.from(event.target.files || [])
    if (!nextFiles.length) {
      return
    }

    try { nextFiles.forEach(validatePhoto) } catch (error) { setDataError(error.message); event.target.value = ''; return }
    setPropertyPhotoItems((current) => [...current, ...createEditorItemsFromFiles(nextFiles)])
    event.target.value = ''
  }

  function movePropertyPhoto(fromIndex, toIndex) {
    setPropertyPhotoItems((current) => moveItem(current, fromIndex, toIndex))
  }

  function removePropertyPhoto(queueId) {
    setPropertyPhotoItems((current) => {
      const removedItem = current.find((item) => item.queueId === queueId)
      if (removedItem?.source === 'new') {
        URL.revokeObjectURL(removedItem.url)
      }

      return current.filter((item) => item.queueId !== queueId)
    })
  }

  function handlePropertyPhotoDragStart(queueId) {
    setDraggedPropertyPhotoId(queueId)
  }

  function handlePropertyPhotoDrop(targetQueueId) {
    if (!draggedPropertyPhotoId || draggedPropertyPhotoId === targetQueueId) {
      setDraggedPropertyPhotoId(null)
      return
    }

    const fromIndex = propertyPhotoItems.findIndex((item) => item.queueId === draggedPropertyPhotoId)
    const toIndex = propertyPhotoItems.findIndex((item) => item.queueId === targetQueueId)

    if (fromIndex >= 0 && toIndex >= 0) {
      movePropertyPhoto(fromIndex, toIndex)
    }

    setDraggedPropertyPhotoId(null)
  }

  function handlePortalDraftChange(propertyId, portalId, field, value) {
    setDashboardProperties((current) =>
      current.map((property) => {
        if (property.id !== propertyId) {
          return property
        }

        return {
          ...property,
          portalPublications: (property.portalPublications || []).map((publication) =>
            publication.portalId === portalId ? { ...publication, [field]: value } : publication,
          ),
        }
      }),
    )
  }

  async function handlePortalSave(property, portalId) {
    const definition = getPortalDefinition(portalId)
    const savingId = `${property.id}:${portalId}`
    setPortalSavingId(savingId)
    setDashboardNotice('')
    try {
      const next = await updateDashboardProperty(property.id, {
        portalPublications: property.portalPublications || [],
        history: [createHistoryEntry(`Portal ${definition?.name || portalId} details updated.`), ...property.history],
      })
      setDashboardProperties(next)
      setDataError('')
      setDashboardNotice(copy.dashboard.portalSaved)
    } catch (error) {
      console.error(error)
      setDataError(error.message || 'Não foi possível atualizar a publicação.')
    } finally {
      setPortalSavingId('')
    }
  }

  async function copyToClipboard(value) {
    if (!value || typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      return
    }

    try {
      await navigator.clipboard.writeText(value)
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <div className="page-shell">
      <Header
        copy={copy}
        language={language}
        onLanguageChange={handleLanguageChange}
        onHomeClick={goHome}
        onCatalogClick={(operation) => goCatalog(operation)}
        onOwnerClick={() => goOwnerForm('vender')}
        onOffMarketClick={() => { setCatalogFilters({ ...CATALOG_FILTER_DEFAULTS, operation: 'all' }); setOffMarketSelection(null); syncRoute({ ...route, view: 'off-market', language, operation: 'all', destination: 'todos', reference: '' }) }}
        showSignOut={route.view === 'dashboard' && Boolean(authSession)}
        onSignOut={handleSignOut}
      />

      {passwordSetup ? <PasswordSetup language={language} client={supabase} session={authSession} loading={authLoading} invalid={initialAuthCallback.invalid} onBack={async () => {
        await handleSignOut()
        setPasswordSetup(false)
        window.history.replaceState({}, '', `?view=dashboard&lang=${language}`)
        syncRoute({ ...route, view: 'dashboard', language })
      }} onContinue={() => {
        setPasswordSetup(false)
        window.history.replaceState({}, '', `?view=dashboard&lang=${language}`)
        syncRoute({ ...route, view: 'dashboard', language })
      }} /> : <>
      {dashboardNotice && isDashboardRoute && <aside className="privacy-notice dashboard-notice" role="status" aria-live="polite">
        <span>{dashboardNotice}</span>
        <button type="button" className="dashboard-notice-close" aria-label={language === 'pt' ? 'Fechar aviso' : language === 'es' ? 'Cerrar aviso' : 'Dismiss notification'} onClick={() => setDashboardNotice('')}><span aria-hidden="true">×</span></button>
      </aside>}
      {dataError || publicDataError ? <div className="database-error" role="alert">{dataError || publicDataError}</div> : null}

      {showDashboardAuthGate ? (
        <DashboardAuthGate
          language={language}
          copy={copy}
          authLoading={authLoading}
          authSession={authSession}
          authAccess={authAccess}
          authForm={authForm}
          authError={authError}
          authSubmitting={authSubmitting}
          onAuthFormChange={handleAuthFormChange}
          onAuthSubmit={handleAuthSubmit}
          onSignOut={handleSignOut}
        />
      ) : null}

      {route.view === 'dashboard' && canOpenDashboard ? (
        <main className="dashboard-page">
          <section className="dashboard-shell">
            <div className="dashboard-head">
              <div>
                <p className="section-label dashboard-label">{copy.dashboard.label}</p>
                <h1>{copy.dashboard.title}</h1>
              </div>
            </div>

            {authAccess ? (
              <section className="dashboard-user-band" aria-label={copy.auth.signedInAs}>
                <div className="dashboard-user-band-copy">
                  <p className="dashboard-user-band-label">{copy.auth.signedInAs}</p>
                  <h2>{authAccess.display_name || authSession?.user?.email}</h2>
                </div>
                <div className="dashboard-user-band-meta">
                  <span>{copy.auth.roleLabel}</span>
                  <strong>{authAccess.role}</strong>
                </div>
              </section>
            ) : null}

            <nav className="dashboard-tabs" aria-label="Dashboard sections">
              {Object.entries(copy.dashboard.sections).map(([section, label]) => (
                <button
                  key={section}
                  type="button"
                  className={dashboardSection === section ? 'dashboard-tab is-active' : 'dashboard-tab'}
                  onClick={() => goDashboard(section)}
                >
                  {label}
                </button>
              ))}
            </nav>

            {dashboardSection === 'overview' ? (
              <section className="dashboard-section">
                <div className="dashboard-stats">
                  <article className="dashboard-stat-card">
                    <span>{copy.dashboard.stats.total}</span>
                    <strong>{dashboardStats.total}</strong>
                  </article>
                  <article className="dashboard-stat-card">
                    <span>{copy.dashboard.stats.nuevo}</span>
                    <strong>{dashboardStats.nuevo}</strong>
                  </article>
                  <article className="dashboard-stat-card">
                    <span>{copy.dashboard.stats.contactado}</span>
                    <strong>{dashboardStats.contactado}</strong>
                  </article>
                  <article className="dashboard-stat-card">
                    <span>{copy.dashboard.stats.cerrado}</span>
                    <strong>{dashboardStats.cerrado}</strong>
                  </article>
                </div>
                <div className="dashboard-overview-grid">
                  <article className="dashboard-overview-card">
                    <span>{copy.dashboard.sections.leads}</span>
                    <strong>{leads.length}</strong>
                  </article>
                  <article className="dashboard-overview-card">
                    <span>{copy.dashboard.sections.properties}</span>
                    <strong>{dashboardProperties.length}</strong>
                  </article>
                  <article className="dashboard-overview-card">
                    <span>{copy.dashboard.sections.portals}</span>
                    <strong>{readyPortalsCount}</strong>
                  </article>
                  <article className="dashboard-overview-card">
                    <span>{copy.dashboard.sections.visits}</span>
                    <strong>{upcomingVisitsCount}</strong>
                  </article>
                  <article className="dashboard-overview-card">
                    <span>{copy.dashboard.sections.clients}</span>
                    <strong>{dashboardClients.length}</strong>
                  </article>
                </div>
              </section>
            ) : null}

            {dashboardSection === 'leads' ? (
              leads.length ? (
                <section className="dashboard-section">
                  <div className="dashboard-properties-head"><div><p className="section-label dashboard-label">{copy.dashboard.sections.leads}</p><h2>{copy.dashboard.title}</h2></div></div>
                  <div className="dashboard-leads-grid">
                    {leads.map((lead) => (
                      <CrmRecord key={lead.id} className="dashboard-lead-card" language={language} title={`${lead.name} ${lead.surname}`} meta={[lead.phone, lead.email, lead.city, copy.ownerForm.operations[lead.operation] || companyCopy[language].contact].filter(Boolean).join(' · ')} status={copy.dashboard.statusOptions[lead.status]} fields={[
                        { label: copy.dashboard.columns.source, value: copy.ownerForm.sources[lead.source] || lead.source },
                        { label: copy.dashboard.columns.date, value: formatDate(lead.createdAt, language) },
                        { label: copy.ownerForm.fields?.comments || (language === 'pt' ? 'Mensagem' : language === 'es' ? 'Mensaje' : 'Message'), value: lead.comments },
                      ]}>
                        <div className="dashboard-lead-top">
                          <div>
                            <p className="dashboard-lead-name">
                              {lead.name} {lead.surname}
                            </p>
                            <p className="dashboard-lead-meta">
                              {lead.city}
                              {lead.address ? ` · ${lead.address}` : ''}
                            </p>
                          </div>
                          <p className="dashboard-lead-date">{formatDate(lead.createdAt, language)}</p>
                        </div>
                        <div className="dashboard-lead-details">
                          <div>
                            <span>{copy.dashboard.columns.operation}</span>
                            <strong>{(copy.ownerForm.operations[lead.operation] || companyCopy[language].contact)}</strong>
                          </div>
                          <div>
                            <span>{copy.dashboard.columns.source}</span>
                            <strong>{(copy.ownerForm.sources[lead.source] || companyCopy[language].contact)}</strong>
                          </div>
                          <div>
                            <span>{copy.dashboard.columns.date}</span>
                            <strong>{lead.phone}</strong>
                          </div>
                          <div>
                            <span>Email</span>
                            <strong>{lead.email}</strong>
                          </div>
                        </div>
                        {lead.comments ? <p className="dashboard-lead-comments">{lead.comments}</p> : null}
                        <div className="dashboard-lead-status">
                          <div>
                            <span>{copy.dashboard.columns.status}</span>
                            <strong>{copy.dashboard.statusOptions[lead.status]}</strong>
                          </div>
                          <CustomSelect
                            value={lead.status}
                            onChange={(value) => handleLeadStatusChange(lead.id, value)}
                            options={leadStatusOptions}
                            className="dashboard-status-select"
                            ariaLabel={copy.dashboard.columns.status}
                            disabled={Boolean(leadSavingId)}
                            light
                          />
                        </div>
                        <div className="dashboard-lead-actions">
                          <button type="button" className="dashboard-editor-secondary" disabled={Boolean(leadSavingId)} onClick={() => handleDeleteLead(lead)}>
                            {copy.dashboard.deleteLead}
                          </button>
                          <button type="button" className="dashboard-property-edit" onClick={() => openCreateClientFromLead(lead)}>
                            {copy.dashboard.leadToClient}
                          </button>
                          {lead.source !== 'property_request' ? (
                            <button type="button" className="dashboard-property-edit" onClick={() => openCreatePropertyFromLead(lead)}>
                              {copy.dashboard.leadToProperty}
                            </button>
                          ) : null}
                          <button type="button" className="dashboard-property-cta" onClick={() => openCreateVisit(lead)}>
                            {copy.dashboard.leadToVisit}
                          </button>
                        </div>
                      </CrmRecord>
                    ))}
                  </div>
                </section>
              ) : (
                <div className="dashboard-empty">
                  <p>{copy.dashboard.empty}</p>
                </div>
              )
            ) : null}

            {dashboardSection === 'properties' ? (
              <section className="dashboard-properties-section dashboard-section">
                <div className="dashboard-properties-head">
                  <div>
                    <p className="section-label dashboard-label">{copy.dashboard.propertiesLabel}</p>
                    <h2>{copy.dashboard.propertiesTitle}</h2>
                  </div>
                </div>
                <div className="dashboard-property-panel">
                  <div>
                    <p>{copy.dashboard.propertyPanelCopy}</p>
                  </div>
                  <button type="button" className="dashboard-property-cta" onClick={openCreatePropertyEditor}>
                    {copy.dashboard.openPropertyEditor}
                  </button>
                </div>

                <div className="dashboard-property-filters">
                  <label>
                    <span>{copy.dashboard.propertyFilters.search}</span>
                    <input
                      type="text"
                      value={propertyFilters.search}
                      onChange={(event) =>
                        setPropertyFilters((current) => ({ ...current, search: event.target.value }))
                      }
                    />
                  </label>
                  <label>
                    <span>{copy.dashboard.propertyFilters.operation}</span>
                    <CustomSelect
                      value={propertyFilters.operation}
                      onChange={(value) => setPropertyFilters((current) => ({ ...current, operation: value }))}
                      options={[
                        { value: 'all', label: copy.catalog.all },
                        { value: 'comprar', label: copy.nav.buy },
                        { value: 'alquilar', label: copy.nav.rent },
                      ]}
                      className="dashboard-filter-select"
                      ariaLabel={copy.dashboard.propertyFilters.operation}
                      light
                    />
                  </label>
                  <label>
                    <span>{copy.dashboard.propertyFilters.destination}</span>
                    <CustomSelect
                      value={propertyFilters.destination}
                      onChange={(value) => setPropertyFilters((current) => ({ ...current, destination: value }))}
                      options={[{ value: 'all', label: copy.catalog.all }, ...destinationOptions]}
                      className="dashboard-filter-select"
                      ariaLabel={copy.dashboard.propertyFilters.destination}
                      light
                    />
                  </label>
                  <label>
                    <span>{copy.dashboard.propertyFilters.status}</span>
                    <CustomSelect
                      value={propertyFilters.status}
                      onChange={(value) => setPropertyFilters((current) => ({ ...current, status: value }))}
                      options={[{ value: 'all', label: copy.catalog.all }, ...propertyStatusOptions]}
                      className="dashboard-filter-select"
                      ariaLabel={copy.dashboard.propertyFilters.status}
                      light
                    />
                  </label>
                </div>

                {filteredDashboardProperties.length ? (
                  <div className="dashboard-properties-grid">
                    {filteredDashboardProperties.map((property) => (
                      <CrmRecord key={property.id} className="dashboard-property-card" language={language} title={property.title} image={property.photos?.[0]?.url}
                        meta={`${property.reference} · ${getOperationLabel(property.operation, language)}${property.offMarket ? ' · Off-market' : ''}`}
                        status={copy.dashboard.propertyStatusOptions[property.status]} editLabel={copy.dashboard.editProperty} onEdit={() => openEditPropertyEditor(property)}
                        fields={[
                          { label: copy.dashboard.propertyFilters.destination, value: `${getDestinationMeta(property.destination, language).name} · ${getTypeLabel(property.type, language)}` },
                          { label: copy.dashboard.clientColumns.budget, value: property.priceLabel || '—' },
                          { label: copy.dashboard.clientColumns.criteria, value: `${property.surface} m² · ${property.rooms} ${copy.dashboard.propertyColumns.rooms} · ${property.bathrooms} ${copy.dashboard.propertyColumns.bathrooms}` },
                        ]} />
                    ))}
                  </div>
                ) : (
                  <div className="dashboard-empty">
                    <p>{copy.dashboard.propertiesEmpty}</p>
                  </div>
                )}
              </section>
            ) : null}

            {dashboardSection === 'portals' ? (
              <section className="dashboard-portals-section dashboard-section">
                <div className="dashboard-properties-head">
                  <div>
                    <p className="section-label dashboard-label">{copy.dashboard.portalsLabel}</p>
                    <h2>{copy.dashboard.portalsTitle}</h2>
                  </div>
                </div>

                <div className="dashboard-property-panel">
                  <div>
                    <p>{copy.dashboard.portalsPanelCopy}</p>
                  </div>
                </div>

                <div className="dashboard-property-filters">
                  <label>
                    <span>{copy.dashboard.portalFilters.search}</span>
                    <input
                      type="text"
                      value={portalFilters.search}
                      onChange={(event) => setPortalFilters((current) => ({ ...current, search: event.target.value }))}
                    />
                  </label>
                  <label>
                    <span>{copy.dashboard.portalFilters.portal}</span>
                    <CustomSelect
                      value={portalFilters.portal}
                      onChange={(value) => setPortalFilters((current) => ({ ...current, portal: value }))}
                      options={portalOptions}
                      className="dashboard-filter-select"
                      ariaLabel={copy.dashboard.portalFilters.portal}
                      light
                    />
                  </label>
                  <label>
                    <span>{copy.dashboard.portalFilters.status}</span>
                    <CustomSelect
                      value={portalFilters.status}
                      onChange={(value) => setPortalFilters((current) => ({ ...current, status: value }))}
                      options={[{ value: 'all', label: copy.catalog.all }, ...portalStatusOptions]}
                      className="dashboard-filter-select"
                      ariaLabel={copy.dashboard.portalFilters.status}
                      light
                    />
                  </label>
                </div>

                {filteredPortalItems.length ? (
                  <div className="dashboard-portals-grid">
                    {filteredPortalItems.map((property) => {
                      const liveProperty = dashboardProperties.find((item) => item.id === property.id) || property
                      const livePublications = getPropertyPortalPublications(liveProperty)

                      return (
                        <CrmRecord key={property.id} className="dashboard-portal-card" language={language} title={property.title} image={property.photos?.[0]?.url} meta={`${property.reference} · ${getDestinationMeta(property.destination, language).name} · ${livePublications.map(publication => `${getPortalDefinition(publication.portalId)?.name || publication.portalId}: ${copy.dashboard.portalStatusOptions[publication.status]}`).join(' · ')}`} editLabel={copy.dashboard.editPropertyFile} onEdit={() => openEditPropertyEditor(liveProperty)} fields={[
                          { label: copy.dashboard.propertyColumns.type, value: getTypeLabel(property.type, language) },
                          { label: copy.dashboard.clientColumns.budget, value: property.priceLabel },
                          { label: copy.dashboard.propertyColumns.surface, value: `${property.surface || '—'} m² · ${property.rooms || 0} ${copy.dashboard.propertyColumns.rooms}` },
                        ]}>
                          <div className="dashboard-property-top">
                            <div>
                              <p className="dashboard-property-reference">{property.reference}</p>
                              <h3>{property.title}</h3>
                            </div>
                            <div className="dashboard-property-actions">
                              <button
                                type="button"
                                className="dashboard-property-edit"
                                onClick={() => openEditPropertyEditor(liveProperty)}
                              >
                                {copy.dashboard.editPropertyFile}
                              </button>
                            </div>
                          </div>

                          <div className="dashboard-property-meta">
                            <div>
                              <span>{copy.dashboard.propertyColumns.type}</span>
                              <strong>{getTypeLabel(property.type, language)}</strong>
                            </div>
                            <div>
                              <span>{copy.dashboard.propertyColumns.operation}</span>
                              <strong>{getOperationLabel(property.operation, language)}</strong>
                            </div>
                            <div>
                              <span>{copy.dashboard.propertyColumns.destination}</span>
                              <strong>{getDestinationMeta(property.destination, language).name}</strong>
                            </div>
                            <div>
                              <span>{copy.dashboard.propertyColumns.price}</span>
                              <strong>{property.priceLabel || '-'}</strong>
                            </div>
                            <div>
                              <span>{copy.dashboard.sections.portals}</span>
                              <strong>{livePublications.length || 0}</strong>
                            </div>
                            <div>
                              <span>{copy.dashboard.photoLabel}</span>
                              <strong>{property.photos?.length || 0}</strong>
                            </div>
                          </div>

                          {livePublications.length ? (
                            livePublications.map((publication) => {
                              const definition = getPortalDefinition(publication.portalId)
                              const missingFields = getPortalMissingFields(liveProperty)
                              return (
                                <section key={`${property.id}-${publication.portalId}`} className="dashboard-portal-publication">
                                  <div className="dashboard-property-top">
                                    <div>
                                      <p className="dashboard-property-reference">{definition?.name || publication.portalId}</p>
                                      <h3>{property.reference} · {property.title}</h3>
                                    </div>
                                    <span className={`dashboard-portal-badge is-${publication.status}`}>
                                      {copy.dashboard.portalStatusOptions[publication.status]}
                                    </span>
                                  </div>

                                  <div className="dashboard-property-meta">
                                    <div>
                                      <span>{copy.dashboard.portalPortalLabel}</span>
                                      <strong>{definition?.name || publication.portalId}</strong>
                                    </div>
                                    <div>
                                      <span>{copy.dashboard.portalPublishedAtLabel}</span>
                                      <strong>{publication.publishedAt ? formatDate(publication.publishedAt, language) : '-'}</strong>
                                    </div>
                                  </div>

                                  <div className="dashboard-portal-actions">
                                    <button
                                      type="button"
                                      className="dashboard-property-cta"
                                      disabled
                                      title={definition?.id === 'fotocasa' ? portalFormCopy.api : portalFormCopy.api}
                                    >
                                      {portalFormCopy.publish} · {portalFormCopy.api}
                                    </button>
                                    <span className={missingFields.length ? 'dashboard-portal-readiness is-incomplete' : 'dashboard-portal-readiness'}>
                                      {missingFields.length} {portalFormCopy.missing}
                                    </span>
                                    {publication.listingUrl ? (
                                      <a className="dashboard-property-edit" href={publication.listingUrl} target="_blank" rel="noreferrer">
                                        {copy.dashboard.openListing}
                                      </a>
                                    ) : null}
                                    <button type="button" className="dashboard-property-edit" onClick={() => copyToClipboard(property.title)}>
                                      {copy.dashboard.copyPortalTitle}
                                    </button>
                                    <button
                                      type="button"
                                      className="dashboard-property-edit"
                                      onClick={() => copyToClipboard(buildPortalDescription(property, language))}
                                    >
                                      {copy.dashboard.copyPortalDescription}
                                    </button>
                                  </div>

                                  <div className="dashboard-portal-fields">
                                    <label>
                                      <span>{copy.dashboard.portalListingUrlLabel}</span>
                                      <input
                                        type="url"
                                        value={publication.listingUrl}
                                        onChange={(event) =>
                                          handlePortalDraftChange(property.id, publication.portalId, 'listingUrl', event.target.value)
                                        }
                                      />
                                    </label>
                                    <label>
                                      <span>{copy.dashboard.portalReferenceLabel}</span>
                                      <input
                                        type="text"
                                        value={publication.externalReference}
                                        onChange={(event) =>
                                          handlePortalDraftChange(property.id, publication.portalId, 'externalReference', event.target.value)
                                        }
                                      />
                                    </label>
                                    <label className="dashboard-property-form-full">
                                      <span>{copy.dashboard.portalNotesLabel}</span>
                                      <textarea
                                        value={publication.notes}
                                        onChange={(event) =>
                                          handlePortalDraftChange(property.id, publication.portalId, 'notes', event.target.value)
                                        }
                                      />
                                    </label>
                                  </div>

                                  <div className="dashboard-portal-footer">
                                    <button type="button" className="dashboard-property-submit" disabled={Boolean(portalSavingId)} onClick={() => handlePortalSave(liveProperty, publication.portalId)}>
                                      {portalSavingId === `${property.id}:${publication.portalId}` ? copy.dashboard.saving : copy.dashboard.savePortal}
                                    </button>
                                  </div>
                                </section>
                              )
                            })
                          ) : (
                            <p className="dashboard-portal-empty">{copy.dashboard.portalsSelectionEmpty}</p>
                          )}
                        </CrmRecord>
                      )
                    })}
                  </div>
                ) : (
                  <div className="dashboard-empty">
                    <p>{copy.dashboard.portalsEmpty}</p>
                  </div>
                )}
              </section>
            ) : null}

            {dashboardSection === 'invoices' ? <Suspense fallback={<p>…</p>}><Invoices clients={dashboardClients} properties={dashboardProperties} language={language} onSaving={() => setDashboardNotice('')} onSaved={(kind) => setDashboardNotice(kind === 'issuer' ? copy.dashboard.invoiceIssuerSaved : kind === 'deleted' ? copy.dashboard.invoiceDeleted : copy.dashboard.invoiceSaved)} /></Suspense> : null}

            {dashboardSection === 'opportunities' ? <Opportunities clients={dashboardClients} properties={dashboardProperties} language={language} copy={copy} onClient={openClientEditor} onProperty={goProperty} loading={opportunitiesLoading} error={dataError} /> : null}

            {dashboardSection === 'tasks' ? <Tasks language={language} clients={dashboardClients} leads={leads} properties={dashboardProperties} onSaving={() => setDashboardNotice('')} onSaved={(kind) => setDashboardNotice(kind === 'deleted' ? copy.dashboard.taskDeleted : copy.dashboard.taskSaved)} /> : null}

            {dashboardSection === 'visits' ? (
              <section className="dashboard-visits-section dashboard-section">
                <div className="dashboard-properties-head">
                  <div>
                    <p className="section-label dashboard-label">{copy.dashboard.visitsLabel}</p>
                    <h2>{copy.dashboard.visitsTitle}</h2>
                  </div>
                </div>

                <div className="dashboard-property-panel">
                  <div>
                    <p>{copy.dashboard.visitPanelCopy}</p>
                  </div>
                  <button type="button" className="dashboard-property-cta" onClick={() => openCreateVisit()}>
                    {copy.dashboard.newVisit}
                  </button>
                </div>

                {visitEditorOpen && <EditorDialog title={visitEditorId ? copy.dashboard.editVisit : copy.dashboard.addVisit} closeLabel={copy.dashboard.closeEditor} busy={visitSaving} onClose={closeVisitEditor}>
                {dataError && <p role="alert">{dataError}</p>}
                <form className="dashboard-visit-form" onSubmit={handleVisitSubmit}>
                  <label>
                    <span>{copy.dashboard.visitFields.client}</span>
                    <CustomSelect
                      value={visitForm.clientId}
                      onChange={handleVisitClientChange}
                      options={clientOptions}
                      className="dashboard-form-select"
                      ariaLabel={copy.dashboard.visitFields.client}
                      light
                    />
                  </label>
                  <label>
                    <span>{copy.dashboard.visitFields.property}</span>
                    <CustomSelect
                      value={visitForm.propertyId}
                      onChange={(value) => setVisitForm((current) => ({ ...current, propertyId: value, location: dashboardProperties.find(property => property.id === value)?.privateAddress || '' }))}
                      options={propertyOptions}
                      className="dashboard-form-select"
                      ariaLabel={copy.dashboard.visitFields.property}
                      light
                    />
                  </label>
                  <label>
                    <span>{copy.dashboard.visitFields.scheduledAt}</span>
                    <input
                      type="datetime-local"
                      value={visitForm.scheduledAt}
                      onChange={(event) => setVisitForm((current) => ({ ...current, scheduledAt: event.target.value }))}
                      required
                    />
                  </label>
                  <label>
                    <span>{copy.dashboard.visitFields.durationMinutes}</span>
                    <input
                      type="number"
                      min="15"
                      step="15"
                      value={visitForm.durationMinutes}
                      onChange={(event) => setVisitForm((current) => ({ ...current, durationMinutes: event.target.value }))}
                    />
                  </label>
                  <label>
                    <span>{copy.dashboard.visitFields.contactName}</span>
                    <input
                      type="text"
                      value={visitForm.contactName}
                      onChange={(event) => setVisitForm((current) => ({ ...current, contactName: event.target.value }))}
                      required
                    />
                  </label>
                  <label>
                    <span>{copy.dashboard.visitFields.contactPhone}</span>
                    <input
                      type="text"
                      value={visitForm.contactPhone}
                      onChange={(event) => setVisitForm((current) => ({ ...current, contactPhone: event.target.value }))}
                    />
                  </label>
                  <label>
                    <span>{copy.dashboard.visitFields.contactEmail}</span>
                    <input
                      type="email"
                      value={visitForm.contactEmail}
                      onChange={(event) => setVisitForm((current) => ({ ...current, contactEmail: event.target.value }))}
                    />
                  </label>
                  <label>
                    <span>{copy.dashboard.visitFields.status}</span>
                    <CustomSelect
                      value={visitForm.status}
                      onChange={(value) => setVisitForm((current) => ({ ...current, status: value }))}
                      options={visitStatusOptions}
                      className="dashboard-form-select"
                      ariaLabel={copy.dashboard.visitFields.status}
                      light
                    />
                  </label>
                  <label className="dashboard-property-form-full">
                    <span>{copy.dashboard.visitFields.location}</span>
                    <input
                      type="text"
                      value={visitForm.location}
                      onChange={(event) => setVisitForm((current) => ({ ...current, location: event.target.value }))}
                    />
                  </label>
                  <label className="dashboard-property-form-full">
                    <span>{copy.dashboard.visitFields.notes}</span>
                    <textarea
                      value={visitForm.notes}
                      onChange={(event) => setVisitForm((current) => ({ ...current, notes: event.target.value }))}
                    />
                  </label>
                  <div className="dashboard-editor-actions dashboard-property-form-full">
                    {visitEditorId && <button type="button" className="dashboard-editor-secondary" disabled={visitSaving} onClick={handleDeleteVisit}>{copy.dashboard.deleteVisit}</button>}
                    <button type="submit" className="dashboard-property-submit" disabled={visitSaving}>
                      {visitSaving ? copy.dashboard.saving : visitEditorId ? copy.dashboard.updateVisit : copy.dashboard.addVisit}
                    </button>
                  </div>
                </form>
                </EditorDialog>}

                <div className="dashboard-property-filters">
                  <label>
                    <span>{copy.dashboard.visitFilters.search}</span>
                    <input
                      type="text"
                      value={visitFilters.search}
                      onChange={(event) => setVisitFilters((current) => ({ ...current, search: event.target.value }))}
                    />
                  </label>
                  <label>
                    <span>{copy.dashboard.visitFilters.status}</span>
                    <CustomSelect
                      value={visitFilters.status}
                      onChange={(value) => setVisitFilters((current) => ({ ...current, status: value }))}
                      options={[{ value: 'all', label: copy.catalog.all }, ...visitStatusOptions]}
                      className="dashboard-filter-select"
                      ariaLabel={copy.dashboard.visitFilters.status}
                      light
                    />
                  </label>
                </div>

                {filteredDashboardVisits.length ? (
                  <div className="dashboard-visits-grid">
                    {filteredDashboardVisits.map((visit) => {
                      const linkedClient = visitRecipient(visit, dashboardClients, leads)
                      const linkedProperty = dashboardProperties.find((property) => property.id === visit.propertyId)
                      const messageLanguage = recipientLanguage(linkedClient, leads.find(lead => lead.id === visit.leadId))
                      const calendarLink = buildGoogleCalendarLink(visit, linkedProperty, linkedClient, messageLanguage)
                      const emailLink = buildVisitEmail(visit, linkedProperty, linkedClient, messageLanguage)

                      return (
                        <CrmRecord key={visit.id} className="dashboard-visit-card" language={language} title={visit.contactName}
                          meta={<strong className="task-deadline">{formatDate(visit.scheduledAt, language)} · {visit.durationMinutes || 60} min</strong>}
                          status={copy.dashboard.visitStatusOptions[visit.status]} editLabel={copy.dashboard.editVisit} onEdit={() => openVisitEditor(visit)}
                          fields={[
                            { label: copy.dashboard.visitColumns.contact, value: [visit.contactPhone, visit.contactEmail].filter(Boolean).join(' · ') },
                            { label: copy.dashboard.visitColumns.property, value: linkedProperty ? `${linkedProperty.reference} · ${linkedProperty.title}` : copy.dashboard.unlinked },
                            { label: copy.dashboard.visitFields.location, value: visit.location },
                          ]}
                          actions={<>
                            {calendarLink && <a className="dashboard-property-edit dashboard-calendar-link" href={calendarLink} target="_blank" rel="noreferrer" title={copy.dashboard.visitReminderTip}>{copy.dashboard.calendarLink}</a>}
                            {emailLink ? <a className="dashboard-property-edit" href={emailLink}>{copy.dashboard.visitEmail}</a> : <button type="button" disabled title={copy.dashboard.visitEmailMissing}>{copy.dashboard.visitEmail}</button>}
                          </>} />
                      )
                    })}
                  </div>
                ) : (
                  <div className="dashboard-empty">
                    <p>{copy.dashboard.visitsEmpty}</p>
                  </div>
                )}
              </section>
            ) : null}

            {dashboardSection === 'clients' ? (
              <section className="dashboard-clients-section dashboard-section">
                <div className="dashboard-properties-head">
                  <div>
                    <p className="section-label dashboard-label">{copy.dashboard.clientsLabel}</p>
                    <h2>{copy.dashboard.clientsTitle}</h2>
                  </div>
                </div>

                <div className="dashboard-client-panel">
                  <div>
                    <p>{copy.dashboard.clientPanelCopy}</p>
                  </div>
                  <button type="button" className="dashboard-client-reset" onClick={openCreateClientEditor}>
                    {copy.dashboard.newClient}
                  </button>
                </div>

                <div className="dashboard-property-filters">
                  <label>
                    <span>{copy.dashboard.clientFilters.search}</span>
                    <input
                      type="text"
                      value={clientFilters.search}
                      onChange={(event) => setClientFilters((current) => ({ ...current, search: event.target.value }))}
                    />
                  </label>
                  <label>
                    <span>{copy.dashboard.clientFilters.operation}</span>
                    <CustomSelect
                      value={clientFilters.operation}
                      onChange={(value) => setClientFilters((current) => ({ ...current, operation: value }))}
                      options={[
                        { value: 'all', label: copy.catalog.all },
                        { value: 'comprar', label: copy.nav.buy },
                        { value: 'alquilar', label: copy.nav.rent },
                      ]}
                      className="dashboard-filter-select"
                      ariaLabel={copy.dashboard.clientFilters.operation}
                      light
                    />
                  </label>
                  <label>
                    <span>{copy.dashboard.clientFilters.status}</span>
                    <CustomSelect
                      value={clientFilters.status}
                      onChange={(value) => setClientFilters((current) => ({ ...current, status: value }))}
                      options={[{ value: 'all', label: copy.catalog.all }, ...clientStatusOptions]}
                      className="dashboard-filter-select"
                      ariaLabel={copy.dashboard.clientFilters.status}
                      light
                    />
                  </label>
                </div>

                {filteredDashboardClients.length ? (
                  <div className="dashboard-clients-grid">
                    {filteredDashboardClients.map((client) => {
                      return (
                        <CrmRecord key={client.id} className="dashboard-client-card" language={language}
                          title={`${client.name} ${client.surname}`} meta={getOperationLabel(client.operation, language)}
                          status={copy.dashboard.clientStatusOptions[client.status]} editLabel={copy.dashboard.editClient} onEdit={() => openClientEditor(client)}
                          fields={[
                            { label: copy.dashboard.clientColumns.contact, value: [client.phone, client.email].filter(Boolean).join(' · ') },
                            { label: copy.dashboard.clientColumns.budget, value: `${formatBudgetRange(client)} ${client.currency || 'EUR'}` },
                            { label: copy.dashboard.clientColumns.criteria, value: [
                              client.destinations.map(destination => getDestinationMeta(destination, language).name).join(', '),
                              normalizeTypes(client.types).map(type => getTypeLabel(type, language)).join(', '),
                              client.minRooms ? `${copy.dashboard.propertyColumns.rooms}: ≥ ${client.minRooms}` : '',
                              client.minBathrooms ? `${copy.dashboard.propertyColumns.bathrooms}: ≥ ${client.minBathrooms}` : '',
                              client.minSurface ? `≥ ${client.minSurface} m²` : '',
                              ...(client.requiredExtras || []).map(extra => copy.catalog.extras[extra] || extra),
                            ].filter(Boolean).join(' · ') },
                          ]} />
                      )
                    })}
                  </div>
                ) : (
                  <div className="dashboard-empty">
                    <p>{copy.dashboard.clientsEmpty}</p>
                  </div>
                )}
              </section>
            ) : null}
          </section>
        </main>
      ) : null}

      {route.view === 'property-editor' && canOpenDashboard && propertyEditor.isOpen && !creatingPropertyOwner ? (
        <main className="dashboard-page">
          <section className="dashboard-shell">
            <div className="dashboard-editor-page-head">
              <div>
                {propertyEditor.mode === 'edit' ? (
                  <h1>{copy.dashboard.editorEditEyebrow}</h1>
                ) : (
                  <>
                    <p className="section-label dashboard-label">{copy.dashboard.editorCreateEyebrow}</p>
                    <h1>{copy.dashboard.editorCreateTitle}</h1>
                  </>
                )}
              </div>
              <button type="button" className="dashboard-editor-secondary" disabled={propertySaving} onClick={closePropertyEditor}>
                {copy.dashboard.backToProperties}
              </button>
            </div>

            <form className="dashboard-property-form dashboard-property-editor-page" onSubmit={handlePropertySubmit}>
              <div className="property-editor-toolbar dashboard-property-form-full">
                <p>{propertyForm.reference || (language === 'pt' ? 'Referência automática: KH0115 em diante.' : language === 'es' ? 'Referencia automática: desde KH0115.' : 'Automatic reference: KH0115 onwards.')}</p>
                <PropertyEditorActions editing={propertyEditor.mode === 'edit'} busy={propertySaving} language={language} saveLabel={propertyEditor.mode === 'edit' ? copy.dashboard.updateProperty : copy.dashboard.addProperty} savingLabel={copy.dashboard.saving} onDelete={handleDeleteProperty} />
              </div>
              <PropertyOwner Select={CustomSelect} value={propertyForm.ownerClientId} clients={dashboardClients} language={language} onChange={ownerClientId=>setPropertyForm(current=>({...current,ownerClientId}))} onCreate={()=>{setClientForm({...CLIENT_FORM_DEFAULTS,language,requestId:createId('client')});setClientEditor({isOpen:true,mode:'create',clientId:null});setCreatingPropertyOwner(true);window.scrollTo(0,0)}} />
              <label>
                <span>{copy.dashboard.propertyFields.title}</span>
                <input
                  type="text"
                  value={propertyForm.title}
                  onChange={(event) => setPropertyForm((current) => ({ ...current, title: event.target.value }))}
                  required
                />
              </label>
              <label>
                <span>{copy.dashboard.propertyFields.operation}</span>
                <CustomSelect
                  value={propertyForm.operation}
                  onChange={(value) => setPropertyForm((current) => ({ ...current, operation: value }))}
                  options={[
                    { value: 'comprar', label: copy.nav.buy },
                    { value: 'alquilar', label: copy.nav.rent },
                  ]}
                  className="dashboard-form-select"
                  ariaLabel={copy.dashboard.propertyFields.operation}
                  light
                />
              </label>
              <label>
                <span>{copy.dashboard.propertyFields.destination}</span>
                <input required value={capitalizeCity(propertyForm.destination)} onChange={event => setPropertyForm(current => ({...current,destination:capitalizeCity(event.target.value)}))} />
              </label>
              <label>
                <span>{copy.dashboard.propertyFields.type}</span>
                <CustomSelect
                  value={propertyForm.type}
                  onChange={(value) => setPropertyForm((current) => ({ ...current, type: value }))}
                  options={PROPERTY_TYPE_OPTIONS.map((value) => ({ value, label: copy.catalog.types[value] }))}
                  className="dashboard-form-select"
                  ariaLabel={copy.dashboard.propertyFields.type}
                  light
                />
              </label>
              <label className="dashboard-property-form-full"><span>{language === 'pt' ? 'Endereço privado (uso interno)' : language === 'es' ? 'Dirección privada (uso interno)' : 'Private address (internal use)'}</span><input value={propertyForm.privateAddress || ''} onChange={e => setPropertyForm(current => ({ ...current, privateAddress: e.target.value }))} /></label>
              <label>
                <span>{copy.dashboard.propertyFields.status}</span>
                <CustomSelect
                  value={propertyForm.status}
                  onChange={(value) => setPropertyForm((current) => ({ ...current, status: value }))}
                  options={propertyStatusOptions}
                  className="dashboard-form-select"
                  ariaLabel={copy.dashboard.propertyFields.status}
                  light
                />
              </label>
              <label>
                <span>{language === 'pt' ? 'Moeda' : language === 'es' ? 'Moneda' : 'Currency'}</span>
                <CustomSelect value={propertyForm.currency} onChange={value => setPropertyForm(current => ({ ...current, currency: value }))} options={CURRENCIES.map(value => ({ value, label: value }))} className="dashboard-form-select" ariaLabel={language === 'pt' ? 'Moeda' : language === 'es' ? 'Moneda' : 'Currency'} light />
              </label>
              <label>
                <span>{copy.dashboard.propertyFields.priceValue}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={propertyForm.priceValue}
                  onChange={(event) => setPropertyForm((current) => ({ ...current, priceValue: event.target.value }))}
                />
              </label>
              <label>
                <span>{copy.dashboard.propertyFields.surface}</span>
                <input
                  type="number"
                  value={propertyForm.surface}
                  onChange={(event) => setPropertyForm((current) => ({ ...current, surface: event.target.value }))}
                  required
                />
              </label>
              <label>
                <span>{copy.dashboard.propertyFields.rooms}</span>
                <input
                  type="number"
                  value={propertyForm.rooms}
                  onChange={(event) => setPropertyForm((current) => ({ ...current, rooms: event.target.value }))}
                  required
                />
              </label>
              <label>
                <span>{copy.dashboard.propertyFields.bathrooms}</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={propertyForm.bathrooms}
                  onChange={(event) => setPropertyForm((current) => ({ ...current, bathrooms: event.target.value }))}
                  required
                />
              </label>
              <label className="dashboard-property-form-full offmarket-toggle">
                <input type="checkbox" checked={propertyForm.offMarket || false} onChange={e => setPropertyForm(current => ({ ...current, offMarket: e.target.checked }))} />
                <span>Off-market</span>
                <small>{language === 'pt' ? 'Exibir somente com imagem ilustrativa.' : language === 'es' ? 'Mostrar solo con imagen ilustrativa.' : 'Display with an illustrative image only.'}</small>
              </label>
              <label className="dashboard-property-form-full">
                <span>{copy.dashboard.propertyFields.observations}</span>
                <textarea
                  value={propertyForm.observations}
                  onChange={(event) => setPropertyForm((current) => ({ ...current, observations: event.target.value }))}
                />
              </label>
              <PropertyAI key={`${propertyEditor.mode}:${propertyEditor.propertyId}`} form={propertyForm} setForm={setPropertyForm} language={language} />
              <div className="dashboard-property-form-full">
                <p>{language === 'pt' ? 'Traduções do anúncio' : language === 'es' ? 'Traducciones del anuncio' : 'Listing translations'}</p>
                <p className="dashboard-property-help">{language === 'pt' ? 'Campos opcionais. Quando vazios, o site usa o título e a descrição originais acima.' : language === 'es' ? 'Campos opcionales. Si están vacíos, se utiliza el título y la descripción originales.' : 'Optional fields. Empty fields use the original title and description above.'}</p>
              </div>
              {['pt', 'es', 'en'].map(locale => <div className="dashboard-property-form-full" key={locale}>
                <label><span>{copy.dashboard.propertyFields.title} — {({ pt: 'Português', es: 'Español', en: 'English' })[locale]}</span>
                  <input value={propertyForm.portalData?.translations?.[locale]?.title || ''} onChange={event => setPropertyForm(current => ({ ...current, portalData: { ...current.portalData, translations: { ...current.portalData?.translations, [locale]: { ...current.portalData?.translations?.[locale], title: event.target.value } } } }))} />
                </label>
                <label><span>{language === 'pt' ? 'Descrição' : language === 'es' ? 'Descripción' : 'Description'} — {({ pt: 'Português', es: 'Español', en: 'English' })[locale]}</span>
                  <textarea value={propertyForm.portalData?.translations?.[locale]?.description || ''} onChange={event => setPropertyForm(current => ({ ...current, portalData: { ...current.portalData, translations: { ...current.portalData?.translations, [locale]: { ...current.portalData?.translations?.[locale], description: event.target.value } } } }))} />
                </label>
              </div>)}
              <label className="dashboard-property-form-full">
                <span>{copy.dashboard.propertyFields.photos}</span>
                <input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={propertyForm.offMarket} onChange={handlePropertyPhotoFilesChange} />
                {propertyForm.offMarket && <small>{language === 'pt' ? 'Off-market usa apenas a imagem ilustrativa no site.' : language === 'es' ? 'Off-market utiliza solo la imagen ilustrativa en la web.' : 'Off-market uses only the illustrative image on the website.'}</small>}
                <small className="dashboard-property-help">{copy.dashboard.photoHelp}</small>
              </label>
              {propertyPhotoItems.length ? (
                <div className="dashboard-property-photo-sorter dashboard-property-form-full">
                  <span>{copy.dashboard.photoLabel}</span>
                  <small className="dashboard-property-help">{copy.dashboard.photoOrderHelp}</small>
                  <div className="dashboard-property-photo-sorter-grid">
                    {propertyPhotoItems.map((item, index) => (
                      <figure
                        key={item.queueId}
                        className={draggedPropertyPhotoId === item.queueId ? 'dashboard-sortable-photo is-dragging' : 'dashboard-sortable-photo'}
                        draggable
                        onDragStart={() => handlePropertyPhotoDragStart(item.queueId)}
                        onDragEnd={() => setDraggedPropertyPhotoId(null)}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={() => handlePropertyPhotoDrop(item.queueId)}
                      >
                        <img src={item.url} alt={item.name || propertyForm.title} />
                        <figcaption>
                          <strong>{index + 1}</strong>
                          <span>{item.name || copy.dashboard.photoLabel}</span>
                        </figcaption>
                        <div className="dashboard-sortable-photo-actions">
                          <button
                            type="button"
                            className="dashboard-photo-remove-button"
                            onClick={() => removePropertyPhoto(item.queueId)}
                            aria-label={`${copy.dashboard.removePhoto}: ${item.name || index + 1}`}
                          >
                            ×
                          </button>
                          <button
                            type="button"
                            className="dashboard-photo-order-button"
                            onClick={() => movePropertyPhoto(index, Math.max(0, index - 1))}
                            disabled={index === 0}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            className="dashboard-photo-order-button"
                            onClick={() => movePropertyPhoto(index, Math.min(propertyPhotoItems.length - 1, index + 1))}
                            disabled={index === propertyPhotoItems.length - 1}
                          >
                            ↓
                          </button>
                        </div>
                      </figure>
                    ))}
                  </div>
                </div>
              ) : null}
              {propertyEditor.mode === 'edit' && propertyEditor.propertyId ? (
                <div className="dashboard-property-history dashboard-property-form-full">
                  <span>{copy.dashboard.historyTitle}</span>
                  <div className="dashboard-history-list">
                    {(dashboardProperties.find((property) => property.id === propertyEditor.propertyId)?.history || []).map((item) => (
                      <article key={item.id} className="dashboard-history-item">
                        <p>{item.text}</p>
                        <time>{formatDate(item.createdAt, language)}</time>
                      </article>
                    ))}
                  </div>
                </div>
              ) : null}
                  <div className="dashboard-property-form-full">
                    <p>{copy.property.detailLabels.extras}</p>
                    <TogglePillGroup value={propertyForm.portalData.extras || []} options={Object.entries(copy.catalog.extras).map(([value, label]) => ({ value, label }))} onChange={value => setPropertyForm(current => ({ ...current, portalData: { ...current.portalData, extras: value } }))} ariaLabel={copy.property.detailLabels.extras} />
                  </div>
              <section className="dashboard-property-form-full dashboard-portal-data-section">
                <div className="dashboard-portal-prep-head">
                  <div>
                    <span>{portalFormCopy.title}</span>
                    <small className="dashboard-property-help">{portalFormCopy.help}</small>
                  </div>
                </div>
                <div className="dashboard-portal-data-grid">
                  {PORTAL_DATA_FIELDS.map(([field, type], index) => (
                    <label key={field}>
                      <span>{portalFormCopy.fields[index]}</span>
                      <input
                        type={type}
                        value={propertyForm.portalData[field]}
                        onChange={(event) => setPropertyForm((current) => ({
                          ...current,
                          portalData: { ...current.portalData, [field]: event.target.value },
                        }))}
                      />
                    </label>
                  ))}
                </div>
                <div className="dashboard-portal-environment">
                  <span>{portalEnvironmentCopy.title}</span>
                  <div className="dashboard-portal-environment-grid">
                    {PORTAL_ENVIRONMENT_FIELDS.map((field, index) => (
                      <label key={field}>
                        <input
                          type="checkbox"
                          checked={Boolean(propertyForm.portalData[field])}
                          onChange={(event) => setPropertyForm((current) => ({
                            ...current,
                            portalData: { ...current.portalData, [field]: event.target.checked },
                          }))}
                        />
                        <span>{portalEnvironmentCopy.fields[index]}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </section>
              <details className="dashboard-property-form-full dashboard-portal-picker">
                <summary>
                  <span>{portalFormCopy.select}</span>
                  <strong>{propertyForm.selectedPortals.length || 0}</strong>
                </summary>
                <p>{portalFormCopy.selectHelp}</p>
                <div className="dashboard-portal-checklist">
                  {PORTAL_DEFINITIONS.map((portal) => (
                    <label key={portal.id}>
                      <input
                        type="checkbox"
                        checked={propertyForm.selectedPortals.includes(portal.id)}
                        onChange={() => setPropertyForm((current) => {
                          const selectedPortals = toggleSelection(current.selectedPortals, portal.id)
                          return { ...current, publishToPortals: selectedPortals.length > 0, selectedPortals }
                        })}
                      />
                      <strong>{portal.name}</strong>
                      <span>{portalFormCopy.draft}</span>
                    </label>
                  ))}
                </div>
              </details>
              <div className="dashboard-property-form-full"><PropertyEditorActions editing={propertyEditor.mode === 'edit'} busy={propertySaving} language={language} saveLabel={propertyEditor.mode === 'edit' ? copy.dashboard.updateProperty : copy.dashboard.addProperty} savingLabel={copy.dashboard.saving} onDelete={handleDeleteProperty} /></div>
              <div className="dashboard-property-form-full property-editor-bottom-back"><button type="button" className="dashboard-editor-secondary" disabled={propertySaving} onClick={closePropertyEditor}>{copy.dashboard.backToProperties}</button></div>
            </form>
          </section>
        </main>
      ) : null}

      {canOpenDashboard && clientEditor.isOpen && ((route.view === 'dashboard' && ['clients', 'opportunities', 'leads'].includes(dashboardSection)) || (route.view === 'property-editor' && creatingPropertyOwner)) ? (
        <div className={creatingPropertyOwner ? 'property-owner-page' : 'dashboard-editor-overlay'} role={creatingPropertyOwner ? undefined : 'dialog'} aria-modal={creatingPropertyOwner ? undefined : true} aria-label={copy.dashboard.editClient}>
          {!creatingPropertyOwner && <div className="dashboard-editor-backdrop" onClick={closeClientEditor} />}
          <section className={creatingPropertyOwner ? 'dashboard-property-editor-page' : 'dashboard-editor-sheet'}>
            <div className="dashboard-editor-head">
              <div>
                <p className="section-label dashboard-label">
                  {clientEditor.mode === 'edit' ? copy.dashboard.editClient : copy.dashboard.newClient}
                </p>
                <h2>{copy.dashboard.clientsTitle}</h2>
              </div>
              <button type="button" className="dashboard-editor-close" onClick={closeClientEditor}>
                {copy.dashboard.closeEditor}
              </button>
            </div>

            <form className="dashboard-client-form dashboard-editor-form" onSubmit={handleClientSubmit}>
              <label>
                <span>{copy.dashboard.clientFields.name}</span>
                <input
                  type="text"
                  value={clientForm.name}
                  onChange={(event) => setClientForm((current) => ({ ...current, name: event.target.value }))}
                  required
                />
              </label>
              <label>
                <span>{copy.dashboard.clientFields.surname}</span>
                <input
                  type="text"
                  value={clientForm.surname}
                  onChange={(event) => setClientForm((current) => ({ ...current, surname: event.target.value }))}
                />
              </label>
              <label>
                <span>{copy.dashboard.clientFields.phone}</span>
                <input
                  type="text"
                  value={clientForm.phone}
                  onChange={(event) => setClientForm((current) => ({ ...current, phone: event.target.value }))}
                />
              </label>
              <label>
                <span>{copy.dashboard.clientFields.email}</span>
                <input
                  type="email"
                  value={clientForm.email}
                  onChange={(event) => setClientForm((current) => ({ ...current, email: event.target.value }))}
                />
              </label>
              <label><span>{copy.nav.language}</span><CustomSelect value={clientForm.language || 'es'} onChange={value => setClientForm(current => ({ ...current, language: value }))} options={[{value:'es',label:'Español'},{value:'pt',label:'Português'},{value:'en',label:'English'}]} ariaLabel={copy.nav.language} className="dashboard-form-select" light /></label>
              <label>
                <span>{copy.dashboard.clientFields.operation}</span>
                <CustomSelect
                  value={clientForm.operation}
                  onChange={(value) => setClientForm((current) => ({ ...current, operation: value }))}
                  options={[
                    { value: 'comprar', label: copy.nav.buy },
                    { value: 'alquilar', label: copy.nav.rent },
                  ]}
                  className="dashboard-form-select"
                  ariaLabel={copy.dashboard.clientFields.operation}
                  light
                />
              </label>
              <label>
                <span>{copy.dashboard.clientFields.status}</span>
                <CustomSelect
                  value={clientForm.status}
                  onChange={(value) => setClientForm((current) => ({ ...current, status: value }))}
                  options={clientStatusOptions}
                  className="dashboard-form-select"
                  ariaLabel={copy.dashboard.clientFields.status}
                  light
                />
              </label>
              <label>
                <span>{language === 'pt' ? 'Moeda' : language === 'es' ? 'Moneda' : 'Currency'}</span>
                <CustomSelect value={clientForm.currency} onChange={value => setClientForm(current => ({ ...current, currency: value }))} options={CURRENCIES.map(value => ({ value, label: value }))} className="dashboard-form-select" ariaLabel={language === 'pt' ? 'Moeda' : language === 'es' ? 'Moneda' : 'Currency'} light />
              </label>
              <label>
                <span>{copy.dashboard.clientFields.budgetMin}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={clientForm.budgetMin}
                  onChange={(event) => setClientForm((current) => ({ ...current, budgetMin: event.target.value }))}
                />
              </label>
              <label>
                <span>{copy.dashboard.clientFields.budgetMax}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={clientForm.budgetMax}
                  onChange={(event) => setClientForm((current) => ({ ...current, budgetMax: event.target.value }))}
                />
              </label>
              <label>
                <span>{copy.dashboard.clientFields.minRooms}</span>
                <input
                  type="number"
                  value={clientForm.minRooms}
                  onChange={(event) => setClientForm((current) => ({ ...current, minRooms: event.target.value }))}
                />
              </label>
              <label>
                <span>{opportunityCopy[language].bathrooms}</span>
                <input type="number" min="0" step="1" value={clientForm.minBathrooms} onChange={event => setClientForm(current => ({ ...current, minBathrooms: event.target.value }))} />
              </label>
              <label>
                <span>{copy.dashboard.clientFields.minSurface}</span>
                <input
                  type="number"
                  value={clientForm.minSurface}
                  onChange={(event) => setClientForm((current) => ({ ...current, minSurface: event.target.value }))}
                />
              </label>
              <div className="dashboard-property-form-full">
                <p>{opportunityCopy[language].extras}</p>
                <p>{opportunityCopy[language].hint}</p>
                <TogglePillGroup value={clientForm.requiredExtras} options={Object.entries(copy.catalog.extras).map(([value, label]) => ({ value, label }))} onChange={value => setClientForm(current => ({ ...current, requiredExtras: value }))} ariaLabel={opportunityCopy[language].extras} />
              </div>
              <label className="dashboard-property-form-full">
                <span>{copy.dashboard.clientFields.destinations}</span>
                <TogglePillGroup
                  value={clientForm.destinations}
                  options={destinationOptions}
                  onChange={(value) => setClientForm((current) => ({ ...current, destinations: value }))}
                  ariaLabel={copy.dashboard.clientFields.destinations}
                />
              </label>
              <label className="dashboard-property-form-full">
                <span>{copy.dashboard.clientFields.types}</span>
                <TogglePillGroup
                  value={normalizeTypes(clientForm.types)}
                  options={normalizeTypes(PROPERTY_TYPE_OPTIONS).map((value) => ({ value, label: copy.catalog.types[value] }))}
                  onChange={(value) => setClientForm((current) => ({ ...current, types: value }))}
                  ariaLabel={copy.dashboard.clientFields.types}
                />
              </label>
              <label className="dashboard-property-form-full">
                <span>{copy.dashboard.clientFields.notes}</span>
                <textarea
                  value={clientForm.notes}
                  onChange={(event) => setClientForm((current) => ({ ...current, notes: event.target.value }))}
                />
              </label>
              <div className="dashboard-editor-actions dashboard-property-form-full">
                {clientEditor.mode === 'edit' && <button type="button" className="dashboard-editor-secondary" disabled={clientSaving} onClick={handleDeleteClient}>{copy.dashboard.deleteClient}</button>}
                <button type="submit" className="dashboard-property-submit" disabled={clientSaving}>
                  {clientSaving ? copy.dashboard.saving : clientEditor.mode === 'edit' ? copy.dashboard.updateClient : copy.dashboard.addClient}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}


      {['catalogo', 'off-market'].includes(route.view) ? (
        <main className="catalog-page">
          <section className="catalog-band">
            <p>{route.view === 'off-market' ? 'Off-market' : getOperationLabel(catalogFilters.operation, language)}</p>
          </section>

          <section className="catalog-toolbar">
            <form
              className="catalog-search-form"
              onSubmit={(event) => {
                event.preventDefault()
                if (route.view === 'off-market') syncRoute({ ...route, ...catalogFilters })
                else goCatalog(catalogFilters.operation, catalogFilters.destination, catalogFilters.reference, true)
              }}
            >
              <label className="catalog-search-field">
                <span>{copy.catalog.filters.search}</span>
                <input
                  type="text"
                  placeholder={copy.catalog.searchPlaceholder}
                  value={catalogFilters.reference}
                  onChange={(event) =>
                    setCatalogFilters((current) => ({ ...current, reference: event.target.value }))
                  }
                />
              </label>
              <label className="catalog-inline-select">
                <span>{copy.catalog.filters.destination}</span>
                <CustomSelect
                  value={catalogFilters.destination}
                  onChange={(value) => setCatalogFilters((current) => ({ ...current, destination: value }))}
                  options={[{ value: 'todos', label: copy.catalog.all }, ...destinationOptions]}
                  className="catalog-custom-select"
                  ariaLabel={copy.catalog.filters.destination}
                />
              </label>
              <button type="submit" className="catalog-search-button">
                {copy.catalog.filters.search}
              </button>
              <button type="button" className="catalog-filter-toggle" aria-expanded={filtersOpen} aria-controls="catalog-advanced-filters" onClick={() => setFiltersOpen(open => !open)}>
                {language === 'en' ? 'Filters' : 'Filtros'} <span aria-hidden="true">{filtersOpen ? '−' : '+'}</span>
              </button>
            </form>

            <div id="catalog-advanced-filters" className="catalog-filter-strip" hidden={!filtersOpen}>
              {route.view === 'off-market' && <label><span>{copy.dashboard.propertyFields.operation}</span><CustomSelect value={catalogFilters.operation} onChange={value => setCatalogFilters(current => ({ ...current, operation: value }))} options={[{value:'all',label:copy.catalog.all},{value:'comprar',label:copy.nav.buy},{value:'alquilar',label:copy.nav.rent}]} className="catalog-custom-select" ariaLabel={copy.dashboard.propertyFields.operation} /></label>}
              <label>
                <span>{copy.catalog.filters.type}</span>
                <CustomMultiSelect
                  value={catalogFilters.type}
                  onChange={(value) => setCatalogFilters((current) => ({ ...current, type: value }))}
                  options={catalogTypeOptions}
                  placeholderLabel={copy.catalog.all}
                  className="catalog-custom-select"
                  ariaLabel={copy.catalog.filters.type}
                />
              </label>
              <label>
                <span>{language === 'pt' ? 'Moeda do filtro' : language === 'es' ? 'Moneda del filtro' : 'Filter currency'}</span>
                <CustomSelect value={catalogFilters.priceCurrency || 'EUR'} onChange={value => setCatalogFilters(current => ({ ...current, priceCurrency: value }))} options={CURRENCIES.map(value => ({ value, label: value }))} className="catalog-custom-select" ariaLabel={language === 'pt' ? 'Moeda do filtro' : language === 'es' ? 'Moneda del filtro' : 'Filter currency'} />
              </label>
              <label>
                <span>{copy.catalog.filters.price}</span>
                <PriceRangeSelect
                  minValue={catalogFilters.priceMin}
                  maxValue={catalogFilters.priceMax}
                  onMinChange={(value) => setCatalogFilters((current) => ({ ...current, priceMin: value }))}
                  onMaxChange={(value) => setCatalogFilters((current) => ({ ...current, priceMax: value }))}
                  triggerLabel={priceTriggerLabel}
                  minPlaceholder={`Min ${catalogFilters.priceCurrency || 'EUR'}`}
                  maxPlaceholder={`Max ${catalogFilters.priceCurrency || 'EUR'}`}
                  clearLabel={copy.catalog.all}
                  className="catalog-custom-select"
                  menuClassName="catalog-price-menu"
                  ariaLabel={copy.catalog.filters.price}
                />
              </label>
              <label>
                <span>{copy.catalog.filters.surface}</span>
                <CustomSelect
                  value={catalogFilters.surface}
                  onChange={(value) => setCatalogFilters((current) => ({ ...current, surface: value }))}
                  options={[
                    { value: 'all', label: copy.catalog.allFeminine },
                    { value: 's', label: copy.catalog.surfaces.s },
                    { value: 'm', label: copy.catalog.surfaces.m },
                    { value: 'l', label: copy.catalog.surfaces.l },
                  ]}
                  className="catalog-custom-select"
                  ariaLabel={copy.catalog.filters.surface}
                />
              </label>
              <label>
                <span>{copy.catalog.filters.rooms}</span>
                <CustomSelect
                  value={catalogFilters.rooms}
                  onChange={(value) => setCatalogFilters((current) => ({ ...current, rooms: value }))}
                  options={[
                    { value: 'all', label: copy.catalog.allFeminine },
                    { value: '1', label: '1+' },
                    { value: '2', label: '2+' },
                    { value: '3', label: '3+' },
                    { value: '4', label: '4+' },
                  ]}
                  className="catalog-custom-select"
                  ariaLabel={copy.catalog.filters.rooms}
                />
              </label>
              <label>
                <span>{copy.catalog.filters.bathrooms}</span>
                <CustomSelect
                  value={catalogFilters.bathrooms}
                  onChange={(value) => setCatalogFilters((current) => ({ ...current, bathrooms: value }))}
                  options={[
                    { value: 'all', label: copy.catalog.all },
                    { value: '1', label: '1+' },
                    { value: '2', label: '2+' },
                    { value: '3', label: '3+' },
                    { value: '4', label: '4+' },
                  ]}
                  className="catalog-custom-select"
                  ariaLabel={copy.catalog.filters.bathrooms}
                />
              </label>
              <label>
                <span>{copy.catalog.filters.extras}</span>
                <CustomMultiSelect
                  value={catalogFilters.extras}
                  onChange={(value) => setCatalogFilters((current) => ({ ...current, extras: value }))}
                  options={Object.entries(copy.catalog.extras).map(([value, label]) => ({ value, label }))}
                  placeholderLabel={copy.catalog.all}
                  className="catalog-custom-select"
                  ariaLabel={copy.catalog.filters.extras}
                />
              </label>
              <label>
                <span>{copy.catalog.filters.order}</span>
                <CustomSelect
                  value={catalogFilters.order}
                  onChange={(value) => setCatalogFilters((current) => ({ ...current, order: value }))}
                  options={[
                    { value: 'featured', label: copy.catalog.orderOptions.featured },
                    { value: 'price-asc', label: copy.catalog.orderOptions.priceAsc },
                    { value: 'price-desc', label: copy.catalog.orderOptions.priceDesc },
                    { value: 'surface-desc', label: copy.catalog.orderOptions.surfaceDesc },
                  ]}
                  className="catalog-custom-select"
                  ariaLabel={copy.catalog.filters.order}
                />
              </label>
            </div>
          </section>

          <section className="catalog-results">
            <div className="catalog-results-head">
              <div>
                <p className="section-label">{copy.catalog.selection}</p>
                <h1 className="section-title">
                  {route.view === 'off-market' ? 'Off-market' : getOperationLabel(catalogFilters.operation, language)}{' '}
                  {catalogFilters.destination === 'todos'
                    ? copy.catalog.inMainDestinations
                    : `en ${getDestinationMeta(catalogFilters.destination, language).name}`}
                  .
                </h1>
              </div>
              <p className="catalog-results-count">
                {filteredCatalog.length} {copy.catalog.exampleProperties}
              </p>
            </div>

            <div className="listing-grid">
              {filteredCatalog.map((property) => {
                const text = getPropertyText(property, language)

                return (
                  <article key={property.id} className="listing-card" onClick={() => property.offMarket ? setOffMarketSelection(property) : goProperty(property)}>
                    <div
                      className={`listing-media${property.offMarket ? '' : ' property-watermark'}`}
                      style={{
                        backgroundImage: `linear-gradient(rgba(20, 16, 14, 0.08), rgba(20, 16, 14, 0.18)), url(${property.image})`,
                      }}
                    >
                      <div className="listing-chips">{listingLabels(property, language).map(label => <span className="listing-chip" key={label}>{label}</span>)}</div>
                    </div>
                    <div className="listing-body">
                      <p className="listing-reference">{property.reference}</p>
                      <h2>{text.title}</h2>
                      <p className="listing-location">{text.location}</p>
                      <p className="listing-price-line">
                        {property.priceLabel ? <strong>{property.priceLabel}</strong> : null}
                        <span>{property.surface} m²</span>
                        <span>{property.rooms} hab.</span>
                        {property.bathrooms ? (
                          <span>{property.bathrooms} {copy.property.facts.bathrooms.toLowerCase()}</span>
                        ) : null}
                      </p>
                      <p className="listing-extras">
                        {property.extras.map((extra) => copy.catalog.extras[extra]).join(' · ')}
                      </p>
                      <button
                        type="button"
                        className="listing-link"
                        onClick={(event) => {
                          event.stopPropagation()
                          if (property.offMarket) setOffMarketSelection(property)
                          else goProperty(property)
                        }}
                      >
                        {property.offMarket ? (language === 'pt' ? 'Solicitar informações' : language === 'es' ? 'Solicitar información' : 'Request information') : copy.catalog.viewListing}
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
            {!publicLoading && !filteredCatalog.length && <p>{language === 'pt' ? 'Nenhum imóvel encontrado com estes critérios.' : language === 'es' ? 'No se han encontrado inmuebles con estos criterios.' : 'No properties match these criteria.'}</p>}
            {offMarketSelection && <OffMarket key={offMarketSelection.id} property={offMarketSelection} language={language} onSubmit={saveOwnerLead} onClose={() => setOffMarketSelection(null)} />}
          </section>
        </main>
      ) : null}

      {route.view === 'captacion' ? (
        <main className="owner-page">
          <section className="owner-page-shell">
            <div className="owner-page-copy">
              <button type="button" className="owner-back-link" onClick={goHome}>
                {copy.ownerForm.back}
              </button>
              <p className="section-label">{copy.ownerForm.label}</p>
              <h1>{copy.ownerForm.title}</h1>
              <p className="owner-page-lead">{copy.ownerForm.copyLead}</p>
              <p className="owner-page-detail">{copy.ownerForm.copyDetail}</p>
            </div>

            <div className="owner-form-card">
              <p className="owner-form-title">{copy.ownerForm.panelTitle}</p>
              {ownerSuccess ? (
                <div className="owner-form-success">
                  <p>{copy.ownerForm.success}</p>
                </div>
              ) : null}

              <form className="owner-form-grid" onSubmit={handleLeadSubmit} autoComplete="on">
                <label>
                  <span>{copy.ownerForm.fields.name}</span>
                  <input
                    type="text"
                    name="given-name"
                    autoComplete="given-name"
                    value={ownerForm.name}
                    onChange={(event) => setOwnerForm((current) => ({ ...current, name: event.target.value }))}
                    required
                  />
                </label>
                <label>
                  <span>{copy.ownerForm.fields.surname}</span>
                  <input
                    type="text"
                    name="family-name"
                    autoComplete="family-name"
                    value={ownerForm.surname}
                    onChange={(event) => setOwnerForm((current) => ({ ...current, surname: event.target.value }))}
                    required
                  />
                </label>
                <label>
                  <span>{copy.ownerForm.fields.phone}</span>
                  <input
                    type="tel"
                    name="tel"
                    autoComplete="tel"
                    inputMode="tel"
                    value={ownerForm.phone}
                    onChange={(event) => setOwnerForm((current) => ({ ...current, phone: event.target.value }))}
                    required
                  />
                </label>
                <label>
                  <span>{copy.ownerForm.fields.email}</span>
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    inputMode="email"
                    value={ownerForm.email}
                    onChange={(event) => setOwnerForm((current) => ({ ...current, email: event.target.value }))}
                    required
                  />
                </label>
                <label>
                  <span>{copy.ownerForm.fields.address}</span>
                  <input
                    type="text"
                    name="street-address"
                    autoComplete="street-address"
                    value={ownerForm.address}
                    onChange={(event) => setOwnerForm((current) => ({ ...current, address: event.target.value }))}
                  />
                </label>
                <label>
                  <span>{copy.ownerForm.fields.city}</span>
                  <input
                    type="text"
                    name="address-level2"
                    autoComplete="address-level2"
                    value={ownerForm.city}
                    onChange={(event) => setOwnerForm((current) => ({ ...current, city: event.target.value }))}
                    required
                  />
                </label>
                <label>
                  <span>{copy.ownerForm.fields.operation}</span>
                  <CustomSelect
                    value={ownerForm.operation}
                    onChange={(value) => setOwnerForm((current) => ({ ...current, operation: value }))}
                    options={[
                      { value: 'alquilar', label: copy.ownerForm.operations.alquilar },
                      { value: 'vender', label: copy.ownerForm.operations.vender },
                    ]}
                    className="owner-custom-select"
                    ariaLabel={copy.ownerForm.fields.operation}
                    light
                  />
                </label>
                <label>
                  <span>{copy.ownerForm.fields.source}</span>
                  <CustomSelect
                    value={ownerForm.source}
                    onChange={(value) => setOwnerForm((current) => ({ ...current, source: value }))}
                    options={Object.entries(copy.ownerForm.sources).map(([value, label]) => ({ value, label }))}
                    className="owner-custom-select"
                    ariaLabel={copy.ownerForm.fields.source}
                    light
                  />
                </label>
                <label className="owner-form-comments owner-form-full">
                  <span>{copy.ownerForm.fields.comments}</span>
                  <textarea
                    name="comments"
                    autoComplete="on"
                    value={ownerForm.comments}
                    onChange={(event) => setOwnerForm((current) => ({ ...current, comments: event.target.value }))}
                  />
                </label>
                <label className="owner-form-check owner-form-full">
                  <input
                    type="checkbox"
                    name="legalAccepted"
                    checked={ownerForm.legalAccepted}
                    onChange={(event) =>
                      setOwnerForm((current) => ({ ...current, legalAccepted: event.target.checked }))
                    }
                    required
                  />
                  <PrivacyConsent language={language} text={copy.ownerForm.legal} />
                </label>
                <label className="owner-form-check owner-form-full">
                  <input
                    type="checkbox"
                    name="newsletterAccepted"
                    checked={ownerForm.newsletterAccepted}
                    onChange={(event) =>
                      setOwnerForm((current) => ({ ...current, newsletterAccepted: event.target.checked }))
                    }
                  />
                  <span>{copy.ownerForm.newsletter}</span>
                </label>
                <button type="submit" className="owner-form-submit owner-form-full">
                  {copy.ownerForm.submit}
                </button>
              </form>
            </div>
          </section>
        </main>
      ) : null}

      {route.view === 'anuncio' && selectedProperty && selectedPropertyText ? (
        <main className="property-page">
          <section className="property-hero">
            <div
              className="property-hero-media property-watermark"
              style={{
                backgroundImage: `linear-gradient(rgba(18, 14, 12, 0.12), rgba(18, 14, 12, 0.26)), url(${selectedProperty.image})`,
              }}
            />
            <div className="property-hero-shell">
              <div className="property-breadcrumbs">
                <button type="button" onClick={() => goCatalog(selectedProperty.operation, selectedProperty.destination)}>
                  {getOperationLabel(selectedProperty.operation, language)}
                </button>
                <span>/</span>
                <span>{getDestinationMeta(selectedProperty.destination, language).name}</span>
              </div>

              <div className="property-hero-grid">
                <div className="property-hero-copy">
                  <p className="section-label">Referencia {selectedProperty.reference}</p>
                  <h1>{selectedPropertyText.title}</h1>
                  <p className="property-summary">{selectedPropertyText.summary}</p>
                </div>
                <aside className="property-facts-card">
                  <p className="property-note">{getOperationLabel(selectedProperty.operation, language)}</p>
                  {selectedProperty.priceLabel ? <p className="property-price">{selectedProperty.priceLabel}</p> : null}
                  <p className="property-location">{selectedPropertyText.location}</p>
                  <div className="property-facts-grid">
                    <div>
                      <span>{copy.property.facts.type}</span>
                      <strong>{getTypeLabel(selectedProperty.type, language)}</strong>
                    </div>
                    <div>
                      <span>{copy.property.facts.surface}</span>
                      <strong>{selectedProperty.surface} m²</strong>
                    </div>
                    <div>
                      <span>{copy.property.facts.rooms}</span>
                      <strong>{selectedProperty.rooms}</strong>
                    </div>
                    {selectedProperty.bathrooms ? (
                      <div>
                        <span>{copy.property.facts.bathrooms}</span>
                        <strong>{selectedProperty.bathrooms}</strong>
                      </div>
                    ) : null}
                    <div>
                      <span>{copy.property.facts.extras}</span>
                      <strong>{selectedProperty.extras.map((extra) => copy.catalog.extras[extra]).join(' · ')}</strong>
                    </div>
                  </div>
                  <a className="solid-button property-cta" href="#contacto">
                    {copy.property.contact}
                  </a>
                </aside>
              </div>
            </div>
          </section>

          <section className="property-gallery">
            {selectedProperty.gallery.map((image, index) => (
              <div key={`${selectedProperty.id}-${index}`} className={`property-watermark property-gallery-item property-gallery-item-${index + 1}`}>
              <img
                src={image}
                alt={selectedPropertyText.title}
                loading={index === 0 ? 'eager' : 'lazy'}
                decoding="async"
              />
              </div>
            ))}
          </section>

          <section className="property-editorial">
            <div className="property-editorial-intro">
              <h2>{copy.property.selection}</h2>
              <p className="section-label">{copy.property.detailsTitle}</p>
            </div>
            <div className="property-details-sheet">
              <PropertyDetailGroup
                title={copy.property.detailsGroups.overview}
                items={[
                  { label: copy.property.detailLabels.operation, value: getOperationLabel(selectedProperty.operation, language) },
                  { label: copy.property.detailLabels.reference, value: selectedProperty.reference },
                  { label: copy.property.detailLabels.price, value: selectedProperty.priceLabel },
                  { label: copy.property.detailLabels.type, value: getTypeLabel(selectedProperty.type, language) },
                  { label: copy.property.detailLabels.province, value: selectedProperty.portalData?.province },
                  { label: copy.property.detailLabels.municipality, value: selectedProperty.portalData?.municipality },
                  { label: copy.property.detailLabels.neighborhood, value: selectedProperty.portalData?.neighborhood },
                  { label: copy.property.detailLabels.condition, value: selectedProperty.portalData?.condition },
                ]}
              />
              <PropertyDetailGroup
                title={copy.property.detailsGroups.distribution}
                items={[
                  { label: copy.property.detailLabels.rooms, value: selectedProperty.rooms },
                  { label: copy.property.detailLabels.bathrooms, value: selectedProperty.bathrooms },
                  { label: copy.property.detailLabels.floor, value: selectedProperty.portalData?.floor },
                  { label: copy.property.detailLabels.numberOfFloors, value: selectedProperty.portalData?.numberOfFloors },
                  { label: copy.property.detailLabels.orientation, value: selectedProperty.portalData?.orientation },
                  { label: copy.property.detailLabels.buildingYear, value: selectedProperty.portalData?.buildingYear },
                ]}
              />
              <PropertyDetailGroup
                title={copy.property.detailsGroups.areas}
                items={[
                  { label: copy.property.detailLabels.usefulSurface, value: `${selectedProperty.portalData?.usefulSurface || selectedProperty.surface} m²` },
                  { label: copy.property.detailLabels.builtSurface, value: selectedProperty.portalData?.builtSurface ? `${selectedProperty.portalData.builtSurface} m²` : '' },
                ]}
              />
              <PropertyDetailGroup
                title={copy.property.detailsGroups.surroundings}
                items={PORTAL_ENVIRONMENT_FIELDS.map((field) => ({
                  label: copy.property.detailLabels[field],
                  value: Boolean(selectedProperty.portalData?.[field]),
                }))}
              />
              <PropertyDetailGroup
                title={copy.property.detailsGroups.features}
                items={[
                  { label: copy.property.detailLabels.extras, value: selectedProperty.extras.map((extra) => copy.catalog.extras[extra]).join(' · ') },
                ]}
              />
            </div>
          </section>

          <section className="property-inquiry" id="contacto">
            <div className="property-inquiry-copy">
              <p className="section-label">{copy.property.inquiryLabel}</p>
              <h2>{copy.property.inquiryTitle}</h2>
              <p>{copy.property.inquiryCopy}</p>
              <div className="property-inquiry-reference">
                <span>{selectedProperty.reference}</span>
                <strong>{selectedPropertyText.title}</strong>
              </div>
            </div>

            <div className="owner-form-card property-inquiry-card">
              {propertyInquirySuccess ? (
                <div className="owner-form-success" role="status">
                  <p>{copy.property.inquirySuccess}</p>
                </div>
              ) : null}
              <form className="owner-form-grid" onSubmit={handlePropertyInquirySubmit} autoComplete="on">
                <label>
                  <span>{copy.ownerForm.fields.name}</span>
                  <input type="text" autoComplete="given-name" value={propertyInquiry.name} onChange={(event) => setPropertyInquiry((current) => ({ ...current, name: event.target.value }))} required />
                </label>
                <label>
                  <span>{copy.ownerForm.fields.surname}</span>
                  <input type="text" autoComplete="family-name" value={propertyInquiry.surname} onChange={(event) => setPropertyInquiry((current) => ({ ...current, surname: event.target.value }))} required />
                </label>
                <label>
                  <span>{copy.ownerForm.fields.phone}</span>
                  <input type="tel" autoComplete="tel" inputMode="tel" value={propertyInquiry.phone} onChange={(event) => setPropertyInquiry((current) => ({ ...current, phone: event.target.value }))} required />
                </label>
                <label>
                  <span>{copy.ownerForm.fields.email}</span>
                  <input type="email" autoComplete="email" inputMode="email" value={propertyInquiry.email} onChange={(event) => setPropertyInquiry((current) => ({ ...current, email: event.target.value }))} required />
                </label>
                <label className="owner-form-comments owner-form-full">
                  <span>{copy.property.inquiryMessage}</span>
                  <textarea value={propertyInquiry.message} onChange={(event) => setPropertyInquiry((current) => ({ ...current, message: event.target.value }))} />
                </label>
                <label className="owner-form-check owner-form-full">
                  <input type="checkbox" checked={propertyInquiry.legalAccepted} onChange={(event) => setPropertyInquiry((current) => ({ ...current, legalAccepted: event.target.checked }))} required />
                  <PrivacyConsent language={language} text={copy.ownerForm.legal} />
                </label>
                <button type="submit" className="owner-form-submit owner-form-full">{copy.property.inquirySubmit}</button>
              </form>
            </div>
          </section>

          <section className="related-properties">
            <div className="catalog-results-head">
              <div>
                <p className="section-label">{copy.property.related}</p>
                <h2>{copy.property.relatedTitle}</h2>
              </div>
            </div>
            <div className="listing-grid">
              {relatedProperties.map((property) => {
                const text = getPropertyText(property, language)
                return (
                  <article key={property.id} className="listing-card" onClick={() => goProperty(property)}>
                    <div
                      className={`listing-media${property.offMarket ? '' : ' property-watermark'}`}
                      style={{
                        backgroundImage: `linear-gradient(rgba(20, 16, 14, 0.08), rgba(20, 16, 14, 0.18)), url(${property.image})`,
                      }}
                    >
                      <div className="listing-chips">{listingLabels(property, language).map(label => <span className="listing-chip" key={label}>{label}</span>)}</div>
                    </div>
                    <div className="listing-body">
                      <p className="listing-reference">{property.reference}</p>
                      <h2>{text.title}</h2>
                      <p className="listing-location">{text.location}</p>
                      <p className="listing-price-line">
                        {property.priceLabel ? <strong>{property.priceLabel}</strong> : null}
                        <span>{property.surface} m²</span>
                        <span>{property.rooms} hab.</span>
                        {property.bathrooms ? (
                          <span>{property.bathrooms} {copy.property.facts.bathrooms.toLowerCase()}</span>
                        ) : null}
                      </p>
                      <button
                        type="button"
                        className="listing-link"
                        onClick={(event) => {
                          event.stopPropagation()
                          goProperty(property)
                        }}
                      >
                        {copy.catalog.viewListing}
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        </main>
      ) : null}

      {route.view === 'contact' && <ContactPage language={language} onSubmit={saveOwnerLead} />}
      {route.view === 'about' && <AboutPage language={language} />}
      {['legal', 'privacy', 'cookies'].includes(route.view) && <LegalPage page={route.view} language={language} />}

      {route.view === 'home' ? (
        <main id="inicio">
          <div className="home-first-screen">
          <section
            className="hero-section"
            style={{ '--hero-image': 'url(/media/kohaus-hero-poster.jpg)' }}
          >
            <HeroVideo language={language} />
            <div className="hero-overlay">
              <div className="hero-heading"><h1>{copy.home.title}</h1>
              </div>
            </div>
          </section>
          <div className="hero-search-band">
              <form
                className="search-panel"
                onSubmit={(event) => {
                  event.preventDefault()
                  setCatalogFilters((current) => ({
                    ...current,
                    operation: homeSearch.operation,
                    destination: homeSearch.destination,
                    reference: homeSearch.reference,
                  }))
                  goCatalog(homeSearch.operation, homeSearch.destination, homeSearch.reference)
                }}
              >
                <label>
                  <span>{copy.home.operation}</span>
                  <CustomSelect
                    value={homeSearch.operation}
                    onChange={(value) => setHomeSearch((current) => ({ ...current, operation: value }))}
                    options={[
                      { value: 'comprar', label: copy.nav.buy },
                      { value: 'alquilar', label: copy.nav.rent },
                    ]}
                    className="hero-custom-select"
                    ariaLabel={copy.home.operation}
                    light
                  />
                </label>
                <label>
                  <span>{copy.home.destination}</span>
                  <CustomSelect
                    value={homeSearch.destination}
                    onChange={(value) => setHomeSearch((current) => ({ ...current, destination: value }))}
                    options={[{value:'todos',label:copy.catalog.all},...destinationOptions]}
                    className="hero-custom-select"
                    ariaLabel={copy.home.destination}
                    light
                  />
                </label>
                <label>
                  <span>{copy.home.reference}</span>
                  <input
                    type="text"
                    placeholder={copy.home.referencePlaceholder}
                    value={homeSearch.reference}
                    onChange={(event) => setHomeSearch((current) => ({ ...current, reference: event.target.value }))}
                  />
                </label>
                <button type="submit">{copy.home.search}</button>
              </form>
          </div>

          </div>
          <section className="featured-section" id="comprar">
            <div className="featured-heading">
              <p className="section-label">{copy.home.featuredLabel}</p>
              <h2>{copy.home.featuredTitle}</h2>
            </div>
            <div className="featured-properties-grid">
              {featuredProperties.map((property) => {
                const text = getPropertyText(property, language)
                const propertyMeta = [
                  property.priceLabel,
                  getDestinationMeta(property.destination, language).name,
                  property.surface ? `${property.surface} m²` : '',
                ].filter(Boolean).join(' · ')

                return (
                  <article
                    key={property.id}
                    className="featured-property-card"
                    onClick={() => goProperty(property)}
                  >
                    <div className="featured-property-copy">
                      <h3>{text.title}</h3>
                      <p>{propertyMeta}</p>
                    </div>
                    <div
                      className={`featured-property-image${property.offMarket ? '' : ' property-watermark'}`}
                      style={{
                        backgroundImage: `linear-gradient(rgba(24, 20, 17, 0.08), rgba(24, 20, 17, 0.18)), url(${property.image})`,
                      }}
                    />
                  </article>
                )
              })}
            </div>

          </section>

          <section className="services-section" id="alquilar">
            <div className="editorial-band">
              <div className="editorial-band-top">
                <p className="section-label">{copy.home.ownerLabel}</p>
              </div>
              <div className="editorial-band-body">
                <h2>{copy.home.ownerTitle}</h2>
                <p>{copy.home.ownerCopy}</p>
              </div>
              <div className="action-buttons editorial-actions">
                <button type="button" className="outline-button" onClick={() => goOwnerForm('alquilar')}>
                  {copy.home.rentWithUs}
                </button>
                <button type="button" className="solid-button" onClick={() => goOwnerForm('vender')}>
                  {copy.home.sellWithUs}
                </button>
              </div>
            </div>
          </section>

          <section className="destinations-section" id="destinos">
            <div className="locations-ribbon">
              {DESTINATIONS.map((destination) => (
                <a
                  key={destination.slug}
                  className="location-tile"
                  href={`?view=catalogo&op=comprar&dest=${destination.slug}&lang=${language}`}
                  onClick={(event) => {
                    event.preventDefault()
                    setCatalogFilters((current) => ({
                      ...current,
                      operation: 'comprar',
                      destination: destination.slug,
                      reference: '',
                    }))
                    goCatalog('comprar', destination.slug)
                  }}
                >
                  <p className="location-label">{getDestinationMeta(destination.slug, language).name}</p>
                  <div
                    className="location-image"
                    style={{
                      backgroundImage: `linear-gradient(rgba(24, 20, 17, 0.18), rgba(24, 20, 17, 0.3)), url(${destination.image})`,
                    }}
                  />
                </a>
              ))}
            </div>
          </section>

          <section className="about-section" id="nosotros">
            <div className="about-copy">
              <p className="section-label">{copy.home.aboutLabel}</p>
              <h2>{copy.home.aboutTitle}</h2>
              <p>{copy.home.aboutCopy}</p>
              <a className="outline-button" href={`?view=about&lang=${language}`}>
                {copy.home.aboutCta}
              </a>
            </div>
          </section>

        </main>
      ) : null}

      </>}
      <Footer copy={copy} language={language} />
      <CookieConsent language={language} view={passwordSetup ? 'auth' : route.view} />
    </div>
  )
}

/* oxlint-disable react/only-export-components -- database helpers are exported for persistence regression tests */
export {
  publicProperty,
  buildGoogleCalendarLink,
  fetchDashboardProperties,
  fetchPublishedProperties,
  saveDashboardProperty,
  updateDashboardProperty,
}
