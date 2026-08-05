import type { ModuleDict } from '../useModuleT'

export interface PublicPagesT {
  switcherAria: string
  landingHeader: {
    skip: string
    nav: { capacidades: string; flujo: string; demo: string }
    status: string
    accesoTengo: string
    cta: string
    ariaNav: string
    ariaAbrir: string
    ariaCerrar: string
    ariaBrand: string
    brandAlt: string
  }
  landingFooter: {
    tagline: string
    ariaNav: string
    navPrivacidad: string
    navSolicitar: string
    navAcceso: string
    status: string
    ariaBrand: string
  }
  hero: {
    eyebrow: string
    title: string
    positioning: string
    lead: string
    ctaDemo: string
    ctaExplorar: string
    disclosure: string
    ariaFacts: string
    facts: { label: string; value: string }[]
  }
  story: {
    title: string
    body: string
    aria: string
    signals: { title: string; copy: string }[]
    resultLabel: string
    resultTitle: string
    resultCopy: string
  }
  capabilities: {
    eyebrow: string
    title: string
    body: string
    stages: { title: string; copy: string }[]
  }
  preview: {
    eyebrow: string
    title: string
    ariaReadings: string
    readings: string[]
    evidenceAria: string
    briefLabel: string
    briefTitle: string
    briefBody: string
    trace: { label: string; value: string }[]
    figcaption: string
    equipmentAria: string
    equipmentTruckTitle: string
    equipmentTruckSub: string
    equipmentScene: string
    equipmentShovelTitle: string
    equipmentShovelSub: string
    equipmentTitle: string
    equipmentBody: string
    equipmentFacts: { label: string; value: string }[]
    mapEyebrow: string
    mapTitle: string
    mapBody: string
    mapNote: string
    mapAria: string
    mapLegendTitle: string
    mapLegendSub: string
    mapFigcaption: string
  }
  disclosure: {
    eyebrow: string
    title: string
    body: string
    items: { title: string; copy: string }[]
    securityTitle: string
    securityPrinciples: string[]
  }
  finalCta: {
    title: string
    body: string
    cta: string
    acceso: string
  }
  requestPage: {
    metaTitle: string
    metaDescription: string
    eyebrow: string
    title: string
    body: string
    facts: { label: string; value: string }[]
    stepLabel: string
    formTitle: string
    formHint: string
  }
  requestForm: {
    countries: string[]
    summaryError: string
    summaryFields: string
    contactLegend: string
    contactHint: string
    firstName: string
    lastName: string
    email: string
    phone: string
    optional: string
    professionalLegend: string
    professionalHint: string
    company: string
    role: string
    country: string
    selectCountry: string
    operationType: string
    operationOptions: string[]
    fleetSize: string
    fleetOptions: string[]
    interestsLegend: string
    interestsHint: string
    additionalLegend: string
    message: string
    messageHelp: string
    honeypot: string
    consentBefore: string
    consentAfter: string
    consentLink: string
    privacyLink: string
    submitHint: string
    submitLabel: string
    submitting: string
    liveSubmitting: string
    errFirstName: string
    errLastName: string
    errEmail: string
    errCompany: string
    errRole: string
    errCountry: string
    errInterests: string
    errConsent: string
    errMessageLen: string
    errPhoneLen: string
    errGeneric: string
    errApi429: string
    errApi422: string
    errApi503: string
    errApi500: string
  }
  success: {
    metaTitle: string
    metaDescription: string
    eyebrow: string
    title: string
    body: string
    reference: string
    back: string
    acceso: string
  }
  privacy: {
    metaTitle: string
    metaDescription: string
    eyebrow: string
    title: string
    version: string
    ariaIndex: string
    index: string[]
    sections: { heading: string; body: string }[]
  }
  login: {
    back: string
    disclosure: string
  }
  meta: {
    home: { title: string; description: string }
    access: { title: string; description: string }
  }
}

