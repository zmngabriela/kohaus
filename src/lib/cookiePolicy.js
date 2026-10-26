import { cookieCopy } from './cookie-copy'

const policy = {
 pt: {
  introduction: ['O que são cookies?', 'Cookies são pequenos arquivos guardados no navegador. O site também utiliza armazenamento local, que permite lembrar escolhas e manter funções necessárias. Nesta política, explicamos os dois de forma conjunta.'],
  categories: 'Os três tipos que utilizamos',
  necessary: 'Guardam a sua escolha sobre cookies e permitem manter o acesso ao painel interno depois do login. São necessários para essas funções e permanecem ativos; a sessão do painel só diz respeito aos usuários que entram nele.',
  preferences: 'Com a sua autorização, lembram o idioma escolhido para as próximas visitas. Se recusar, pode continuar usando o site e mudando o idioma normalmente, mas essa escolha não será lembrada entre visitas.',
  analytics: 'Com a sua autorização, o Google Analytics mede as páginas visitadas para ajudar a melhorar o site. A análise não é ativada antes dessa escolha e não é utilizada nas páginas do painel interno. Não usamos cookies de publicidade.',
  choice: ['A escolha é sua', 'No aviso inicial, pode aceitar todas as categorias, recusar as opcionais ou configurar cada uma separadamente. Continuar navegando não conta como autorização. Recusar as opcionais não impede a consulta de imóveis nem o envio de pedidos de informação.'],
  duration: 'O que fica guardado e por quanto tempo',
  records: [
   {title:'Escolha de cookies',description:'A KOHAUS guarda a sua decisão no armazenamento local (kohaus-cookie-consent-v1) por 180 dias. Depois, o site volta a pedir a sua escolha.'},
   {title:'Idioma',description:'A preferência fica no armazenamento local (kohaus-preferred-language) enquanto a autorização correspondente for válida. É removida ao recusar essa categoria ou quando o site detectar que a autorização expirou.'},
   {title:'Análise de visitas',description:'Quando autorizados e com a análise ativa, os cookies _ga e _ga_* do serviço Google Analytics têm duração configurada de até 180 dias. Esses prazos se referem ao navegador, não à conservação dos relatórios do serviço.'},
   {title:'Sessão do painel',description:'As informações de autenticação ficam no navegador para manter o acesso de usuários autorizados e são removidas ao sair ou limpar esse armazenamento. Fechar o navegador não equivale necessariamente a sair da conta.'},
  ],
  control: ['Como alterar ou retirar a autorização', 'Use “Configurar cookies”, no rodapé de qualquer página, para rever as categorias e salvar uma nova escolha. Ao recusar a análise, o site desativa a medição e remove os cookies de análise que consegue acessar. A retirada não altera a validade do tratamento realizado anteriormente com autorização.'],
  browser: ['Controle pelo navegador', 'Também pode apagar ou bloquear cookies e armazenamento nas configurações de privacidade do navegador. Ao apagar esses dados, a sua escolha e o idioma podem ser esquecidos, e pode ser necessário entrar novamente no painel. Bloquear o armazenamento necessário pode afetar essas funções.'],
  contact: 'Dúvidas sobre cookies ou suas preferências?',
 },
 es: {
  introduction: ['¿Qué son las cookies?', 'Las cookies son pequeños archivos que se guardan en el navegador. El sitio también utiliza almacenamiento local para recordar elecciones y mantener funciones necesarias. Esta política explica ambos de forma conjunta.'],
  categories: 'Los tres tipos que utilizamos',
  necessary: 'Guardan su elección de cookies y permiten mantener el acceso al panel interno después de iniciar sesión. Son necesarias para esas funciones y permanecen activas; la sesión del panel solo afecta a quienes acceden a él.',
  preferences: 'Con su autorización, recuerdan el idioma elegido para futuras visitas. Si las rechaza, puede seguir utilizando el sitio y cambiar de idioma normalmente, pero esa elección no se recordará entre visitas.',
  analytics: 'Con su autorización, Google Analytics mide las páginas visitadas para ayudar a mejorar el sitio. El análisis no se activa antes de esa elección ni se utiliza en las páginas del panel interno. No usamos cookies publicitarias.',
  choice: ['Usted decide', 'En el aviso inicial puede aceptar todas las categorías, rechazar las opcionales o configurar cada una por separado. Seguir navegando no cuenta como autorización. Rechazar las opcionales no impide consultar inmuebles ni enviar solicitudes de información.'],
  duration: 'Qué se guarda y durante cuánto tiempo',
  records: [
   {title:'Elección de cookies',description:'KOHAUS guarda su decisión en el almacenamiento local (kohaus-cookie-consent-v1) durante 180 días. Después, el sitio vuelve a solicitar su elección.'},
   {title:'Idioma',description:'La preferencia se guarda en el almacenamiento local (kohaus-preferred-language) mientras la autorización correspondiente sea válida. Se elimina al rechazar esta categoría o cuando el sitio detecta que la autorización ha caducado.'},
   {title:'Análisis de visitas',description:'Cuando se autorizan y el análisis está activo, las cookies _ga y _ga_* del servicio Google Analytics tienen una duración configurada de hasta 180 días. Estos plazos se refieren al navegador, no a la conservación de los informes del servicio.'},
   {title:'Sesión del panel',description:'La información de autenticación se guarda en el navegador para mantener el acceso de usuarios autorizados y se elimina al cerrar la sesión o borrar ese almacenamiento. Cerrar el navegador no equivale necesariamente a cerrar la sesión.'},
  ],
  control: ['Cómo cambiar o retirar la autorización', 'Utilice “Configurar cookies”, en el pie de cualquier página, para revisar las categorías y guardar una nueva elección. Al rechazar el análisis, el sitio desactiva la medición y elimina las cookies de análisis a las que puede acceder. La retirada no afecta a la validez del tratamiento realizado anteriormente con autorización.'],
  browser: ['Control desde el navegador', 'También puede borrar o bloquear cookies y almacenamiento en los ajustes de privacidad del navegador. Al borrar estos datos, pueden olvidarse su elección y el idioma, y puede ser necesario iniciar sesión de nuevo en el panel. Bloquear el almacenamiento necesario puede afectar a estas funciones.'],
  contact: '¿Tiene dudas sobre las cookies o sus preferencias?',
 },
 en: {
  introduction: ['What are cookies?', 'Cookies are small files stored in your browser. This website also uses local storage to remember choices and maintain necessary functions. This policy explains both together.'],
  categories: 'The three types we use',
  necessary: 'Store your cookie choice and keep you signed in to the internal dashboard after login. They are necessary for these functions and remain active; dashboard session storage only concerns users who sign in.',
  preferences: 'With your permission, remember your chosen language for future visits. If you decline, you can still use the website and change its language, but the choice will not be remembered between visits.',
  analytics: 'With your permission, Google Analytics measures page visits to help improve the website. Analytics does not start before that choice and is not used on internal dashboard pages. We do not use advertising cookies.',
  choice: ['You decide', 'The initial notice lets you accept all categories, reject optional categories or configure each separately. Continuing to browse does not count as permission. Rejecting optional categories does not prevent you from viewing properties or submitting enquiries.'],
  duration: 'What is stored and for how long',
  records: [
   {title:'Cookie choice',description:'KOHAUS saves your decision in local storage (kohaus-cookie-consent-v1) for 180 days. The website then asks you to choose again.'},
   {title:'Language',description:'Your preference is kept in local storage (kohaus-preferred-language) while the corresponding permission remains valid. It is removed when you reject this category or when the website detects expired consent.'},
   {title:'Visitor analytics',description:'When authorized and analytics is enabled, the Google Analytics service’s _ga and _ga_* cookies are configured to last up to 180 days. These periods concern browser storage, not retention of the service’s reports.'},
   {title:'Dashboard session',description:'Authentication information is stored in the browser to keep authorized users signed in and is removed on sign-out or when that storage is cleared. Closing the browser does not necessarily sign you out.'},
  ],
  control: ['How to change or withdraw permission', 'Use “Cookie settings” in the footer of any page to review the categories and save a new choice. When you reject analytics, the website disables measurement and removes analytics cookies it can access. Withdrawal does not affect the lawfulness of earlier processing carried out with permission.'],
  browser: ['Browser controls', 'You can also delete or block cookies and storage in your browser’s privacy settings. Clearing this data may remove your choice and language preference and require you to sign in to the dashboard again. Blocking necessary storage may affect these functions.'],
  contact: 'Questions about cookies or your preferences?',
 },
}

export function getCookiePolicy(language) {
 const c = policy[language] || policy.es
 const labels = cookieCopy[language] || cookieCopy.es
 return {
  contact: c.contact,
  sections: [c.introduction, [c.categories, [
   {title:labels.necessary, description:c.necessary},
   {title:labels.preferences, description:c.preferences},
   {title:labels.analytics, description:c.analytics},
  ]], c.choice, [c.duration,c.records], c.control, c.browser],
 }
}
