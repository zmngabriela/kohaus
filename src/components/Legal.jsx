import { cookieCopy } from '../lib/cookie-copy'
import './Legal.css'

const content = {
  pt: {
    titles: { legal: 'Aviso legal', privacy: 'Privacidade', cookies: 'Cookies e armazenamento' },
    draft: 'Versão preliminar · Site em preparação',
    intro: 'Estes textos serão completados e revisados antes do lançamento. A identificação do responsável, o endereço e o contato de privacidade ainda precisam ser confirmados.',
    legal: [
      ['Sobre este site', 'A KOHAUS apresenta imóveis e permite solicitar informações e visitas. A disponibilidade, os preços e as condições devem ser confirmados com a equipe antes de qualquer decisão.'],
      ['Conteúdos e links', 'As imagens e os textos destinam-se à apresentação dos serviços e imóveis. Os links para redes sociais levam a serviços externos, com suas próprias políticas de privacidade.'],
      ['Antes da publicação', 'Serão incluídos os dados legais do titular e os registros profissionais aplicáveis. Esta versão não substitui a revisão jurídica final.'],
    ],
    privacy: [
      ['Informações que você fornece', 'Os formulários solicitam dados de contato, informações do imóvel ou da busca, comentários e o idioma utilizado. Esses dados são usados para responder ao pedido e organizar o atendimento, as visitas e o acompanhamento no CRM.'],
      ['Preferências e comunicações', 'O idioma do navegador é consultado para apresentar a versão inicial do site. O idioma do formulário acompanha o pedido. A opção de receber novidades é separada do envio de uma solicitação.'],
      ['Serviços utilizados', 'Os registros e as imagens são armazenados no Supabase. O site também carrega a fonte Manrope pelo Google Fonts. Esses serviços recebem os dados técnicos necessários para atender às conexões. Links de calendário, e-mail e redes sociais abrem serviços externos somente quando selecionados.'],
      ['Retenção e seus direitos', 'Antes do lançamento, serão definidos os prazos de conservação, as bases legais, os destinatários e eventuais transferências internacionais, além do canal para exercer os direitos de acesso, retificação, exclusão, oposição, limitação e portabilidade. Você também pode recorrer à autoridade de proteção de dados competente.'],
    ],
    cookies: [],
    details: 'Saiba mais', dismiss: 'Entendi', home: 'Voltar ao início',
  },
  es: {
    titles: { legal: 'Aviso legal', privacy: 'Privacidad', cookies: 'Cookies y almacenamiento' },
    draft: 'Versión preliminar · Sitio en preparación',
    intro: 'Estos textos se completarán y revisarán antes del lanzamiento. La identidad del responsable, su dirección y el contacto de privacidad están pendientes de confirmación.',
    legal: [
      ['Sobre este sitio', 'KOHAUS presenta inmuebles y permite solicitar información y visitas. La disponibilidad, los precios y las condiciones deben confirmarse con el equipo antes de tomar una decisión.'],
      ['Contenidos y enlaces', 'Las imágenes y los textos presentan los servicios e inmuebles. Los enlaces a redes sociales llevan a servicios externos con sus propias políticas de privacidad.'],
      ['Antes de la publicación', 'Se incluirán los datos legales del titular y los registros profesionales aplicables. Esta versión no sustituye la revisión jurídica final.'],
    ],
    privacy: [
      ['Información que facilitas', 'Los formularios solicitan datos de contacto, información del inmueble o de la búsqueda, comentarios y el idioma utilizado. Se usan para responder a tu solicitud y organizar la atención, las visitas y el seguimiento en el CRM.'],
      ['Preferencias y comunicaciones', 'El idioma del navegador se consulta para mostrar la versión inicial del sitio. El idioma del formulario acompaña la solicitud. La opción de recibir novedades es independiente del envío de una solicitud.'],
      ['Servicios utilizados', 'Los registros y las imágenes se almacenan en Supabase. El sitio también carga la fuente Manrope mediante Google Fonts. Estos servicios reciben los datos técnicos necesarios para atender las conexiones. Los enlaces de calendario, correo y redes sociales abren servicios externos solo al seleccionarlos.'],
      ['Conservación y derechos', 'Antes del lanzamiento se concretarán los plazos de conservación, las bases jurídicas, los destinatarios y posibles transferencias internacionales, así como el canal para ejercer los derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad. También puedes acudir a la autoridad de protección de datos competente.'],
    ],
    cookies: [],
    details: 'Más información', dismiss: 'Entendido', home: 'Volver al inicio',
  },
  en: {
    titles: { legal: 'Legal notice', privacy: 'Privacy', cookies: 'Cookies and storage' },
    draft: 'Preliminary version · Site in preparation',
    intro: 'These texts will be completed and reviewed before launch. The controller’s identity, address and privacy contact still need to be confirmed.',
    legal: [
      ['About this site', 'KOHAUS presents properties and lets you request information and viewings. Availability, prices and terms must be confirmed with the team before making a decision.'],
      ['Content and links', 'Images and text present our services and properties. Social links lead to external services with their own privacy policies.'],
      ['Before publication', 'The owner’s legal details and applicable professional registrations will be added. This version does not replace a final legal review.'],
    ],
    privacy: [
      ['Information you provide', 'Forms request contact details, property or search information, comments and the language used. These details are used to respond to your enquiry and manage service, viewings and follow-up in the CRM.'],
      ['Preferences and communications', 'Your browser language determines the initial site language. The form language is saved with the enquiry. Opting into updates is separate from sending an enquiry.'],
      ['Services used', 'Records and images are stored in Supabase. The site also loads the Manrope typeface through Google Fonts. These services receive the technical data needed to serve connections. Calendar, email and social links open external services only when selected.'],
      ['Retention and your rights', 'Before launch we will specify retention periods, legal bases, recipients and any international transfers, as well as a contact for access, rectification, erasure, objection, restriction and portability requests. You may also contact the competent data protection authority.'],
    ],
    cookies: [],
    details: 'Learn more', dismiss: 'Understood', home: 'Back to home',
  },
}

export function LegalPage({ page, language }) {
  const c = content[language] || content.es
  const cookies = cookieCopy[language] || cookieCopy.es
  const sections = page === 'cookies' ? [[cookies.necessary, cookies.necessaryText], [cookies.preferences, cookies.preferencesText], [cookies.analytics, cookies.analyticsText], [cookies.policy, cookies.storage], [cookies.settings, cookies.control]] : page === 'privacy' ? [...c[page], [cookies.analytics, cookies.text + ' ' + cookies.control]] : c[page]
  return <main className="legal-page">
    <a href={`?lang=${language}`}>{c.home}</a>
    <p className="legal-draft">{c.draft}</p>
    <h1>{c.titles[page]}</h1>
    <p>{c.intro}</p>
    {sections.map(([heading, text]) => <section key={heading}><h2>{heading}</h2><p>{text}</p></section>)}
  </main>
}