export const publicPagesT: ModuleDict<PublicPagesT> = {
  es: {
    switcherAria: 'Cambiar idioma',
    landingHeader: {
      skip: 'Saltar al contenido',
      nav: { capacidades: 'Capacidades', flujo: 'Cómo funciona', demo: 'Demo' },
      status: 'Demo público',
      accesoTengo: 'Ya tengo acceso',
      cta: 'Solicitar acceso',
      ariaNav: 'Navegación principal',
      ariaAbrir: 'Abrir navegación',
      ariaCerrar: 'Cerrar navegación',
      ariaBrand: 'NORTHMINE Intelligence, inicio',
      brandAlt: 'NORTHMINE Intelligence Hub',
    },
    landingFooter: {
      tagline: 'Control y decisión operacional para minería a cielo abierto.',
      ariaNav: 'Enlaces del pie',
      navPrivacidad: 'Privacidad',
      navSolicitar: 'Solicitar acceso',
      navAcceso: 'Acceso al demo',
      status: 'Demo con datos sintéticos',
      ariaBrand: 'NORTHMINE Intelligence, inicio',
    },
    hero: {
      eyebrow: 'Estratos de decisión',
      title: 'NORTHMINE Intelligence',
      positioning: 'Control operacional para minería a cielo abierto.',
      lead: 'Reúne producción, flota, carguío y riesgo para convertir la brecha del turno en una acción explicable y trazable.',
      ctaDemo: 'Solicitar acceso al demo',
      ctaExplorar: 'Explorar capacidades',
      disclosure: 'Imagen y datos sintéticos. Acceso revisado manualmente.',
      ariaFacts: 'Alcance del demo',
      facts: [
        { label: 'Datos del entorno', value: 'Sintéticos y representativos' },
        { label: 'Flujo', value: 'Estado, brecha, causa y acción' },
        { label: 'Acceso', value: 'Revisión y habilitación manual' },
      ],
    },
    story: {
      title: 'La información existe. La decisión sigue fragmentada.',
      body: 'Cuando producción, flota y mantenimiento no comparten contexto, la brecha se detecta tarde y es difícil vincular una acción con su resultado.',
      aria: 'Fuentes operacionales consolidadas',
      signals: [
        { title: 'Producción', copy: 'Meta, avance y proyección en fuentes separadas.' },
        { title: 'Despacho', copy: 'Ciclos y asignaciones sin una lectura común del turno.' },
        { title: 'Mantenimiento', copy: 'Disponibilidad sin contexto sobre el impacto operacional.' },
        { title: 'Riesgo', copy: 'Alertas que llegan tarde a la decisión.' },
      ],
      resultLabel: 'Lectura común',
      resultTitle: 'Estado, brecha, ritmo y acción',
      resultCopy: 'Una decisión sustentada por evidencia operacional y trazabilidad.',
    },
    capabilities: {
      eyebrow: 'Capacidades',
      title: 'Del estado operacional a una acción verificable.',
      body: 'NORTHMINE organiza el turno como una secuencia de lectura. La interfaz prioriza la decisión y deja el detalle disponible para investigar la causa.',
      stages: [
        { title: 'Estado del turno', copy: 'Producción acumulada, cumplimiento, proyección y calidad del dato.' },
        { title: 'Brecha y ritmo requerido', copy: 'Lo que falta para cerrar el turno y el ritmo necesario para recuperarlo.' },
        { title: 'Equipos y causas', copy: 'CAEX, carguío, ciclos, disponibilidad y frentes asociados a la brecha.' },
        { title: 'Riesgo y recomendación', copy: 'Prioridad, confianza, impacto esperado y condiciones para ejecutar.' },
        { title: 'Decisión y resultado', copy: 'Acción registrada y seguimiento de su efecto en la operación.' },
        { title: 'Planificación y comparación', copy: 'Turnos, periodos, escenarios y avance del plan mensual en un mismo lenguaje.' },
      ],
    },
    preview: {
      eyebrow: 'Cockpit operacional',
      title: 'La primera pantalla responde qué ocurre y qué hacer ahora.',
      ariaReadings: 'Lecturas disponibles',
      readings: [
        'Producción, meta y proyección',
        'Carguío y CAEX en contexto',
        'Riesgo y recomendación priorizada',
      ],
      evidenceAria: 'Diagrama conceptual de la lectura del Decision Cockpit; no es una captura del producto',
      briefLabel: 'Diagrama de lectura',
      briefTitle: 'Del estado del turno a una acción verificable.',
      briefBody: 'Representación conceptual. La captura real se incorporará después de validar el último build del demo.',
      trace: [
        { label: 'Estado', value: 'Producción y meta' },
        { label: 'Brecha', value: 'Proyección y ritmo' },
        { label: 'Causa', value: 'CAEX, carguío y riesgo' },
        { label: 'Acción', value: 'Recomendación y evidencia' },
      ],
      figcaption: 'Diagrama conceptual, no captura de producto. Captura real pendiente.',
      equipmentAria: 'Equipos representados en NORTHMINE',
      equipmentTruckTitle: 'CAEX',
      equipmentTruckSub: 'Estado, ciclos, frente y destino',
      equipmentScene: 'Escena sintética original',
      equipmentShovelTitle: 'Carguío',
      equipmentShovelSub: 'Rendimiento, cola, operador y alertas',
      equipmentTitle: 'Cada unidad conserva su contexto operacional.',
      equipmentBody: 'La selección de una pala o CAEX abre su detalle sin perder el turno: disponibilidad, ciclos, origen, destino, alertas y recomendación quedan vinculados al mismo equipo.',
      equipmentFacts: [
        { label: 'Disponibilidad', value: 'Estado y última actividad' },
        { label: 'Movimiento', value: 'Ciclos, tonelaje y ruta' },
        { label: 'Decisión', value: 'Alerta, prioridad y acción' },
      ],
      mapEyebrow: 'Mapa operacional 3D',
      mapTitle: 'La geometría de la mina como contexto para la operación.',
      mapBody: 'El mapa relaciona módulos, decisiones y fuentes sobre una escena 3D basada en geometría DXF. En una integración privada, la geometría puede provenir de la operación real; los valores mostrados en este demo son sintéticos.',
      mapNote: 'DXF y relaciones espaciales sin exponer datos operacionales privados.',
      mapAria: 'Ortomosaico sintético con capa DXF demostrativa derivada de la geometría pit-shell incluida en NORTHMINE',
      mapLegendTitle: 'Geometría de rajo + ortomosaico',
      mapLegendSub: '4.823 polilíneas / referencia visual sintética',
      mapFigcaption: 'Ortomosaico sintético original con capa derivada de pit-shell.json. No representa una faena ni datos operacionales reales.',
    },
    disclosure: {
      eyebrow: 'Honestidad del entorno',
      title: 'Qué contiene este demo',
      body: 'El objetivo es evaluar la experiencia, las relaciones entre módulos y la forma en que NORTHMINE estructura una decisión.',
      items: [
        { title: 'Datos sintéticos', copy: 'Valores representativos creados para demostrar flujos y visualizaciones.' },
        { title: 'Sin credenciales reales', copy: 'El entorno público no contiene claves SQL ni acceso a sistemas productivos.' },
        { title: 'Integración privada', copy: 'Conectores y fuentes operacionales se configuran en entornos controlados.' },
      ],
      securityTitle: 'Acceso controlado sin mezclar entornos.',
      securityPrinciples: [
        'Roles y acceso protegido',
        'Auditoría de acciones',
        'Integraciones privadas separadas',
      ],
    },
    finalCta: {
      title: 'Solicitar una demostración de NORTHMINE',
      body: 'Cuéntanos qué necesitas evaluar. La solicitud se revisa antes de habilitar un acceso individual al entorno interactivo.',
      cta: 'Solicitar acceso',
      acceso: 'Ya tengo acceso',
    },
    requestPage: {
      metaTitle: 'Solicitar acceso al demo | NORTHMINE Intelligence',
      metaDescription: 'Solicita acceso controlado al demo interactivo de NORTHMINE Intelligence con datos operacionales sintéticos.',
      eyebrow: 'Solicitud de acceso',
      title: 'Evalúa NORTHMINE en un entorno controlado.',
      body: 'Completa el formulario para que podamos revisar tu contexto y habilitar el acceso adecuado. No se solicitan credenciales ni información operacional sensible.',
      facts: [
        { label: 'Entorno', value: 'Demo con datos sintéticos' },
        { label: 'Revisión', value: 'Manual, antes de habilitar acceso' },
        { label: 'Integraciones', value: 'Disponibles solo en entornos privados' },
      ],
      stepLabel: 'Paso único',
      formTitle: 'Información para la demostración',
      formHint: 'Los campos marcados con * son obligatorios.',
    },
    requestForm: {
      countries: ['Argentina', 'Australia', 'Bolivia', 'Brasil', 'Canadá', 'Chile', 'Colombia', 'Ecuador', 'Estados Unidos', 'México', 'Perú', 'Sudáfrica', 'Otro'],
      summaryError: 'No se pudo enviar la solicitud',
      summaryFields: 'Revisa los campos indicados',
      contactLegend: 'Datos de contacto',
      contactHint: 'Usaremos esta información exclusivamente para revisar tu solicitud de demostración.',
      firstName: 'Nombre',
      lastName: 'Apellido',
      email: 'Correo',
      phone: 'Teléfono',
      optional: 'opcional',
      professionalLegend: 'Contexto profesional',
      professionalHint: 'No solicites ni incluyas credenciales, servidores o datos productivos confidenciales.',
      company: 'Empresa',
      role: 'Cargo o función',
      country: 'País',
      selectCountry: 'Selecciona un país',
      operationType: 'Tipo de operación',
      operationOptions: ['No especificado', 'Minería a cielo abierto', 'Minería subterránea', 'Servicios mineros', 'Tecnología e integración', 'Otro'],
      fleetSize: 'Tamaño aproximado de flota',
      fleetOptions: ['No especificado', '1-10 equipos', '11-30 equipos', '31-75 equipos', '76-150 equipos', 'Más de 150 equipos'],
      interestsLegend: 'Qué necesitas evaluar',
      interestsHint: 'Selecciona una o más capacidades.',
      additionalLegend: 'Contexto adicional',
      message: 'Mensaje',
      messageHelp: 'Describe el flujo o módulo que deseas revisar. No incluyas información confidencial.',
      honeypot: 'Sitio web. Deja este campo vacío.',
      consentBefore: 'Acepto que estos datos se utilicen para revisar y responder mi solicitud de demostración.',
      consentAfter: 'Consulte la',
      consentLink: 'política de privacidad',
      privacyLink: '/privacy',
      submitHint: 'La solicitud será revisada. El envío no crea una cuenta ni garantiza aprobación inmediata.',
      submitLabel: 'Enviar solicitud',
      submitting: 'Enviando solicitud',
      liveSubmitting: 'Enviando solicitud. No cierres esta página.',
      errFirstName: 'Ingresa un nombre de al menos 2 caracteres.',
      errLastName: 'Ingresa un apellido de al menos 2 caracteres.',
      errEmail: 'Ingresa un correo válido.',
      errCompany: 'Ingresa el nombre de la empresa.',
      errRole: 'Indica tu cargo o función.',
      errCountry: 'Selecciona un país.',
      errInterests: 'Selecciona al menos un interés.',
      errConsent: 'Debes aceptar el tratamiento de estos datos.',
      errMessageLen: 'El mensaje no puede superar 1200 caracteres.',
      errPhoneLen: 'El teléfono no puede superar 40 caracteres.',
      errGeneric: 'No fue posible enviar la solicitud. Revisa tu conexión e intenta nuevamente.',
      errApi429: 'Se alcanzó el límite temporal de solicitudes. Intenta nuevamente más tarde.',
      errApi422: 'La API rechazó uno o más campos. Revisa los datos ingresados.',
      errApi503: 'Las solicitudes están temporalmente no disponibles. Tus datos no fueron guardados; intenta nuevamente más tarde.',
      errApi500: 'El servicio de solicitudes no está disponible en este momento.',
    },
    success: {
      metaTitle: 'Solicitud recibida | NORTHMINE Intelligence',
      metaDescription: 'Confirmación de solicitud de acceso al demo de NORTHMINE Intelligence.',
      eyebrow: 'Solicitud recibida',
      title: 'Gracias. Revisaremos la información enviada.',
      body: 'El envío no crea credenciales automáticamente. Si la solicitud es aprobada, recibirás instrucciones de acceso por un canal acordado.',
      reference: 'Referencia',
      back: 'Volver a NORTHMINE',
      acceso: 'Ya tengo acceso',
    },
    privacy: {
      metaTitle: 'Privacidad de solicitudes demo | NORTHMINE Intelligence',
      metaDescription: 'Información sobre el uso de datos enviados para solicitar una demostración de NORTHMINE.',
      eyebrow: 'Privacidad',
      title: 'Solicitudes de demostración',
      version: 'Versión informativa: 31 de julio de 2026.',
      ariaIndex: 'Contenido de privacidad',
      index: [
        'Información solicitada',
        'Uso de la información',
        'Qué no debes enviar',
        'Separación del entorno',
        'Conservación',
        'Puntos pendientes',
      ],
      sections: [
        { heading: 'Qué información se solicita', body: 'Nombre, apellido, correo, empresa, cargo, país, intereses y consentimiento. El teléfono, tipo de operación, tamaño de flota y mensaje son opcionales.' },
        { heading: 'Para qué se utiliza', body: 'Para revisar la solicitud, comprender el contexto de evaluación, decidir si corresponde habilitar acceso y coordinar una demostración de NORTHMINE.' },
        { heading: 'Qué no debes enviar', body: 'No solicitamos ni debes enviar contraseñas, credenciales SQL, direcciones IP privadas, nombres de servidores, archivos ni datos operacionales confidenciales.' },
        { heading: 'Separación del entorno', body: 'Las solicitudes se mantienen separadas de los datos operacionales y de las cuentas del producto. El demo público utiliza información sintética y no está conectado a bases productivas reales.' },
        { heading: 'Conservación y eliminación', body: 'El plazo exacto de conservación y el procedimiento permanente de eliminación deben ser definidos por el responsable antes del lanzamiento comercial. Mientras este demo se encuentre en evaluación, no envíes información sensible o confidencial.' },
        { heading: 'Bloqueos de privacidad pendientes', body: 'Antes de un lanzamiento comercial definitivo, el propietario debe publicar aquí su identidad legal, un canal permanente para solicitudes de privacidad, el plazo de conservación y el procedimiento de eliminación o anonimización. Este demo no afirma cumplimiento certificado ni una jurisdicción legal no verificada.' },
      ],
    },
    login: {
      back: 'Volver a NORTHMINE Intelligence',
      disclosure: 'Demo público con datos sintéticos. Acceso individual y revisado.',
    },
    meta: {
      home: {
        title: 'NORTHMINE Intelligence | Control operacional minero',
        description: 'Control y decisión operacional para minería a cielo abierto. Solicita acceso al demo interactivo de NORTHMINE con datos sintéticos.',
      },
      access: {
        title: 'Acceso al demo | NORTHMINE Intelligence',
        description: 'Acceso protegido al demo interactivo de NORTHMINE Intelligence.',
      },
    },
  },
  en: {
    switcherAria: 'Change language',
    landingHeader: {
      skip: 'Skip to content',
      nav: { capacidades: 'Capabilities', flujo: 'How it works', demo: 'Demo' },
      status: 'Public demo',
      accesoTengo: 'I already have access',
      cta: 'Request access',
      ariaNav: 'Primary navigation',
      ariaAbrir: 'Open navigation',
      ariaCerrar: 'Close navigation',
      ariaBrand: 'NORTHMINE Intelligence, home',
      brandAlt: 'NORTHMINE Intelligence Hub',
    },
    landingFooter: {
      tagline: 'Operational control and decisions for open-pit mining.',
      ariaNav: 'Footer links',
      navPrivacidad: 'Privacy',
      navSolicitar: 'Request access',
      navAcceso: 'Demo access',
      status: 'Demo with synthetic data',
      ariaBrand: 'NORTHMINE Intelligence, home',
    },
    hero: {
      eyebrow: 'Layers of decision',
      title: 'NORTHMINE Intelligence',
      positioning: 'Operational control for open-pit mining.',
      lead: 'It brings together production, fleet, loading and risk to turn the shift gap into an explainable, traceable action.',
      ctaDemo: 'Request demo access',
      ctaExplorar: 'Explore capabilities',
      disclosure: 'Synthetic image and data. Access manually reviewed.',
      ariaFacts: 'Demo scope',
      facts: [
        { label: 'Environment data', value: 'Synthetic and representative' },
        { label: 'Flow', value: 'Status, gap, cause and action' },
        { label: 'Access', value: 'Manual review and enabling' },
      ],
    },
    story: {
      title: 'The information exists. The decision is still fragmented.',
      body: 'When production, fleet and maintenance do not share context, the gap is detected late and it is hard to link an action to its result.',
      aria: 'Consolidated operational sources',
      signals: [
        { title: 'Production', copy: 'Target, progress and projection in separate sources.' },
        { title: 'Dispatch', copy: 'Cycles and assignments without a common shift reading.' },
        { title: 'Maintenance', copy: 'Availability without context on operational impact.' },
        { title: 'Risk', copy: 'Alerts that reach the decision too late.' },
      ],
      resultLabel: 'Common reading',
      resultTitle: 'Status, gap, pace and action',
      resultCopy: 'A decision supported by operational evidence and traceability.',
    },
    capabilities: {
      eyebrow: 'Capabilities',
      title: 'From operational status to a verifiable action.',
      body: 'NORTHMINE organizes the shift as a reading sequence. The interface prioritizes the decision and keeps the detail available to investigate the cause.',
      stages: [
        { title: 'Shift status', copy: 'Accumulated production, compliance, projection and data quality.' },
        { title: 'Gap and required pace', copy: 'What is needed to close the shift and the pace required to recover it.' },
        { title: 'Equipment and causes', copy: 'Trucks, loading, cycles, availability and benches tied to the gap.' },
        { title: 'Risk and recommendation', copy: 'Priority, confidence, expected impact and conditions to execute.' },
        { title: 'Decision and outcome', copy: 'Recorded action and tracking of its effect on the operation.' },
        { title: 'Planning and comparison', copy: 'Shifts, periods, scenarios and monthly plan progress in one language.' },
      ],
    },
    preview: {
      eyebrow: 'Operational cockpit',
      title: 'The first screen answers what is happening and what to do now.',
      ariaReadings: 'Available readings',
      readings: [
        'Production, target and projection',
        'Loading and trucks in context',
        'Prioritized risk and recommendation',
      ],
      evidenceAria: 'Conceptual diagram of the Decision Cockpit reading; not a product capture',
      briefLabel: 'Reading diagram',
      briefTitle: 'From shift status to a verifiable action.',
      briefBody: 'Conceptual representation. The real capture will be added after validating the latest demo build.',
      trace: [
        { label: 'Status', value: 'Production and target' },
        { label: 'Gap', value: 'Projection and pace' },
        { label: 'Cause', value: 'Trucks, loading and risk' },
        { label: 'Action', value: 'Recommendation and evidence' },
      ],
      figcaption: 'Conceptual diagram, not a product capture. Real capture pending.',
      equipmentAria: 'Equipment represented in NORTHMINE',
      equipmentTruckTitle: 'Truck',
      equipmentTruckSub: 'Status, cycles, bench and destination',
      equipmentScene: 'Original synthetic scene',
      equipmentShovelTitle: 'Loading',
      equipmentShovelSub: 'Performance, queue, operator and alerts',
      equipmentTitle: 'Each unit keeps its operational context.',
      equipmentBody: 'Selecting a shovel or truck opens its detail without losing the shift: availability, cycles, origin, destination, alerts and recommendation stay tied to the same equipment.',
      equipmentFacts: [
        { label: 'Availability', value: 'Status and last activity' },
        { label: 'Movement', value: 'Cycles, tonnage and route' },
        { label: 'Decision', value: 'Alert, priority and action' },
      ],
      mapEyebrow: '3D operational map',
      mapTitle: 'The mine geometry as context for the operation.',
      mapBody: 'The map relates modules, decisions and sources over a 3D scene based on DXF geometry. In a private integration the geometry can come from the real operation; the values shown in this demo are synthetic.',
      mapNote: 'DXF and spatial relationships without exposing private operational data.',
      mapAria: 'Synthetic orthomosaic with a demo DXF layer derived from the pit-shell geometry included in NORTHMINE',
      mapLegendTitle: 'Pit geometry + orthomosaic',
      mapLegendSub: '4,823 polylines / synthetic visual reference',
      mapFigcaption: 'Original synthetic orthomosaic with a layer derived from pit-shell.json. It does not represent a real site or operational data.',
    },
    disclosure: {
      eyebrow: 'Environment honesty',
      title: 'What this demo contains',
      body: 'The goal is to evaluate the experience, the relationships between modules and how NORTHMINE structures a decision.',
      items: [
        { title: 'Synthetic data', copy: 'Representative values created to demonstrate flows and visualizations.' },
        { title: 'No real credentials', copy: 'The public environment contains no SQL credentials or access to production systems.' },
        { title: 'Private integration', copy: 'Connectors and operational sources are configured in controlled environments.' },
      ],
      securityTitle: 'Controlled access without mixing environments.',
      securityPrinciples: [
        'Protected roles and access',
        'Action auditing',
        'Separate private integrations',
      ],
    },
    finalCta: {
      title: 'Request a NORTHMINE demonstration',
      body: 'Tell us what you need to evaluate. Requests are reviewed before an individual access to the interactive environment is enabled.',
      cta: 'Request access',
      acceso: 'I already have access',
    },
    requestPage: {
      metaTitle: 'Request demo access | NORTHMINE Intelligence',
      metaDescription: 'Request controlled access to the interactive NORTHMINE Intelligence demo with synthetic operational data.',
      eyebrow: 'Access request',
      title: 'Evaluate NORTHMINE in a controlled environment.',
      body: 'Complete the form so we can review your context and enable the right access. No credentials or sensitive operational information are requested.',
      facts: [
        { label: 'Environment', value: 'Demo with synthetic data' },
        { label: 'Review', value: 'Manual, before enabling access' },
        { label: 'Integrations', value: 'Available only in private environments' },
      ],
      stepLabel: 'Single step',
      formTitle: 'Information for the demonstration',
      formHint: 'Fields marked with * are required.',
    },
    requestForm: {
      countries: ['Argentina', 'Australia', 'Bolivia', 'Brazil', 'Canada', 'Chile', 'Colombia', 'Ecuador', 'United States', 'Mexico', 'Peru', 'South Africa', 'Other'],
      summaryError: 'The request could not be sent',
      summaryFields: 'Review the highlighted fields',
      contactLegend: 'Contact details',
      contactHint: 'We will use this information only to review your demo request.',
      firstName: 'First name',
      lastName: 'Last name',
      email: 'Email',
      phone: 'Phone',
      optional: 'optional',
      professionalLegend: 'Professional context',
      professionalHint: 'Do not request or include credentials, servers or confidential production data.',
      company: 'Company',
      role: 'Role or function',
      country: 'Country',
      selectCountry: 'Select a country',
      operationType: 'Operation type',
      operationOptions: ['Not specified', 'Open-pit mining', 'Underground mining', 'Mining services', 'Technology and integration', 'Other'],
      fleetSize: 'Approximate fleet size',
      fleetOptions: ['Not specified', '1-10 units', '11-30 units', '31-75 units', '76-150 units', 'More than 150 units'],
      interestsLegend: 'What you need to evaluate',
      interestsHint: 'Select one or more capabilities.',
      additionalLegend: 'Additional context',
      message: 'Message',
      messageHelp: 'Describe the flow or module you want to review. Do not include confidential information.',
      honeypot: 'Website. Leave this field empty.',
      consentBefore: 'I agree that this data will be used to review and respond to my demo request.',
      consentAfter: 'See the',
      consentLink: 'privacy policy',
      privacyLink: '/privacy',
      submitHint: 'The request will be reviewed. Submitting does not create an account or guarantee immediate approval.',
      submitLabel: 'Send request',
      submitting: 'Sending request',
      liveSubmitting: 'Sending request. Do not close this page.',
      errFirstName: 'Enter a first name of at least 2 characters.',
      errLastName: 'Enter a last name of at least 2 characters.',
      errEmail: 'Enter a valid email.',
      errCompany: 'Enter the company name.',
      errRole: 'Indicate your role or function.',
      errCountry: 'Select a country.',
      errInterests: 'Select at least one interest.',
      errConsent: 'You must accept the processing of this data.',
      errMessageLen: 'The message cannot exceed 1200 characters.',
      errPhoneLen: 'The phone number cannot exceed 40 characters.',
      errGeneric: 'The request could not be sent. Check your connection and try again.',
      errApi429: 'The temporary request limit was reached. Try again later.',
      errApi422: 'The API rejected one or more fields. Review the entered data.',
      errApi503: 'Requests are temporarily unavailable. Your data was not saved; try again later.',
      errApi500: 'The request service is not available right now.',
    },
    success: {
      metaTitle: 'Request received | NORTHMINE Intelligence',
      metaDescription: 'Confirmation of your NORTHMINE Intelligence demo access request.',
      eyebrow: 'Request received',
      title: 'Thank you. We will review the information sent.',
      body: 'Submitting does not automatically create credentials. If the request is approved, you will receive access instructions through an agreed channel.',
      reference: 'Reference',
      back: 'Back to NORTHMINE',
      acceso: 'I already have access',
    },
    privacy: {
      metaTitle: 'Demo request privacy | NORTHMINE Intelligence',
      metaDescription: 'Information about how data sent to request a NORTHMINE demonstration is used.',
      eyebrow: 'Privacy',
      title: 'Demonstration requests',
      version: 'Informative version: July 31, 2026.',
      ariaIndex: 'Privacy contents',
      index: [
        'Information requested',
        'Use of information',
        'What not to send',
        'Environment separation',
        'Retention',
        'Pending items',
      ],
      sections: [
        { heading: 'What information is requested', body: 'First name, last name, email, company, role, country, interests and consent. Phone, operation type, fleet size and message are optional.' },
        { heading: 'How it is used', body: 'To review the request, understand the evaluation context, decide whether to enable access and coordinate a NORTHMINE demonstration.' },
        { heading: 'What not to send', body: 'We do not request and you should not send passwords, SQL credentials, private IP addresses, server names, files or confidential operational data.' },
        { heading: 'Environment separation', body: 'Requests are kept separate from operational data and product accounts. The public demo uses synthetic information and is not connected to real production databases.' },
        { heading: 'Retention and deletion', body: 'The exact retention period and the permanent deletion procedure must be defined by the controller before commercial launch. While this demo is under evaluation, do not send sensitive or confidential information.' },
        { heading: 'Pending privacy blockers', body: 'Before a final commercial launch, the owner must publish here their legal identity, a permanent channel for privacy requests, the retention period and the deletion or anonymization procedure. This demo does not claim certified compliance or an unverified legal jurisdiction.' },
      ],
    },
    login: {
      back: 'Back to NORTHMINE Intelligence',
      disclosure: 'Public demo with synthetic data. Individual, reviewed access.',
    },
    meta: {
      home: {
        title: 'NORTHMINE Intelligence | Mining operational control',
        description: 'Operational control and decisions for open-pit mining. Request access to the interactive NORTHMINE demo with synthetic data.',
      },
      access: {
        title: 'Demo access | NORTHMINE Intelligence',
        description: 'Protected access to the interactive NORTHMINE Intelligence demo.',
      },
    },
  },
  de: {
    switcherAria: 'Sprache ändern',
    landingHeader: {
      skip: 'Zum Inhalt springen',
      nav: { capacidades: 'Funktionen', flujo: 'So funktioniert es', demo: 'Demo' },
      status: 'Öffentliches Demo',
      accesoTengo: 'Ich habe bereits Zugang',
      cta: 'Zugang anfordern',
      ariaNav: 'Hauptnavigation',
      ariaAbrir: 'Navigation öffnen',
      ariaCerrar: 'Navigation schließen',
      ariaBrand: 'NORTHMINE Intelligence, Start',
      brandAlt: 'NORTHMINE Intelligence Hub',
    },
    landingFooter: {
      tagline: 'Operative Steuerung und Entscheidungen für den Tagebau.',
      ariaNav: 'Fußzeilen-Links',
      navPrivacidad: 'Datenschutz',
      navSolicitar: 'Zugang anfordern',
      navAcceso: 'Demo-Zugang',
      status: 'Demo mit synthetischen Daten',
      ariaBrand: 'NORTHMINE Intelligence, Start',
    },
    hero: {
      eyebrow: 'Entscheidungsebenen',
      title: 'NORTHMINE Intelligence',
      positioning: 'Operative Steuerung für den Tagebau.',
      lead: 'Es führt Produktion, Flotte, Beladung und Risiko zusammen, um die Schichtlücke in eine erklärbare, nachvollziehbare Aktion zu verwandeln.',
      ctaDemo: 'Demo-Zugang anfordern',
      ctaExplorar: 'Funktionen entdecken',
      disclosure: 'Synthetisches Bild und Daten. Zugang manuell geprüft.',
      ariaFacts: 'Umfang des Demo',
      facts: [
        { label: 'Umgebungsdaten', value: 'Synthetisch und repräsentativ' },
        { label: 'Ablauf', value: 'Status, Lücke, Ursache und Aktion' },
        { label: 'Zugang', value: 'Manuelle Prüfung und Freischaltung' },
      ],
    },
    story: {
      title: 'Die Informationen sind da. Die Entscheidung bleibt fragmentiert.',
      body: 'Wenn Produktion, Flotte und Wartung keinen Kontext teilen, wird die Lücke zu spät erkannt und es ist schwer, eine Aktion mit ihrem Ergebnis zu verknüpfen.',
      aria: 'Konsolidierte operative Quellen',
      signals: [
        { title: 'Produktion', copy: 'Ziel, Fortschritt und Prognose in getrennten Quellen.' },
        { title: 'Disposition', copy: 'Zyklen und Zuweisungen ohne gemeinsame Schichtlesart.' },
        { title: 'Wartung', copy: 'Verfügbarkeit ohne Kontext zur operativen Auswirkung.' },
        { title: 'Risiko', copy: 'Alarme, die zu spät zur Entscheidung kommen.' },
      ],
      resultLabel: 'Gemeinsame Lesart',
      resultTitle: 'Status, Lücke, Tempo und Aktion',
      resultCopy: 'Eine Entscheidung, gestützt auf operative Evidenz und Nachvollziehbarkeit.',
    },
    capabilities: {
      eyebrow: 'Funktionen',
      title: 'Vom operativen Status zur verifizierbaren Aktion.',
      body: 'NORTHMINE ordnet die Schicht als Lesesequenz. Die Oberfläche priorisiert die Entscheidung und hält die Details zur Ursachenprüfung bereit.',
      stages: [
        { title: 'Schichtstatus', copy: 'Kumulierte Produktion, Einhaltung, Prognose und Datenqualität.' },
        { title: 'Lücke und erforderliches Tempo', copy: 'Was fehlt, um die Schicht zu schließen, und das Tempo, um sie zu retten.' },
        { title: 'Ausrüstung und Ursachen', copy: 'LKW, Beladung, Zyklen, Verfügbarkeit und Fronts im Zusammenhang mit der Lücke.' },
        { title: 'Risiko und Empfehlung', copy: 'Priorität, Vertrauen, erwartete Wirkung und Bedingungen für die Ausführung.' },
        { title: 'Entscheidung und Ergebnis', copy: 'Registrierte Aktion und Nachverfolgung ihrer Wirkung auf den Betrieb.' },
        { title: 'Planung und Vergleich', copy: 'Schichten, Zeiträume, Szenarien und Fortschritt des Monatsplans in einer Sprache.' },
      ],
    },
    preview: {
      eyebrow: 'Operatives Cockpit',
      title: 'Der erste Bildschirm beantwortet, was passiert und was jetzt zu tun ist.',
      ariaReadings: 'Verfügbare Lesarten',
      readings: [
        'Produktion, Ziel und Prognose',
        'Beladung und LKW im Kontext',
        'Priorisiertes Risiko und Empfehlung',
      ],
      evidenceAria: 'Konzeptdiagramm der Decision-Cockpit-Lesart; keine Produktaufnahme',
      briefLabel: 'Lese-Diagramm',
      briefTitle: 'Vom Schichtstatus zur verifizierbaren Aktion.',
      briefBody: 'Konzeptuelle Darstellung. Die echte Aufnahme folgt nach Validierung des letzten Demo-Builds.',
      trace: [
        { label: 'Status', value: 'Produktion und Ziel' },
        { label: 'Lücke', value: 'Prognose und Tempo' },
        { label: 'Ursache', value: 'LKW, Beladung und Risiko' },
        { label: 'Aktion', value: 'Empfehlung und Evidenz' },
      ],
      figcaption: 'Konzeptdiagramm, keine Produktaufnahme. Echte Aufnahme ausstehend.',
      equipmentAria: 'In NORTHMINE dargestellte Ausrüstung',
      equipmentTruckTitle: 'LKW',
      equipmentTruckSub: 'Status, Zyklen, Front und Ziel',
      equipmentScene: 'Originale synthetische Szene',
      equipmentShovelTitle: 'Beladung',
      equipmentShovelSub: 'Leistung, Warteschlange, Bediener und Alarme',
      equipmentTitle: 'Jede Einheit behält ihren operativen Kontext.',
      equipmentBody: 'Die Auswahl eines Baggers oder LKW öffnet sein Detail ohne die Schicht zu verlieren: Verfügbarkeit, Zyklen, Herkunft, Ziel, Alarme und Empfehlung bleiben mit derselben Einheit verbunden.',
      equipmentFacts: [
        { label: 'Verfügbarkeit', value: 'Status und letzte Aktivität' },
        { label: 'Bewegung', value: 'Zyklen, Tonnage und Route' },
        { label: 'Entscheidung', value: 'Alarm, Priorität und Aktion' },
      ],
      mapEyebrow: '3D-Betriebskarte',
      mapTitle: 'Die Geometrie der Mine als Kontext für den Betrieb.',
      mapBody: 'Die Karte verknüpft Module, Entscheidungen und Quellen über einer 3D-Szene auf Basis von DXF-Geometrie. In einer privaten Integration kann die Geometrie aus dem echten Betrieb stammen; die hier gezeigten Werte sind synthetisch.',
      mapNote: 'DXF und räumliche Beziehungen ohne Offenlegung privater Betriebsdaten.',
      mapAria: 'Synthetisches Orthofoto mit Demo-DXF-Ebene, abgeleitet aus der in NORTHMINE enthaltenen Pit-Shell-Geometrie',
      mapLegendTitle: 'Grubengeometrie + Orthofoto',
      mapLegendSub: '4.823 Polylinien / synthetische Referenz',
      mapFigcaption: 'Originales synthetisches Orthofoto mit Ebene aus pit-shell.json. Stellt keine reale Grube oder Betriebsdaten dar.',
    },
    disclosure: {
      eyebrow: 'Ehrlichkeit der Umgebung',
      title: 'Was dieses Demo enthält',
      body: 'Ziel ist es, die Erfahrung, die Beziehungen zwischen Modulen und die Art zu bewerten, wie NORTHMINE eine Entscheidung strukturiert.',
      items: [
        { title: 'Synthetische Daten', copy: 'Repräsentative Werte zur Darstellung von Abläufen und Visualisierungen.' },
        { title: 'Keine echten Zugangsdaten', copy: 'Die öffentliche Umgebung enthält keine SQL-Zugangsdaten oder Zugriff auf Produktionssysteme.' },
        { title: 'Private Integration', copy: 'Konnektoren und operative Quellen werden in kontrollierten Umgebungen konfiguriert.' },
      ],
      securityTitle: 'Kontrollierter Zugriff ohne Vermischung der Umgebungen.',
      securityPrinciples: [
        'Geschützte Rollen und Zugriff',
        'Aktionsprüfung',
        'Getrennte private Integrationen',
      ],
    },
    finalCta: {
      title: 'Fordern Sie eine NORTHMINE-Demonstration an',
      body: 'Sagen Sie uns, was Sie bewerten möchten. Die Anfrage wird geprüft, bevor ein individueller Zugang zur interaktiven Umgebung freigeschaltet wird.',
      cta: 'Zugang anfordern',
      acceso: 'Ich habe bereits Zugang',
    },
    requestPage: {
      metaTitle: 'Demo-Zugang anfordern | NORTHMINE Intelligence',
      metaDescription: 'Fordern Sie kontrollierten Zugang zum interaktiven NORTHMINE Intelligence Demo mit synthetischen Betriebsdaten an.',
      eyebrow: 'Zugangsanfrage',
      title: 'Bewerten Sie NORTHMINE in einer kontrollierten Umgebung.',
      body: 'Füllen Sie das Formular aus, damit wir Ihren Kontext prüfen und den passenden Zugang freischalten können. Es werden keine Zugangsdaten oder sensible Betriebsinformationen erfragt.',
      facts: [
        { label: 'Umgebung', value: 'Demo mit synthetischen Daten' },
        { label: 'Prüfung', value: 'Manuell, vor der Freischaltung' },
        { label: 'Integrationen', value: 'Nur in privaten Umgebungen verfügbar' },
      ],
      stepLabel: 'Ein einziger Schritt',
      formTitle: 'Informationen für die Demonstration',
      formHint: 'Mit * markierte Felder sind Pflichtfelder.',
    },
    requestForm: {
      countries: ['Argentinien', 'Australien', 'Bolivien', 'Brasilien', 'Kanada', 'Chile', 'Kolumbien', 'Ecuador', 'Vereinigte Staaten', 'Mexiko', 'Peru', 'Südafrika', 'Andere'],
      summaryError: 'Die Anfrage konnte nicht gesendet werden',
      summaryFields: 'Überprüfen Sie die markierten Felder',
      contactLegend: 'Kontaktdaten',
      contactHint: 'Wir verwenden diese Informationen ausschließlich zur Prüfung Ihrer Demo-Anfrage.',
      firstName: 'Vorname',
      lastName: 'Nachname',
      email: 'E-Mail',
      phone: 'Telefon',
      optional: 'optional',
      professionalLegend: 'Beruflicher Kontext',
      professionalHint: 'Bitte fordern oder senden Sie keine Zugangsdaten, Server oder vertrauliche Produktionsdaten an.',
      company: 'Unternehmen',
      role: 'Rolle oder Funktion',
      country: 'Land',
      selectCountry: 'Land auswählen',
      operationType: 'Art des Betriebs',
      operationOptions: ['Nicht angegeben', 'Tagebau', 'Untertagebergbau', 'Bergbaudienstleistungen', 'Technologie und Integration', 'Andere'],
      fleetSize: 'Ungefähre Flottengröße',
      fleetOptions: ['Nicht angegeben', '1-10 Einheiten', '11-30 Einheiten', '31-75 Einheiten', '76-150 Einheiten', 'Mehr als 150 Einheiten'],
      interestsLegend: 'Was Sie bewerten möchten',
      interestsHint: 'Wählen Sie eine oder mehrere Funktionen.',
      additionalLegend: 'Weitere Angaben',
      message: 'Nachricht',
      messageHelp: 'Beschreiben Sie den Ablauf oder das Modul, das Sie prüfen möchten. Keine vertraulichen Informationen.',
      honeypot: 'Website. Dieses Feld leer lassen.',
      consentBefore: 'Ich stimme zu, dass diese Daten zur Prüfung und Beantwortung meiner Demo-Anfrage verwendet werden.',
      consentAfter: 'Siehe',
      consentLink: 'Datenschutzerklärung',
      privacyLink: '/privacy',
      submitHint: 'Die Anfrage wird geprüft. Das Senden erstellt kein Konto und garantiert keine sofortige Genehmigung.',
      submitLabel: 'Anfrage senden',
      submitting: 'Anfrage wird gesendet',
      liveSubmitting: 'Anfrage wird gesendet. Schließen Sie diese Seite nicht.',
      errFirstName: 'Geben Sie einen Vornamen mit mindestens 2 Zeichen ein.',
      errLastName: 'Geben Sie einen Nachnamen mit mindestens 2 Zeichen ein.',
      errEmail: 'Geben Sie eine gültige E-Mail ein.',
      errCompany: 'Geben Sie den Firmennamen ein.',
      errRole: 'Geben Sie Ihre Rolle oder Funktion an.',
      errCountry: 'Wählen Sie ein Land.',
      errInterests: 'Wählen Sie mindestens ein Interesse.',
      errConsent: 'Sie müssen der Verarbeitung dieser Daten zustimmen.',
      errMessageLen: 'Die Nachricht darf 1200 Zeichen nicht überschreiten.',
      errPhoneLen: 'Die Telefonnummer darf 40 Zeichen nicht überschreiten.',
      errGeneric: 'Die Anfrage konnte nicht gesendet werden. Überprüfen Sie Ihre Verbindung und versuchen Sie es erneut.',
      errApi429: 'Das temporäre Anfragelimit wurde erreicht. Versuchen Sie es später erneut.',
      errApi422: 'Die API hat ein oder mehrere Felder abgelehnt. Überprüfen Sie die eingegebenen Daten.',
      errApi503: 'Anfragen sind vorübergehend nicht verfügbar. Ihre Daten wurden nicht gespeichert; versuchen Sie es später erneut.',
      errApi500: 'Der Anfragedienst ist derzeit nicht verfügbar.',
    },
    success: {
      metaTitle: 'Anfrage erhalten | NORTHMINE Intelligence',
      metaDescription: 'Bestätigung Ihrer Demo-Zugangsanfrage bei NORTHMINE Intelligence.',
      eyebrow: 'Anfrage erhalten',
      title: 'Vielen Dank. Wir prüfen die gesendeten Informationen.',
      body: 'Das Senden erstellt nicht automatisch Zugangsdaten. Wird die Anfrage genehmigt, erhalten Sie Zugangsanweisungen über einen vereinbarten Kanal.',
      reference: 'Referenz',
      back: 'Zurück zu NORTHMINE',
      acceso: 'Ich habe bereits Zugang',
    },
    privacy: {
      metaTitle: 'Datenschutz für Demo-Anfragen | NORTHMINE Intelligence',
      metaDescription: 'Informationen zur Nutzung von Daten, die für eine NORTHMINE-Demonstration gesendet werden.',
      eyebrow: 'Datenschutz',
      title: 'Demonstrationsanfragen',
      version: 'Informative Fassung: 31. Juli 2026.',
      ariaIndex: 'Datenschutz-Inhalt',
      index: [
        'Erfragte Informationen',
        'Verwendung der Informationen',
        'Was Sie nicht senden sollten',
        'Trennung der Umgebungen',
        'Aufbewahrung',
        'Offene Punkte',
      ],
      sections: [
        { heading: 'Welche Informationen erfragt werden', body: 'Vorname, Nachname, E-Mail, Unternehmen, Rolle, Land, Interessen und Einwilligung. Telefon, Betriebsart, Flottengröße und Nachricht sind optional.' },
        { heading: 'Wofür sie verwendet werden', body: 'Zur Prüfung der Anfrage, zum Verständnis des Bewertungskontexts, zur Entscheidung über die Freischaltung und zur Koordination einer NORTHMINE-Demonstration.' },
        { heading: 'Was Sie nicht senden sollten', body: 'Wir erfragen keine Passwörter, SQL-Zugangsdaten, private IP-Adressen, Servernamen, Dateien oder vertrauliche Betriebsdaten – und Sie sollten sie nicht senden.' },
        { heading: 'Trennung der Umgebungen', body: 'Anfragen werden getrennt von Betriebsdaten und Produktkonten aufbewahrt. Das öffentliche Demo verwendet synthetische Informationen und ist nicht mit echten Produktionsdatenbanken verbunden.' },
        { heading: 'Aufbewahrung und Löschung', body: 'Die genaue Aufbewahrungsfrist und das dauerhafte Löschverfahren müssen vor dem kommerziellen Start vom Verantwortlichen festgelegt werden. Solange dieses Demo in Bewertung ist, senden Sie keine sensiblen oder vertraulichen Informationen.' },
        { heading: 'Offene Datenschutz-Blocker', body: 'Vor einem endgültigen kommerziellen Start muss der Eigentümer hier seine rechtliche Identität, einen dauerhaften Kanal für Datenschutzanfragen, die Aufbewahrungsfrist und das Lösch- oder Anonymisierungsverfahren veröffentlichen. Dieses Demo beansprucht weder zertifizierte Konformität noch eine ungeprüfte Rechtsordnung.' },
      ],
    },
    login: {
      back: 'Zurück zu NORTHMINE Intelligence',
      disclosure: 'Öffentliches Demo mit synthetischen Daten. Individueller, geprüfter Zugang.',
    },
    meta: {
      home: {
        title: 'NORTHMINE Intelligence | Operative Steuerung im Bergbau',
        description: 'Operative Steuerung und Entscheidungen für den Tagebau. Fordern Sie Zugang zum interaktiven NORTHMINE Demo mit synthetischen Daten an.',
      },
      access: {
        title: 'Demo-Zugang | NORTHMINE Intelligence',
        description: 'Geschützter Zugang zum interaktiven NORTHMINE Intelligence Demo.',
      },
    },
  },
  zh: {
    switcherAria: '切换语言',
    landingHeader: {
      skip: '跳到主要内容',
      nav: { capacidades: '能力', flujo: '工作原理', demo: '演示' },
      status: '公共演示',
      accesoTengo: '我已获得访问',
      cta: '申请访问',
      ariaNav: '主导航',
      ariaAbrir: '打开导航',
      ariaCerrar: '关闭导航',
      ariaBrand: 'NORTHMINE Intelligence，首页',
      brandAlt: 'NORTHMINE Intelligence Hub',
    },
    landingFooter: {
      tagline: '面向露天矿的运营控制与决策。',
      ariaNav: '页脚链接',
      navPrivacidad: '隐私',
      navSolicitar: '申请访问',
      navAcceso: '演示访问',
      status: '使用合成数据的演示',
      ariaBrand: 'NORTHMINE Intelligence，首页',
    },
    hero: {
      eyebrow: '决策层级',
      title: 'NORTHMINE Intelligence',
      positioning: '面向露天矿的运营控制。',
      lead: '汇集生产、车队、装载与风险，将班次差距转化为可解释、可追溯的行动。',
      ctaDemo: '申请演示访问',
      ctaExplorar: '探索能力',
      disclosure: '合成图像与数据。访问需人工审核。',
      ariaFacts: '演示范围',
      facts: [
        { label: '环境数据', value: '合成且具有代表性' },
        { label: '流程', value: '状态、差距、原因与行动' },
        { label: '访问', value: '人工审核与开通' },
      ],
    },
    story: {
      title: '信息已经存在，但决策仍然碎片化。',
      body: '当生产、车队与维护不共享背景信息时，差距被发现得太晚，也难以将行动与其结果关联。',
      aria: '整合后的运营数据源',
      signals: [
        { title: '生产', copy: '目标、进度与预测分散在不同来源。' },
        { title: '调度', copy: '循环与分配缺乏统一的班次视图。' },
        { title: '维护', copy: '可用性缺乏运营影响背景。' },
        { title: '风险', copy: '告警总是迟到，无法支撑决策。' },
      ],
      resultLabel: '统一视图',
      resultTitle: '状态、差距、节奏与行动',
      resultCopy: '以运营证据与可追溯性支撑的决策。',
    },
    capabilities: {
      eyebrow: '能力',
      title: '从运营状态到可验证的行动。',
      body: 'NORTHMINE 将班次组织为一段阅读序列。界面优先呈现决策，并保留细节供您追查原因。',
      stages: [
        { title: '班次状态', copy: '累计产量、达成率、预测与数据质量。' },
        { title: '差距与所需节奏', copy: '完成班次还缺什么，以及弥补所需的节奏。' },
        { title: '设备与原因', copy: '卡车、装载、循环、可用性与作业面，关联差距。' },
        { title: '风险与建议', copy: '优先级、置信度、预期影响与执行条件。' },
        { title: '决策与结果', copy: '行动被记录并追踪其对运营的影响。' },
        { title: '计划与对比', copy: '班次、时段、情景与月度计划进展，同一语言呈现。' },
      ],
    },
    preview: {
      eyebrow: '运营驾驶舱',
      title: '首个屏幕回答：发生了什么、现在该做什么。',
      ariaReadings: '可用读数',
      readings: [
        '产量、目标与预测',
        '装载与卡车在背景中',
        '排序后的风险与建议',
      ],
      evidenceAria: 'Decision Cockpit 读数概念图；并非产品截图',
      briefLabel: '读数示意图',
      briefTitle: '从班次状态到可验证的行动。',
      briefBody: '概念性示意。真实截图将在验证最新演示构建后加入。',
      trace: [
        { label: '状态', value: '产量与目标' },
        { label: '差距', value: '预测与节奏' },
        { label: '原因', value: '卡车、装载与风险' },
        { label: '行动', value: '建议与证据' },
      ],
      figcaption: '概念示意图，非产品截图。真实截图待补充。',
      equipmentAria: 'NORTHMINE 中呈现的设备',
      equipmentTruckTitle: '卡车',
      equipmentTruckSub: '状态、循环、作业面与目的地',
      equipmentScene: '原创合成场景',
      equipmentShovelTitle: '装载',
      equipmentShovelSub: '绩效、排队、操作员与告警',
      equipmentTitle: '每台设备都保留其运营背景。',
      equipmentBody: '选择电铲或卡车即可查看其详情而不脱离班次：可用性、循环、来源、目的地、告警与建议始终关联同一设备。',
      equipmentFacts: [
        { label: '可用性', value: '状态与最近活动' },
        { label: '移动', value: '循环、吨位与路线' },
        { label: '决策', value: '告警、优先级与行动' },
      ],
      mapEyebrow: '3D 运营地图',
      mapTitle: '矿山几何结构作为运营背景。',
      mapBody: '地图将模块、决策与数据源关联到基于 DXF 几何的 3D 场景上。在私有集成中，几何可来自真实运营；本演示所示数值均为合成数据。',
      mapNote: 'DXF 与空间关系，不暴露私有运营数据。',
      mapAria: '合成正射影像，带由 NORTHMINE 内置 pit-shell 几何导出的演示 DXF 图层',
      mapLegendTitle: '矿坑几何 + 正射影像',
      mapLegendSub: '4,823 条折线 / 合成视觉参考',
      mapFigcaption: '原创合成正射影像，图层源自 pit-shell.json。不代表真实矿场或运营数据。',
    },
    disclosure: {
      eyebrow: '环境诚实',
      title: '此演示包含什么',
      body: '目标是评估体验、模块间的关系，以及 NORTHMINE 如何组织一项决策。',
      items: [
        { title: '合成数据', copy: '为展示流程与可视化而生成的代表性数值。' },
        { title: '无真实凭据', copy: '公共环境不包含 SQL 凭据，也无法访问生产系统。' },
        { title: '私有集成', copy: '连接器与运营数据源在受控环境中配置。' },
      ],
      securityTitle: '受控访问，不混淆环境。',
      securityPrinciples: [
        '受保护的角色与访问',
        '行动审计',
        '分离的私有集成',
      ],
    },
    finalCta: {
      title: '申请 NORTHMINE 演示',
      body: '告诉我们您需要评估什么。申请将在开通互动环境的个人访问之前进行审核。',
      cta: '申请访问',
      acceso: '我已获得访问',
    },
    requestPage: {
      metaTitle: '申请演示访问 | NORTHMINE Intelligence',
      metaDescription: '申请访问 NORTHMINE Intelligence 使用合成运营数据的互动演示。',
      eyebrow: '访问申请',
      title: '在受控环境中评估 NORTHMINE。',
      body: '填写表单，以便我们了解您的背景并开通合适的访问权限。我们不会索取凭据或敏感运营信息。',
      facts: [
        { label: '环境', value: '使用合成数据的演示' },
        { label: '审核', value: '开通前人工审核' },
        { label: '集成', value: '仅限私有环境' },
      ],
      stepLabel: '单一步骤',
      formTitle: '演示所需信息',
      formHint: '带 * 的字段为必填项。',
    },
    requestForm: {
      countries: ['阿根廷', '澳大利亚', '玻利维亚', '巴西', '加拿大', '智利', '哥伦比亚', '厄瓜多尔', '美国', '墨西哥', '秘鲁', '南非', '其他'],
      summaryError: '无法发送申请',
      summaryFields: '请检查标出的字段',
      contactLegend: '联系方式',
      contactHint: '我们仅将此信息用于审核您的演示申请。',
      firstName: '名字',
      lastName: '姓氏',
      email: '邮箱',
      phone: '电话',
      optional: '可选',
      professionalLegend: '职业背景',
      professionalHint: '请勿索取或填写凭据、服务器或机密生产数据。',
      company: '公司',
      role: '职务或职能',
      country: '国家/地区',
      selectCountry: '选择国家/地区',
      operationType: '运营类型',
      operationOptions: ['未指定', '露天开采', '地下开采', '矿业服务', '技术与集成', '其他'],
      fleetSize: '大致车队规模',
      fleetOptions: ['未指定', '1-10 台', '11-30 台', '31-75 台', '76-150 台', '150 台以上'],
      interestsLegend: '您需要评估什么',
      interestsHint: '请选择一项或多项能力。',
      additionalLegend: '补充背景',
      message: '留言',
      messageHelp: '请描述您想查看的流程或模块。请勿包含机密信息。',
      honeypot: '网站。请留空此字段。',
      consentBefore: '我同意将这些数据用于审核和回复我的演示申请。',
      consentAfter: '请参阅',
      consentLink: '隐私政策',
      privacyLink: '/privacy',
      submitHint: '申请将被审核。提交不会创建账户，也不保证立即获批。',
      submitLabel: '发送申请',
      submitting: '正在发送申请',
      liveSubmitting: '正在发送申请，请勿关闭本页。',
      errFirstName: '请输入至少 2 个字符的名字。',
      errLastName: '请输入至少 2 个字符的姓氏。',
      errEmail: '请输入有效的邮箱地址。',
      errCompany: '请输入公司名称。',
      errRole: '请填写您的职务或职能。',
      errCountry: '请选择一个国家/地区。',
      errInterests: '请至少选择一项兴趣。',
      errConsent: '您必须同意对这些数据的处理。',
      errMessageLen: '留言不能超过 1200 个字符。',
      errPhoneLen: '电话号码不能超过 40 个字符。',
      errGeneric: '无法发送申请。请检查网络后重试。',
      errApi429: '已到达临时申请上限，请稍后重试。',
      errApi422: 'API 拒绝了一个或多个字段，请检查输入的数据。',
      errApi503: '申请服务暂时不可用。您的数据未被保存，请稍后重试。',
      errApi500: '申请服务当前不可用。',
    },
    success: {
      metaTitle: '申请已收到 | NORTHMINE Intelligence',
      metaDescription: '确认您的 NORTHMINE Intelligence 演示访问申请。',
      eyebrow: '申请已收到',
      title: '谢谢。我们将审核您发送的信息。',
      body: '提交不会自动创建凭据。如申请获批，我们将通过约定渠道发送访问说明。',
      reference: '参考编号',
      back: '返回 NORTHMINE',
      acceso: '我已获得访问',
    },
    privacy: {
      metaTitle: '演示申请隐私 | NORTHMINE Intelligence',
      metaDescription: '关于申请 NORTHMINE 演示时提交的数据如何使用的信息。',
      eyebrow: '隐私',
      title: '演示申请',
      version: '信息版：2026 年 7 月 31 日。',
      ariaIndex: '隐私内容',
      index: [
        '索取的信息',
        '信息用途',
        '请勿发送的内容',
        '环境隔离',
        '保留期限',
        '待办事项',
      ],
      sections: [
        { heading: '索取哪些信息', body: '名字、姓氏、邮箱、公司、职务、国家/地区、兴趣与同意。电话、运营类型、车队规模与留言为可选项。' },
        { heading: '用于何种目的', body: '用于审核申请、了解评估背景、决定是否开通访问，以及协调 NORTHMINE 演示。' },
        { heading: '请勿发送的内容', body: '我们不索取，您也不应发送密码、SQL 凭据、私有 IP 地址、服务器名称、文件或机密运营数据。' },
        { heading: '环境隔离', body: '申请与运营数据及产品账户分开保存。公共演示使用合成信息，不连接真实生产数据库。' },
        { heading: '保留与删除', body: '确切的保留期限与永久删除程序须由控制方在商业发布前确定。本演示处于评估期间，请勿发送敏感或机密信息。' },
        { heading: '待解决的隐私事项', body: '在最终商业发布前，所有者须在此公布其法律身份、常设的隐私请求渠道、保留期限以及删除或匿名化程序。本演示不声称已获认证合规，也不声称具备未经核实的司法管辖权。' },
      ],
    },
    login: {
      back: '返回 NORTHMINE Intelligence',
      disclosure: '带合成数据的公共演示。个人访问，需审核。',
    },
    meta: {
      home: {
        title: 'NORTHMINE Intelligence | 矿业运营控制',
        description: '面向露天矿的运营控制与决策。申请访问使用合成数据的 NORTHMINE 互动演示。',
      },
      access: {
        title: '演示访问 | NORTHMINE Intelligence',
        description: '受保护的 NORTHMINE Intelligence 互动演示访问。',
      },
    },
  },
  ar: {
    switcherAria: 'تغيير اللغة',
    landingHeader: {
      skip: 'تخطي إلى المحتوى',
      nav: { capacidades: 'القدرات', flujo: 'كيف يعمل', demo: 'العرض' },
      status: 'عرض عام',
      accesoTengo: 'لديّ وصول بالفعل',
      cta: 'طلب الوصول',
      ariaNav: 'التنقل الرئيسي',
      ariaAbrir: 'فتح التنقل',
      ariaCerrar: 'إغلاق التنقل',
      ariaBrand: 'NORTHMINE Intelligence، الرئيسية',
      brandAlt: 'مركز NORTHMINE Intelligence',
    },
    landingFooter: {
      tagline: 'تحكم تشغيلي وقرار للتعدين المكشوف.',
      ariaNav: 'روابط التذييل',
      navPrivacidad: 'الخصوصية',
      navSolicitar: 'طلب الوصول',
      navAcceso: 'الوصول للعرض',
      status: 'عرض ببيانات اصطناعية',
      ariaBrand: 'NORTHMINE Intelligence، الرئيسية',
    },
    hero: {
      eyebrow: 'طبقات القرار',
      title: 'NORTHMINE Intelligence',
      positioning: 'تحكم تشغيلي للتعدين المكشوف.',
      lead: 'يجمع الإنتاج والأسطول والتحميل والمخاطر لتحويل فجوة الوردية إلى إجراء واضح وقابل للتتبع.',
      ctaDemo: 'طلب الوصول للعرض',
      ctaExplorar: 'استكشف القدرات',
      disclosure: 'صورة وبيانات اصطناعية. الوصول يُراجَع يدوياً.',
      ariaFacts: 'نطاق العرض',
      facts: [
        { label: 'بيانات البيئة', value: 'اصطناعية وتمثيلية' },
        { label: 'التدفق', value: 'الحالة والفجوة والسبب والإجراء' },
        { label: 'الوصول', value: 'مراجعة وتفعيل يدوي' },
      ],
    },
    story: {
      title: 'المعلومات موجودة، لكن القرار ما زال مجزّأً.',
      body: 'عندما لا تتبادل الإنتاج والأسطول والصيانة السياق، تُكتشف الفجوة متأخراً ويصعب ربط إجراء بنتيجته.',
      aria: 'مصادر تشغيلية موحدة',
      signals: [
        { title: 'الإنتاج', copy: 'الهدف والتقدم والتوقعات في مصادر منفصلة.' },
        { title: 'التوزيع', copy: 'دورات وتكليفات دون قراءة موحدة للوردية.' },
        { title: 'الصيانة', copy: 'توافر دون سياق عن الأثر التشغيلي.' },
        { title: 'المخاطر', copy: 'تنبيهات تصل متأخرة إلى القرار.' },
      ],
      resultLabel: 'قراءة موحدة',
      resultTitle: 'الحالة والفجوة والوتيرة والإجراء',
      resultCopy: 'قرار مدعوم بأدلة تشغيلية وقابلية تتبع.',
    },
    capabilities: {
      eyebrow: 'القدرات',
      title: 'من الحالة التشغيلية إلى إجراء قابل للتحقق.',
      body: 'ينظم NORTHMINE الوردية كتسلسل قراءة. تعطي الواجهة الأولوية للقرار وتُبقي التفاصيل متاحة للتحقيق في السبب.',
      stages: [
        { title: 'حالة الوردية', copy: 'الإنتاج التراكمي والالتزام والتوقعات وجودة البيانات.' },
        { title: 'الفجوة والوتيرة المطلوبة', copy: 'ما ينقص لإتمام الوردية والوتيرة اللازمة لتعويضها.' },
        { title: 'المعدات والأسباب', copy: 'الشاحنات والتحميل والدورات والتوافر والوجوه المرتبطة بالفجوة.' },
        { title: 'المخاطر والتوصية', copy: 'الأولوية والثقة والأثر المتوقع وشروط التنفيذ.' },
        { title: 'القرار والنتيجة', copy: 'إجراء مسجل ومتابعة أثره على العملية.' },
        { title: 'التخطيط والمقارنة', copy: 'الورديات والفترات والسيناريوهات وتقدم الخطة الشهرية بلغة واحدة.' },
      ],
    },
    preview: {
      eyebrow: 'الكوكبيت التشغيلي',
      title: 'أول شاشة تجيب: ماذا يحدث وماذا تفعل الآن.',
      ariaReadings: 'قراءات متاحة',
      readings: [
        'الإنتاج والهدف والتوقعات',
        'التحميل والشاحنات في السياق',
        'مخاطر وتوصية مرتّبة بالأولوية',
      ],
      evidenceAria: 'مخطط توضيحي لقراءة Decision Cockpit؛ ليس لقطة للمنتج',
      briefLabel: 'مخطط القراءة',
      briefTitle: 'من حالة الوردية إلى إجراء قابل للتحقق.',
      briefBody: 'تمثيل مفاهيمي. ستُضاف اللقطة الحقيقية بعد التحقق من آخر بناء للعرض.',
      trace: [
        { label: 'الحالة', value: 'الإنتاج والهدف' },
        { label: 'الفجوة', value: 'التوقعات والوتيرة' },
        { label: 'السبب', value: 'الشاحنات والتحميل والمخاطر' },
        { label: 'الإجراء', value: 'التوصية والأدلة' },
      ],
      figcaption: 'مخطط مفاهيمي، وليس لقطة للمنتج. اللقطة الحقيقية قيد الانتظار.',
      equipmentAria: 'معدات ممثلة في NORTHMINE',
      equipmentTruckTitle: 'الشاحنة',
      equipmentTruckSub: 'الحالة والدورات والوجه والوجهة',
      equipmentScene: 'مشهد اصطناعي أصلي',
      equipmentShovelTitle: 'التحميل',
      equipmentShovelSub: 'الأداء والطابور والمشغل والتنبيهات',
      equipmentTitle: 'كل وحدة تحتفظ بسياقها التشغيلي.',
      equipmentBody: 'اختيار مجرفة أو شاحنة يفتح تفاصيلها دون فقدان الوردية: التوافر والدورات والمصدر والوجهة والتنبيهات والتوصية تظل مرتبطة بنفس المعدة.',
      equipmentFacts: [
        { label: 'التوافر', value: 'الحالة وآخر نشاط' },
        { label: 'الحركة', value: 'الدورات والحمولة والمسار' },
        { label: 'القرار', value: 'التنبيه والأولوية والإجراء' },
      ],
      mapEyebrow: 'الخريطة التشغيلية 3D',
      mapTitle: 'هندسة المنجم كسياق للعملية.',
      mapBody: 'تربط الخريطة الوحدات والقرارات والمصادر على مشهد ثلاثي الأبعاد مبني على هندسة DXF. في التكامل الخاص قد تأتي الهندسة من العملية الحقيقية، أما القيم المعروضة في هذا العرض فهي اصطناعية.',
      mapNote: 'DXF والعلاقات المكانية دون كشف بيانات تشغيلية خاصة.',
      mapAria: 'صورة جوية اصطناعية بطبقة DXF توضيحية مشتقة من هندسة قشرة الحفرة المضمنة في NORTHMINE',
      mapLegendTitle: 'هندسة الحفرة + صورة جوية',
      mapLegendSub: '4,823 خطاً متعدداً / مرجع بصري اصطناعي',
      mapFigcaption: 'صورة جوية اصطناعية أصلية بطبقة مشتقة من pit-shell.json. لا تمثل منجماً ولا بيانات تشغيلية حقيقية.',
    },
    disclosure: {
      eyebrow: 'صدق البيئة',
      title: 'ماذا يحتوي هذا العرض',
      body: 'الهدف هو تقييم التجربة والعلاقات بين الوحدات وطريقة تنظيم NORTHMINE للقرار.',
      items: [
        { title: 'بيانات اصطناعية', copy: 'قيم تمثيلية أُنشئت لإظهار التدفقات والتصورات.' },
        { title: 'بدون بيانات اعتماد حقيقية', copy: 'البيئة العامة لا تحتوي مفاتيح SQL ولا وصولاً إلى أنظمة الإنتاج.' },
        { title: 'تكامل خاص', copy: 'الموصلات والمصادر التشغيلية تُهيأ في بيئات محكومة.' },
      ],
      securityTitle: 'وصول محكوم دون خلط البيئات.',
      securityPrinciples: [
        'أدوار ووصول محمي',
        'تدقيق الإجراءات',
        'تكاملات خاصة منفصلة',
      ],
    },
    finalCta: {
      title: 'اطلب عرضاً توضيحياً من NORTHMINE',
      body: 'أخبرنا بما تحتاج لتقييمه. تُراجَع الطلبات قبل تفعيل وصول فردي إلى البيئة التفاعلية.',
      cta: 'طلب الوصول',
      acceso: 'لديّ وصول بالفعل',
    },
    requestPage: {
      metaTitle: 'طلب الوصول للعرض | NORTHMINE Intelligence',
      metaDescription: 'اطلب وصولاً محكوماً إلى عرض NORTHMINE Intelligence التفاعلي ببيانات تشغيلية اصطناعية.',
      eyebrow: 'طلب الوصول',
      title: 'قيّم NORTHMINE في بيئة محكومة.',
      body: 'أكمل النموذج لنراجع سياقك ونفعّل الوصول المناسب. لا تُطلب بيانات اعتماد ولا معلومات تشغيلية حساسة.',
      facts: [
        { label: 'البيئة', value: 'عرض ببيانات اصطناعية' },
        { label: 'المراجعة', value: 'يدوية قبل التفعيل' },
        { label: 'التكاملات', value: 'متاحة في البيئات الخاصة فقط' },
      ],
      stepLabel: 'خطوة واحدة',
      formTitle: 'معلومات العرض التوضيحي',
      formHint: 'الحقول المعلَّمة بـ * إلزامية.',
    },
    requestForm: {
      countries: ['الأرجنتين', 'أستراليا', 'بوليفيا', 'البرازيل', 'كندا', 'تشيلي', 'كولومبيا', 'الإكوادور', 'الولايات المتحدة', 'المكسيك', 'بيرو', 'جنوب أفريقيا', 'أخرى'],
      summaryError: 'تعذّر إرسال الطلب',
      summaryFields: 'راجع الحقول المحددة',
      contactLegend: 'بيانات الاتصال',
      contactHint: 'سنستخدم هذه المعلومات حصرياً لمراجعة طلب العرض الخاص بك.',
      firstName: 'الاسم الأول',
      lastName: 'اسم العائلة',
      email: 'البريد الإلكتروني',
      phone: 'الهاتف',
      optional: 'اختياري',
      professionalLegend: 'السياق المهني',
      professionalHint: 'لا تطلب ولا تُدرج بيانات اعتماد أو خوادم أو بيانات إنتاج سرية.',
      company: 'الشركة',
      role: 'المنصب أو الوظيفة',
      country: 'الدولة',
      selectCountry: 'اختر دولة',
      operationType: 'نوع العملية',
      operationOptions: ['غير محدد', 'تعدين مكشوف', 'تعدين تحت الأرض', 'خدمات تعدين', 'تكنولوجيا وتكامل', 'أخرى'],
      fleetSize: 'حجم الأسطول التقريبي',
      fleetOptions: ['غير محدد', '1-10 وحدات', '11-30 وحدة', '31-75 وحدة', '76-150 وحدة', 'أكثر من 150 وحدة'],
      interestsLegend: 'ما تحتاج لتقييمه',
      interestsHint: 'اختر قدرة أو أكثر.',
      additionalLegend: 'سياق إضافي',
      message: 'رسالة',
      messageHelp: 'صف التدفق أو الوحدة التي ترغب في مراجعتها. لا تُدرج معلومات سرية.',
      honeypot: 'موقع إلكتروني. اترك هذا الحقل فارغاً.',
      consentBefore: 'أوافق على استخدام هذه البيانات لمراجعة طلب العرض والرد عليه.',
      consentAfter: 'راجع',
      consentLink: 'سياسة الخصوصية',
      privacyLink: '/privacy',
      submitHint: 'سيراجع فريقنا الطلب. الإرسال لا ينشئ حساباً ولا يضمن موافقة فورية.',
      submitLabel: 'إرسال الطلب',
      submitting: 'جارٍ الإرسال',
      liveSubmitting: 'جارٍ إرسال الطلب. لا تغلق هذه الصفحة.',
      errFirstName: 'أدخل اسماً أول من حرفين على الأقل.',
      errLastName: 'أدخل اسم عائلة من حرفين على الأقل.',
      errEmail: 'أدخل بريداً إلكترونياً صحيحاً.',
      errCompany: 'أدخل اسم الشركة.',
      errRole: 'حدد منصبك أو وظيفتك.',
      errCountry: 'اختر دولة.',
      errInterests: 'اختر اهتماماً واحداً على الأقل.',
      errConsent: 'يجب أن توافق على معالجة هذه البيانات.',
      errMessageLen: 'لا يمكن أن تتجاوز الرسالة 1200 حرف.',
      errPhoneLen: 'لا يمكن أن يتجاوز رقم الهاتف 40 حرفاً.',
      errGeneric: 'تعذّر إرسال الطلب. تحقق من اتصالك وحاول مجدداً.',
      errApi429: 'تم بلوغ الحد المؤقت للطلبات. حاول لاحقاً.',
      errApi422: 'رفضت الواجهة حقلاً أو أكثر. راجع البيانات المدخلة.',
      errApi503: 'الطلبات غير متاحة مؤقتاً. لم تُحفظ بياناتك؛ حاول لاحقاً.',
      errApi500: 'خدمة الطلبات غير متاحة حالياً.',
    },
    success: {
      metaTitle: 'تم استلام الطلب | NORTHMINE Intelligence',
      metaDescription: 'تأكيد استلام طلب الوصول إلى عرض NORTHMINE Intelligence.',
      eyebrow: 'تم استلام الطلب',
      title: 'شكراً لك. سنراجع المعلومات المرسلة.',
      body: 'الإرسال لا ينشئ بيانات اعتماد تلقائياً. إذا تمت الموافقة، ستتلقى تعليمات الوصول عبر قناة متفق عليها.',
      reference: 'المرجع',
      back: 'العودة إلى NORTHMINE',
      acceso: 'لديّ وصول بالفعل',
    },
    privacy: {
      metaTitle: 'خصوصية طلبات العرض | NORTHMINE Intelligence',
      metaDescription: 'معلومات حول استخدام البيانات المرسلة لطلب عرض توضيحي من NORTHMINE.',
      eyebrow: 'الخصوصية',
      title: 'طلبات العرض التوضيحي',
      version: 'نسخة معلوماتية: 31 يوليو 2026.',
      ariaIndex: 'محتوى الخصوصية',
      index: [
        'المعلومات المطلوبة',
        'استخدام المعلومات',
        'ما لا يجب إرساله',
        'فصل البيئات',
        'الاحتفاظ',
        'النقاط المعلقة',
      ],
      sections: [
        { heading: 'ما المعلومات المطلوبة', body: 'الاسم الأول واسم العائلة والبريد والشركة والمنصب والدولة والاهتمامات والموافقة. الهاتف ونوع العملية وحجم الأسطول والرسالة اختيارية.' },
        { heading: 'لأي غرض تُستخدم', body: 'لمراجعة الطلب وفهم سياق التقييم وتحديد ما إذا كان الوصول مناسباً والتنسيق لعرض توضيحي من NORTHMINE.' },
        { heading: 'ما لا يجب إرساله', body: 'لا نطلب ولا يجب أن ترسل كلمات مرور أو بيانات اعتماد SQL أو عناوين IP خاصة أو أسماء خوادم أو ملفات أو بيانات تشغيلية سرية.' },
        { heading: 'فصل البيئات', body: 'تُحفظ الطلبات منفصلة عن البيانات التشغيلية وعن حسابات المنتج. يستخدم العرض العام معلومات اصطناعية وغير متصل بقواعد بيانات إنتاج حقيقية.' },
        { heading: 'الاحتفاظ والحذف', body: 'يجب أن يحدد المسؤول المدة الدقيقة للاحتفاظ وإجراء الحذف الدائم قبل الإطلاق التجاري. ما دام هذا العرض قيد التقييم، لا ترسل معلومات حساسة أو سرية.' },
        { heading: 'عوائق الخصوصية المعلقة', body: 'قبل الإطلاق التجاري النهائي، يجب على المالك نشر هويته القانونية وقناة دائمة لطلبات الخصوصية ومدة الاحتفاظ وإجراء الحذف أو إخفاء الهوية. لا يدّعي هذا العرض الامتثال المعتمد ولا ولاية قانونية غير مُتحقق منها.' },
      ],
    },
    login: {
      back: 'العودة إلى NORTHMINE Intelligence',
      disclosure: 'عرض عام ببيانات اصطناعية. وصول فردي يُراجَع.',
    },
    meta: {
      home: {
        title: 'NORTHMINE Intelligence | تحكم تشغيلي تعديني',
        description: 'تحكم تشغيلي وقرار للتعدين المكشوف. اطلب الوصول إلى عرض NORTHMINE التفاعلي ببيانات اصطناعية.',
      },
      access: {
        title: 'الوصول للعرض | NORTHMINE Intelligence',
        description: 'وصول محمي إلى عرض NORTHMINE Intelligence التفاعلي.',
      },
    },
  },
  ru: {
    switcherAria: 'Сменить язык',
    landingHeader: {
      skip: 'Перейти к содержимому',
      nav: { capacidades: 'Возможности', flujo: 'Как это работает', demo: 'Демо' },
      status: 'Публичное демо',
      accesoTengo: 'У меня уже есть доступ',
      cta: 'Запросить доступ',
      ariaNav: 'Основная навигация',
      ariaAbrir: 'Открыть навигацию',
      ariaCerrar: 'Закрыть навигацию',
      ariaBrand: 'NORTHMINE Intelligence, главная',
      brandAlt: 'Центр NORTHMINE Intelligence',
    },
    landingFooter: {
      tagline: 'Операционный контроль и решения для открытых горных работ.',
      ariaNav: 'Ссылки подвала',
      navPrivacidad: 'Конфиденциальность',
      navSolicitar: 'Запросить доступ',
      navAcceso: 'Доступ к демо',
      status: 'Демо с синтетическими данными',
      ariaBrand: 'NORTHMINE Intelligence, главная',
    },
    hero: {
      eyebrow: 'Уровни решений',
      title: 'NORTHMINE Intelligence',
      positioning: 'Операционный контроль для открытых горных работ.',
      lead: 'Объединяет производство, флот, погрузку и риски, превращая разрыв смены в объяснимое и прослеживаемое действие.',
      ctaDemo: 'Запросить доступ к демо',
      ctaExplorar: 'Изучить возможности',
      disclosure: 'Синтетические изображения и данные. Доступ проверяется вручную.',
      ariaFacts: 'Охват демо',
      facts: [
        { label: 'Данные среды', value: 'Синтетические и репрезентативные' },
        { label: 'Поток', value: 'Состояние, разрыв, причина и действие' },
        { label: 'Доступ', value: 'Ручная проверка и активация' },
      ],
    },
    story: {
      title: 'Информация есть. Решения всё ещё разрозненны.',
      body: 'Когда производство, флот и обслуживание не делятся контекстом, разрыв замечается поздно и трудно связать действие с его результатом.',
      aria: 'Консолидированные операционные источники',
      signals: [
        { title: 'Производство', copy: 'Цель, прогресс и прогноз в раздельных источниках.' },
        { title: 'Диспетчеризация', copy: 'Циклы и назначения без общей картины смены.' },
        { title: 'Обслуживание', copy: 'Доступность без контекста операционного влияния.' },
        { title: 'Риск', copy: 'Оповещения, поступающие к решению слишком поздно.' },
      ],
      resultLabel: 'Общая картина',
      resultTitle: 'Состояние, разрыв, темп и действие',
      resultCopy: 'Решение, подкреплённое операционными доказательствами и прослеживаемостью.',
    },
    capabilities: {
      eyebrow: 'Возможности',
      title: 'От операционного состояния к проверяемому действию.',
      body: 'NORTHMINE организует смену как последовательность чтения. Интерфейс ставит решение на первое место, сохраняя детали для выяснения причины.',
      stages: [
        { title: 'Состояние смены', copy: 'Накопленное производство, соответствие, прогноз и качество данных.' },
        { title: 'Разрыв и требуемый темп', copy: 'Чего не хватает для завершения смены и какой темп нужен для её восстановления.' },
        { title: 'Оборудование и причины', copy: 'Самосвалы, погрузка, циклы, доступность и забои, связанные с разрывом.' },
        { title: 'Риск и рекомендация', copy: 'Приоритет, уверенность, ожидаемый эффект и условия для выполнения.' },
        { title: 'Решение и результат', copy: 'Зафиксированное действие и отслеживание его влияния на операцию.' },
        { title: 'Планирование и сравнение', copy: 'Смены, периоды, сценарии и прогресс месячного плана на одном языке.' },
      ],
    },
    preview: {
      eyebrow: 'Операционный кокпит',
      title: 'Первый экран отвечает, что происходит и что делать сейчас.',
      ariaReadings: 'Доступные показатели',
      readings: [
        'Производство, цель и прогноз',
        'Погрузка и самосвалы в контексте',
        'Приоритизированный риск и рекомендация',
      ],
      evidenceAria: 'Концептуальная схема чтения Decision Cockpit; не снимок продукта',
      briefLabel: 'Схема чтения',
      briefTitle: 'От состояния смены к проверяемому действию.',
      briefBody: 'Концептуальное представление. Реальный снимок будет добавлен после проверки последней сборки демо.',
      trace: [
        { label: 'Состояние', value: 'Производство и цель' },
        { label: 'Разрыв', value: 'Прогноз и темп' },
        { label: 'Причина', value: 'Самосвалы, погрузка и риск' },
        { label: 'Действие', value: 'Рекомендация и доказательства' },
      ],
      figcaption: 'Концептуальная схема, не снимок продукта. Реальный снимок ожидается.',
      equipmentAria: 'Оборудование, представленное в NORTHMINE',
      equipmentTruckTitle: 'Самосвал',
      equipmentTruckSub: 'Состояние, циклы, забой и назначение',
      equipmentScene: 'Оригинальная синтетическая сцена',
      equipmentShovelTitle: 'Погрузка',
      equipmentShovelSub: 'Производительность, очередь, оператор и оповещения',
      equipmentTitle: 'Каждая единица сохраняет свой операционный контекст.',
      equipmentBody: 'Выбор экскаватора или самосвала открывает детали, не теряя смену: доступность, циклы, источник, назначение, оповещения и рекомендация остаются связанными с той же единицей.',
      equipmentFacts: [
        { label: 'Доступность', value: 'Состояние и последняя активность' },
        { label: 'Движение', value: 'Циклы, тоннаж и маршрут' },
        { label: 'Решение', value: 'Оповещение, приоритет и действие' },
      ],
      mapEyebrow: '3D-карта операций',
      mapTitle: 'Геометрия рудника как контекст операции.',
      mapBody: 'Карта связывает модули, решения и источники на 3D-сцене на основе геометрии DXF. В частной интеграции геометрия может поступать из реальной операции; значения, показанные в этом демо, синтетические.',
      mapNote: 'DXF и пространственные связи без раскрытия частных операционных данных.',
      mapAria: 'Синтетический ортофотоплан с демо-слоем DXF, полученным из геометрии pit-shell, включённой в NORTHMINE',
      mapLegendTitle: 'Геометрия карьера + ортофотоплан',
      mapLegendSub: '4 823 полилинии / синтетическая визуальная справка',
      mapFigcaption: 'Оригинальный синтетический ортофотоплан со слоем из pit-shell.json. Не представляет реальный рудник или операционные данные.',
    },
    disclosure: {
      eyebrow: 'Честность среды',
      title: 'Что содержит это демо',
      body: 'Цель — оценить опыт, связи между модулями и то, как NORTHMINE выстраивает решение.',
      items: [
        { title: 'Синтетические данные', copy: 'Репрезентативные значения, созданные для демонстрации потоков и визуализаций.' },
        { title: 'Без реальных учётных данных', copy: 'Публичная среда не содержит ключей SQL и доступа к производственным системам.' },
        { title: 'Частная интеграция', copy: 'Коннекторы и операционные источники настраиваются в контролируемых средах.' },
      ],
      securityTitle: 'Контролируемый доступ без смешивания сред.',
      securityPrinciples: [
        'Защищённые роли и доступ',
        'Аудит действий',
        'Раздельные частные интеграции',
      ],
    },
    finalCta: {
      title: 'Запросите демонстрацию NORTHMINE',
      body: 'Расскажите, что вам нужно оценить. Заявки проверяются перед активацией индивидуального доступа к интерактивной среде.',
      cta: 'Запросить доступ',
      acceso: 'У меня уже есть доступ',
    },
    requestPage: {
      metaTitle: 'Запросить доступ к демо | NORTHMINE Intelligence',
      metaDescription: 'Запросите контролируемый доступ к интерактивному демо NORTHMINE Intelligence с синтетическими операционными данными.',
      eyebrow: 'Запрос доступа',
      title: 'Оцените NORTHMINE в контролируемой среде.',
      body: 'Заполните форму, чтобы мы изучили ваш контекст и активировали подходящий доступ. Учётные данные и чувствительная операционная информация не запрашиваются.',
      facts: [
        { label: 'Среда', value: 'Демо с синтетическими данными' },
        { label: 'Проверка', value: 'Вручную, до активации доступа' },
        { label: 'Интеграции', value: 'Доступны только в частных средах' },
      ],
      stepLabel: 'Один шаг',
      formTitle: 'Информация для демонстрации',
      formHint: 'Поля, отмеченные *, обязательны.',
    },
    requestForm: {
      countries: ['Аргентина', 'Австралия', 'Боливия', 'Бразилия', 'Канада', 'Чили', 'Колумбия', 'Эквадор', 'США', 'Мексика', 'Перу', 'ЮАР', 'Другая'],
      summaryError: 'Не удалось отправить запрос',
      summaryFields: 'Проверьте выделенные поля',
      contactLegend: 'Контактные данные',
      contactHint: 'Мы используем эту информацию только для проверки вашего запроса на демонстрацию.',
      firstName: 'Имя',
      lastName: 'Фамилия',
      email: 'Эл. почта',
      phone: 'Телефон',
      optional: 'необязательно',
      professionalLegend: 'Профессиональный контекст',
      professionalHint: 'Не запрашивайте и не указывайте учётные данные, серверы или конфиденциальные производственные данные.',
      company: 'Компания',
      role: 'Должность или функция',
      country: 'Страна',
      selectCountry: 'Выберите страну',
      operationType: 'Тип операции',
      operationOptions: ['Не указано', 'Открытые горные работы', 'Подземная добыча', 'Горнодобывающие услуги', 'Технологии и интеграция', 'Другое'],
      fleetSize: 'Примерный размер парка',
      fleetOptions: ['Не указано', '1-10 единиц', '11-30 единиц', '31-75 единиц', '76-150 единиц', 'Более 150 единиц'],
      interestsLegend: 'Что вам нужно оценить',
      interestsHint: 'Выберите одну или несколько возможностей.',
      additionalLegend: 'Дополнительный контекст',
      message: 'Сообщение',
      messageHelp: 'Опишите поток или модуль, который хотите посмотреть. Не указывайте конфиденциальную информацию.',
      honeypot: 'Веб-сайт. Оставьте это поле пустым.',
      consentBefore: 'Я согласен на использование этих данных для проверки и ответа на мой запрос о демонстрации.',
      consentAfter: 'См.',
      consentLink: 'политику конфиденциальности',
      privacyLink: '/privacy',
      submitHint: 'Запрос будет проверен. Отправка не создаёт учётную запись и не гарантирует немедленного одобрения.',
      submitLabel: 'Отправить запрос',
      submitting: 'Отправка запроса',
      liveSubmitting: 'Отправка запроса. Не закрывайте эту страницу.',
      errFirstName: 'Введите имя не короче 2 символов.',
      errLastName: 'Введите фамилию не короче 2 символов.',
      errEmail: 'Введите корректный адрес эл. почты.',
      errCompany: 'Введите название компании.',
      errRole: 'Укажите вашу должность или функцию.',
      errCountry: 'Выберите страну.',
      errInterests: 'Выберите хотя бы один интерес.',
      errConsent: 'Вы должны согласиться на обработку этих данных.',
      errMessageLen: 'Сообщение не может превышать 1200 символов.',
      errPhoneLen: 'Номер телефона не может превышать 40 символов.',
      errGeneric: 'Не удалось отправить запрос. Проверьте соединение и попробуйте снова.',
      errApi429: 'Достигнут временный лимит запросов. Попробуйте позже.',
      errApi422: 'API отклонил одно или несколько полей. Проверьте введённые данные.',
      errApi503: 'Запросы временно недоступны. Ваши данные не сохранены; попробуйте позже.',
      errApi500: 'Служба запросов сейчас недоступна.',
    },
    success: {
      metaTitle: 'Запрос получен | NORTHMINE Intelligence',
      metaDescription: 'Подтверждение запроса на доступ к демо NORTHMINE Intelligence.',
      eyebrow: 'Запрос получен',
      title: 'Спасибо. Мы проверим отправленную информацию.',
      body: 'Отправка не создаёт учётные данные автоматически. При одобрении вы получите инструкции по доступу через согласованный канал.',
      reference: 'Ссылка',
      back: 'Вернуться к NORTHMINE',
      acceso: 'У меня уже есть доступ',
    },
    privacy: {
      metaTitle: 'Конфиденциальность демо-запросов | NORTHMINE Intelligence',
      metaDescription: 'Информация об использовании данных, отправляемых для запроса демонстрации NORTHMINE.',
      eyebrow: 'Конфиденциальность',
      title: 'Демонстрационные запросы',
      version: 'Информационная версия: 31 июля 2026 г.',
      ariaIndex: 'Содержание раздела конфиденциальности',
      index: [
        'Запрашиваемая информация',
        'Использование информации',
        'Что не нужно отправлять',
        'Разделение сред',
        'Хранение',
        'Нерешённые вопросы',
      ],
      sections: [
        { heading: 'Какая информация запрашивается', body: 'Имя, фамилия, эл. почта, компания, должность, страна, интересы и согласие. Телефон, тип операции, размер парка и сообщение необязательны.' },
        { heading: 'Для чего она используется', body: 'Для проверки запроса, понимания контекста оценки, решения об активации доступа и координации демонстрации NORTHMINE.' },
        { heading: 'Что не нужно отправлять', body: 'Мы не запрашиваем и вы не должны отправлять пароли, учётные данные SQL, частные IP-адреса, имена серверов, файлы или конфиденциальные операционные данные.' },
        { heading: 'Разделение сред', body: 'Запросы хранятся отдельно от операционных данных и учётных записей продукта. Публичное демо использует синтетическую информацию и не подключено к реальным производственным базам данных.' },
        { heading: 'Хранение и удаление', body: 'Точный срок хранения и процедура постоянного удаления должны быть определены ответственным лицом до коммерческого запуска. Пока это демо находится в оценке, не отправляйте чувствительную или конфиденциальную информацию.' },
        { heading: 'Нерешённые вопросы конфиденциальности', body: 'До окончательного коммерческого запуска владелец должен опубликовать здесь свою юридическую идентичность, постоянный канал для запросов о конфиденциальности, срок хранения и процедуру удаления или анонимизации. Это демо не заявляет о сертифицированном соответствии или непроверенной юрисдикции.' },
      ],
    },
    login: {
      back: 'Вернуться к NORTHMINE Intelligence',
      disclosure: 'Публичное демо с синтетическими данными. Индивидуальный проверяемый доступ.',
    },
    meta: {
      home: {
        title: 'NORTHMINE Intelligence | Операционный контроль в горной добыче',
        description: 'Операционный контроль и решения для открытых горных работ. Запросите доступ к интерактивному демо NORTHMINE с синтетическими данными.',
      },
      access: {
        title: 'Доступ к демо | NORTHMINE Intelligence',
        description: 'Защищённый доступ к интерактивному демо NORTHMINE Intelligence.',
      },
    },
  },
}
