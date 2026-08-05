import type { ModuleDict } from '../useModuleT'

export interface OriginChapterT {
  era: string
  title: string
  body: string[]
  quote: string
  alt: string
}

export interface OriginModuleT {
  category: string
  name: string
  description: string
  alt: string
}

export interface OriginT {
  header: {
    navOrigen: string
    navPreguntas: string
    navPlataforma: string
    acceder: string
    solicitarDemo: string
    ariaBrand: string
    ariaNav: string
  }
  hero: {
    kicker: string
    title1: string
    title2: string
    lead: string
    ctaHistoria: string
    ctaPlataforma: string
    proofLabel: string
    proofItems: string[]
    scroll: string
    ariaScroll: string
  }
  intro: {
    statement: string
    body: string
    aria: string
    items: string[]
  }
  thesis: { kicker: string; title: string }
  chaptersCaption: string
  chapters: Record<'chapter01' | 'chapter02' | 'chapter03', OriginChapterT>
  questions: {
    kicker: string
    title1: string
    title2: string
    items: string[]
  }
  formation: {
    kicker: string
    title: string
    body: string
    stages: { stage: string; meaning: string }[]
    result: { stage: string; meaning: string }
  }
  turning: {
    kicker: string
    title: string
    body: string
    aria: string
    equation: { value: string; label: string }[]
  }
  product: {
    kicker: string
    title1: string
    title2: string
    body: string
    alt: string
    figcaptionTitle: string
    figcaption: string
  }
  modules: Record<string, OriginModuleT>
  final: {
    kicker: string
    title: string
    body: string
    ctaDemo: string
    ctaAcceso: string
    brand: string
    founder: string
  }
  meta: { title: string; description: string }
}

export const originT: ModuleDict<OriginT> = {
  es: {
    header: {
      navOrigen: 'Origen',
      navPreguntas: 'Preguntas',
      navPlataforma: 'Plataforma',
      acceder: 'Acceder',
      solicitarDemo: 'Solicitar demo',
      ariaBrand: 'NORTHMINE, inicio',
      ariaNav: 'Navegación principal',
    },
    hero: {
      kicker: 'ORIGIN · THE MAKING OF NORTHMINE',
      title1: 'No comencé desarrollando software.',
      title2: 'Comencé moviendo mineral.',
      lead: 'Desde el año 2010 hasta hoy, un camino de aprendizaje desde lo más profundo de la minería —planta, rajo, despacho— hasta una plataforma de inteligencia operacional.',
      ctaHistoria: 'Comenzar historia',
      ctaPlataforma: 'Ver NORTHMINE',
      proofLabel: '15 años',
      proofItems: ['Operación', 'Datos', 'Software'],
      scroll: 'Desplázate',
      ariaScroll: 'Continuar hacia la historia',
    },
    intro: {
      statement: 'Construido desde la operación.',
      body: 'No desde una oficina ni una incubadora.',
      aria: 'Experiencias que forman NORTHMINE',
      items: ['PLANTA', 'RAJO', 'DESPACHO', 'INTELIGENCIA'],
    },
    thesis: {
      kicker: 'UNA TRAYECTORIA, UNA LECTURA',
      title: 'NorthMine es el resultado de haber vivido la minería desde múltiples perspectivas.',
    },
    chaptersCaption: 'EXPERIENCIA OPERACIONAL',
    chapters: {
      chapter01: {
        era: 'La primera línea',
        title: 'Donde todo comenzó.',
        body: [
          'Tenía 19 años cuando ingresé por primera vez a la minería. No llegué como ingeniero, analista ni desarrollador.',
          'Mi primera herramienta no fue un computador. Fue una pala. Comencé realizando limpieza industrial al interior de chancadores, molinos, espesadores y distintas áreas de una planta concentradora.',
        ],
        quote: 'Aquí no nació NORTHMINE. Aquí nació mi forma de entender la minería.',
        alt: 'Planta concentradora donde comenzó la experiencia operacional que dio origen a NORTHMINE',
      },
      chapter02: {
        era: 'El rajo',
        title: 'La operación en toda su magnitud.',
        body: [
          'Pasé del interior de la planta a operar equipos de carguío, bulldozers y excavadoras. Cada minuto, cada maniobra y cada espera impactaban directamente en la productividad.',
          'Operar un equipo enseña lo que ningún reporte puede mostrar: cada ciclo tiene una razón, cada detención un costo y cada decisión una consecuencia.',
        ],
        quote: 'La mirada cambió: de observar un equipo aislado a comprender una cadena interdependiente.',
        alt: 'Simón junto a un cargador frontal en una operación minera',
      },
      chapter03: {
        era: 'Despacho mina',
        title: 'Donde nacieron las preguntas.',
        body: [
          'Mientras estudiaba Ingeniería en Informática asumí el desafío de convertirme en Despachador Mina. Desde la sala de control debía coordinar operadores, mantenimiento, taller, planificación, topografía y sistemas FMS.',
          'El sistema mostraba información. La operación necesitaba respuestas inmediatas, comparables y comprensibles.',
        ],
        quote: 'Aquí no se mueve una sola roca. Pero aquí se decide cómo se moverán millones de toneladas.',
        alt: 'Simón en una sala de despacho minero rodeado de sistemas operacionales',
      },
    },
    questions: {
      kicker: '06 · PREGUNTAS APARENTEMENTE SIMPLES',
      title1: 'El sistema mostraba información.',
      title2: 'La operación necesitaba respuestas.',
      items: [
        '¿Cuál es el rendimiento real de la Pala 1?',
        '¿Por qué la Pala 2 produce menos?',
        '¿Cuánto llevábamos ayer a esta misma hora?',
        '¿Cuál fue la mejor hora del turno?',
        '¿Cuánto demora realmente el ciclo?',
        '¿Por qué no hay camiones en ese frente?',
      ],
    },
    formation: {
      kicker: '07 · CONSTRUIR LAS RESPUESTAS',
      title: 'No pensé en crear una empresa.',
      body: 'Pensé en reducir el tiempo entre una pregunta y una decisión.',
      stages: [
        { stage: 'PLANTA', meaning: 'Conocer el proceso' },
        { stage: 'RAJO', meaning: 'Entender la escala' },
        { stage: 'DESPACHO', meaning: 'Coordinar el sistema' },
        { stage: 'SQL', meaning: 'Extraer respuestas' },
        { stage: 'AUTOMATIZACIÓN', meaning: 'Reducir fricción' },
        { stage: 'IA', meaning: 'Reconocer patrones' },
      ],
      result: { stage: 'NORTHMINE', meaning: 'Integrar la visión' },
    },
    turning: {
      kicker: '08 · EL PUNTO DE INFLEXIÓN',
      title: 'Producir más no siempre significa generar más valor.',
      body: 'Una sola pregunta cambió el foco: ¿cuánto costó producir esas toneladas?',
      aria: 'Relación entre producción, costo y margen',
      equation: [
        { value: '+ t', label: 'Más producción' },
        { value: '+ USD', label: 'Mayor costo operacional' },
        { value: '− margen', label: 'Menor valor generado' },
      ],
    },
    product: {
      kicker: '09 · NORTHMINE INTELLIGENCE',
      title1: 'Antes veía equipos.',
      title2: 'Hoy veo relaciones.',
      body: 'NORTHMINE no nació para mostrar dashboards. Nació para conectar operación, costos, restricciones y decisiones en una misma lectura operacional.',
      alt: 'Decision Cockpit de NORTHMINE con datos sintéticos identificados',
      figcaptionTitle: 'Decision Cockpit',
      figcaption: 'La operación convertida en una lectura ejecutiva.',
    },
    modules: {
      cockpit: { category: 'Operación', name: 'Decision Cockpit', description: 'Estado, brecha, ritmo requerido y acción recomendada en una sola lectura del turno.', alt: 'Captura del Decision Cockpit con la lectura ejecutiva del turno, datos sintéticos' },
      production: { category: 'Producción', name: 'Producción', description: 'Tonelaje, plan diario y proyección de cierre comparados contra la meta del turno.', alt: 'Captura del módulo de Producción mostrando tonelaje y plan diario, datos sintéticos' },
      fleet: { category: 'Equipos', name: 'Flota CAEX', description: 'Estado operativo, subestado WENCO y ciclos de cada camión, con lista completa filtrable.', alt: 'Captura del módulo de Flota CAEX mostrando estado y ciclos, datos sintéticos' },
      loading: { category: 'Equipos', name: 'Carguío', description: 'Palas y frentes activos, con disponibilidad y rendimiento vinculados al mismo turno.', alt: 'Captura del módulo de Carguío mostrando palas y frentes activos, datos sintéticos' },
      breakdowns: { category: 'Riesgo', name: 'Averías', description: 'Inactividad y fallas registradas, con impacto sobre la disponibilidad de flota.', alt: 'Captura del módulo de Averías mostrando inactividad y fallas, datos sintéticos' },
      alerts: { category: 'Riesgo', name: 'Alertas', description: 'Riesgo y seguridad operacional priorizados por criticidad, no por orden de llegada.', alt: 'Captura del módulo de Alertas mostrando riesgo priorizado, datos sintéticos' },
      map3d: { category: 'Inteligencia', name: 'Mapa Operacional 3D', description: 'Constelación dinámica que relaciona producción, flota, riesgos y plan mensual.', alt: 'Captura del Mapa Operacional 3D mostrando la constelación de datos, datos sintéticos' },
      aerial: { category: 'Producción', name: 'Vista Aérea', description: 'Ortomosaicos y estado del rajo desde arriba, como contexto físico de la operación.', alt: 'Captura del módulo de Vista Aérea mostrando ortomosaicos, datos sintéticos' },
    },
    final: {
      kicker: '10 · ESTADO ACTUAL',
      title: 'Una plataforma en desarrollo, basada en problemas reales.',
      body: 'El mayor desafío de la minería no es obtener más datos. Es comprender qué significan. NORTHMINE es el resultado de quince años recorriendo distintos niveles de la operación.',
      ctaDemo: 'Solicitar acceso al demo',
      ctaAcceso: 'Ya tengo acceso',
      brand: 'NORTHMINE Intelligence',
      founder: 'Simón Mazuela Robles · Founder',
    },
    meta: {
      title: 'Origen | La historia de NORTHMINE Intelligence',
      description: 'La trayectoria operacional que dio origen a NORTHMINE Intelligence, desde la primera línea minera hasta el desarrollo de una plataforma de decisión.',
    },
  },
  en: {
    header: {
      navOrigen: 'Origin',
      navPreguntas: 'Questions',
      navPlataforma: 'Platform',
      acceder: 'Sign in',
      solicitarDemo: 'Request demo',
      ariaBrand: 'NORTHMINE, home',
      ariaNav: 'Primary navigation',
    },
    hero: {
      kicker: 'ORIGIN · THE MAKING OF NORTHMINE',
      title1: 'I did not start by building software.',
      title2: 'I started by moving ore.',
      lead: 'From 2010 to today, a learning journey from the depths of mining —plant, pit, dispatch— to an operational intelligence platform.',
      ctaHistoria: 'Start the story',
      ctaPlataforma: 'See NORTHMINE',
      proofLabel: '15 years',
      proofItems: ['Operations', 'Data', 'Software'],
      scroll: 'Scroll',
      ariaScroll: 'Continue to the story',
    },
    intro: {
      statement: 'Built from the operation.',
      body: 'Not from an office or an incubator.',
      aria: 'Experiences that shape NORTHMINE',
      items: ['PLANT', 'OPEN PIT', 'DISPATCH', 'INTELLIGENCE'],
    },
    thesis: {
      kicker: 'ONE JOURNEY, ONE READING',
      title: 'NorthMine is the result of having lived mining from multiple perspectives.',
    },
    chaptersCaption: 'OPERATIONAL EXPERIENCE',
    chapters: {
      chapter01: {
        era: 'The first line',
        title: 'Where it all began.',
        body: [
          'I was 19 when I first entered mining. I did not arrive as an engineer, analyst or developer.',
          'My first tool was not a computer. It was a shovel. I started doing industrial cleaning inside crushers, mills, thickeners and different areas of a concentrator plant.',
        ],
        quote: 'NORTHMINE was not born here. My way of understanding mining was.',
        alt: 'Concentrator plant where the operational experience that gave rise to NORTHMINE began',
      },
      chapter02: {
        era: 'The open pit',
        title: 'The operation at full scale.',
        body: [
          'I moved from inside the plant to operating loading equipment, bulldozers and excavators. Every minute, every maneuver and every wait directly impacted productivity.',
          'Operating equipment teaches what no report can show: every cycle has a reason, every stop a cost and every decision a consequence.',
        ],
        quote: 'The view changed: from watching an isolated machine to understanding an interdependent chain.',
        alt: 'Simón next to a front-end loader at a mining operation',
      },
      chapter03: {
        era: 'Mine dispatch',
        title: 'Where the questions were born.',
        body: [
          'While studying Computer Engineering I took on the challenge of becoming a Mine Dispatcher. From the control room I had to coordinate operators, maintenance, workshop, planning, surveying and FMS systems.',
          'The system showed information. The operation needed immediate, comparable and understandable answers.',
        ],
        quote: 'Not a single rock moves here. But here is where it is decided how millions of tonnes will move.',
        alt: 'Simón in a mine dispatch room surrounded by operational systems',
      },
    },
    questions: {
      kicker: '06 · SEEMINGLY SIMPLE QUESTIONS',
      title1: 'The system showed information.',
      title2: 'The operation needed answers.',
      items: [
        'What is the real performance of Shovel 1?',
        'Why does Shovel 2 produce less?',
        'How much had we moved yesterday at this same hour?',
        'What was the best hour of the shift?',
        'How long does the cycle really take?',
        'Why are there no trucks at that bench?',
      ],
    },
    formation: {
      kicker: '07 · BUILDING THE ANSWERS',
      title: 'I did not think about creating a company.',
      body: 'I thought about shortening the time between a question and a decision.',
      stages: [
        { stage: 'PLANT', meaning: 'Learn the process' },
        { stage: 'OPEN PIT', meaning: 'Understand the scale' },
        { stage: 'DISPATCH', meaning: 'Coordinate the system' },
        { stage: 'SQL', meaning: 'Extract answers' },
        { stage: 'AUTOMATION', meaning: 'Reduce friction' },
        { stage: 'AI', meaning: 'Recognize patterns' },
      ],
      result: { stage: 'NORTHMINE', meaning: 'Integrate the vision' },
    },
    turning: {
      kicker: '08 · THE TURNING POINT',
      title: 'Producing more does not always mean creating more value.',
      body: 'A single question changed the focus: how much did those tonnes cost to produce?',
      aria: 'Relationship between production, cost and margin',
      equation: [
        { value: '+ t', label: 'More production' },
        { value: '+ USD', label: 'Higher operational cost' },
        { value: '− margin', label: 'Less value generated' },
      ],
    },
    product: {
      kicker: '09 · NORTHMINE INTELLIGENCE',
      title1: 'I used to see equipment.',
      title2: 'Today I see relationships.',
      body: 'NORTHMINE was not born to show dashboards. It was born to connect operations, costs, constraints and decisions into a single operational reading.',
      alt: 'NORTHMINE Decision Cockpit with identified synthetic data',
      figcaptionTitle: 'Decision Cockpit',
      figcaption: 'The operation turned into an executive reading.',
    },
    modules: {
      cockpit: { category: 'Operations', name: 'Decision Cockpit', description: 'Status, gap, required pace and recommended action in one shift reading.', alt: 'Capture of the Decision Cockpit with the executive shift reading, synthetic data' },
      production: { category: 'Production', name: 'Production', description: 'Tonnage, daily plan and closing projection compared against the shift target.', alt: 'Capture of the Production module showing tonnage and daily plan, synthetic data' },
      fleet: { category: 'Equipment', name: 'Truck Fleet', description: 'Operational status, WENCO sub-status and cycles of each truck, with a fully filterable list.', alt: 'Capture of the Truck Fleet module showing status and cycles, synthetic data' },
      loading: { category: 'Equipment', name: 'Loading', description: 'Active shovels and benches, with availability and performance tied to the same shift.', alt: 'Capture of the Loading module showing active shovels and benches, synthetic data' },
      breakdowns: { category: 'Risk', name: 'Breakdowns', description: 'Recorded downtime and failures, with impact on fleet availability.', alt: 'Capture of the Breakdowns module showing downtime and failures, synthetic data' },
      alerts: { category: 'Risk', name: 'Alerts', description: 'Operational risk and safety prioritized by criticality, not by arrival order.', alt: 'Capture of the Alerts module showing prioritized risk, synthetic data' },
      map3d: { category: 'Intelligence', name: '3D Operational Map', description: 'A dynamic constellation linking production, fleet, risks and the monthly plan.', alt: 'Capture of the 3D Operational Map showing the data constellation, synthetic data' },
      aerial: { category: 'Production', name: 'Aerial View', description: 'Orthomosaics and pit status from above, as the physical context of the operation.', alt: 'Capture of the Aerial View module showing orthomosaics, synthetic data' },
    },
    final: {
      kicker: '10 · CURRENT STATE',
      title: 'A platform in development, built on real problems.',
      body: 'The biggest challenge in mining is not getting more data. It is understanding what it means. NORTHMINE is the result of fifteen years across different levels of the operation.',
      ctaDemo: 'Request demo access',
      ctaAcceso: 'I already have access',
      brand: 'NORTHMINE Intelligence',
      founder: 'Simón Mazuela Robles · Founder',
    },
    meta: {
      title: 'Origin | The story of NORTHMINE Intelligence',
      description: 'The operational journey that gave rise to NORTHMINE Intelligence, from the first mining line to building a decision platform.',
    },
  },
  de: {
    header: {
      navOrigen: 'Ursprung',
      navPreguntas: 'Fragen',
      navPlataforma: 'Plattform',
      acceder: 'Anmelden',
      solicitarDemo: 'Demo anfordern',
      ariaBrand: 'NORTHMINE, Start',
      ariaNav: 'Hauptnavigation',
    },
    hero: {
      kicker: 'ORIGIN · THE MAKING OF NORTHMINE',
      title1: 'Ich habe nicht mit Software angefangen.',
      title2: 'Ich habe angefangen, Erz zu bewegen.',
      lead: 'Von 2010 bis heute ein Lernweg von den Tiefen des Bergbaus —Anlage, Tagebau, Disposition— bis zu einer Plattform für operative Intelligenz.',
      ctaHistoria: 'Geschichte beginnen',
      ctaPlataforma: 'NORTHMINE ansehen',
      proofLabel: '15 Jahre',
      proofItems: ['Betrieb', 'Daten', 'Software'],
      scroll: 'Scrollen',
      ariaScroll: 'Zur Geschichte weiter',
    },
    intro: {
      statement: 'Aus dem Betrieb heraus gebaut.',
      body: 'Nicht aus einem Büro oder einem Inkubator.',
      aria: 'Erfahrungen, die NORTHMINE prägen',
      items: ['ANLAGE', 'TAGEBAU', 'DISPOSITION', 'INTELLIGENZ'],
    },
    thesis: {
      kicker: 'EIN WERDEGANG, EINE LESART',
      title: 'NorthMine ist das Ergebnis, den Bergbau aus vielen Perspektiven erlebt zu haben.',
    },
    chaptersCaption: 'OPERATIVE ERFAHRUNG',
    chapters: {
      chapter01: {
        era: 'Die erste Linie',
        title: 'Wo alles begann.',
        body: [
          'Ich war 19, als ich zum ersten Mal in den Bergbau kam. Nicht als Ingenieur, Analytiker oder Entwickler.',
          'Mein erstes Werkzeug war kein Computer, sondern eine Schaufel. Ich begann mit industrieller Reinigung in Brechern, Mühlen, Eindickern und verschiedenen Bereichen einer Aufbereitungsanlage.',
        ],
        quote: 'Hier entstand nicht NORTHMINE. Hier entstand meine Art, den Bergbau zu verstehen.',
        alt: 'Aufbereitungsanlage, in der die operative Erfahrung begann, die NORTHMINE hervorbrachte',
      },
      chapter02: {
        era: 'Der Tagebau',
        title: 'Der Betrieb in voller Größe.',
        body: [
          'Ich wechselte aus der Anlage zum Bedienen von Ladegeräten, Bulldozern und Baggern. Jede Minute, jede Bewegung und jede Wartezeit wirkten direkt auf die Produktivität.',
          'Eine Maschine zu bedienen lehrt, was kein Bericht zeigen kann: Jeder Zyklus hat einen Grund, jede Stillzeit einen Preis und jede Entscheidung eine Folge.',
        ],
        quote: 'Der Blick änderte sich: von einer isolierten Maschine zu einer voneinander abhängigen Kette.',
        alt: 'Simón neben einem Radlader in einem Bergbaubetrieb',
      },
      chapter03: {
        era: 'Bergwerk-Disposition',
        title: 'Wo die Fragen entstanden.',
        body: [
          'Während meines Informatikstudiums übernahm ich die Herausforderung, Bergwerk-Dispatcher zu werden. Vom Kontrollraum musste ich Bediener, Wartung, Werkstatt, Planung, Vermessung und FMS-Systeme koordinieren.',
          'Das System zeigte Informationen. Der Betrieb brauchte sofortige, vergleichbare und verständliche Antworten.',
        ],
        quote: 'Hier bewegt sich kein einziger Felsen. Aber hier wird entschieden, wie sich Millionen von Tonnen bewegen.',
        alt: 'Simón in einem Bergwerk-Dispositionsraum, umgeben von operativen Systemen',
      },
    },
    questions: {
      kicker: '06 · SCHEINBAR EINFACHE FRAGEN',
      title1: 'Das System zeigte Informationen.',
      title2: 'Der Betrieb brauchte Antworten.',
      items: [
        'Wie ist die tatsächliche Leistung von Bagger 1?',
        'Warum produziert Bagger 2 weniger?',
        'Wie viel hatten wir gestern zu dieser Stunde?',
        'Was war die beste Stunde der Schicht?',
        'Wie lange dauert der Zyklus wirklich?',
        'Warum stehen keine LKW an diesem Front?',
      ],
    },
    formation: {
      kicker: '07 · DIE ANTWORTEN BAUEN',
      title: 'Ich dachte nicht daran, ein Unternehmen zu gründen.',
      body: 'Ich dachte daran, die Zeit zwischen einer Frage und einer Entscheidung zu verkürzen.',
      stages: [
        { stage: 'ANLAGE', meaning: 'Den Prozess kennenlernen' },
        { stage: 'TAGEBAU', meaning: 'Die Größe verstehen' },
        { stage: 'DISPOSITION', meaning: 'Das System koordinieren' },
        { stage: 'SQL', meaning: 'Antworten gewinnen' },
        { stage: 'AUTOMATION', meaning: 'Reibung reduzieren' },
        { stage: 'KI', meaning: 'Muster erkennen' },
      ],
      result: { stage: 'NORTHMINE', meaning: 'Die Vision integrieren' },
    },
    turning: {
      kicker: '08 · DER WENDEPUNKT',
      title: 'Mehr zu produzieren bedeutet nicht immer mehr Wert.',
      body: 'Eine einzige Frage änderte den Fokus: Was kostete es, diese Tonnen zu produzieren?',
      aria: 'Verhältnis zwischen Produktion, Kosten und Marge',
      equation: [
        { value: '+ t', label: 'Mehr Produktion' },
        { value: '+ USD', label: 'Höhere Betriebskosten' },
        { value: '− Marge', label: 'Weniger erzeugter Wert' },
      ],
    },
    product: {
      kicker: '09 · NORTHMINE INTELLIGENCE',
      title1: 'Früher sah ich Maschinen.',
      title2: 'Heute sehe ich Zusammenhänge.',
      body: 'NORTHMINE wurde nicht für Dashboards gebaut, sondern um Betrieb, Kosten, Restriktionen und Entscheidungen in einer operativen Lesart zu verbinden.',
      alt: 'NORTHMINE Decision Cockpit mit gekennzeichneten synthetischen Daten',
      figcaptionTitle: 'Decision Cockpit',
      figcaption: 'Der Betrieb als Führungslesart.',
    },
    modules: {
      cockpit: { category: 'Betrieb', name: 'Decision Cockpit', description: 'Status, Lücke, erforderliches Tempo und empfohlene Aktion in einer Schichtlesart.', alt: 'Aufnahme des Decision Cockpit mit der Schicht-Führungslesart, synthetische Daten' },
      production: { category: 'Produktion', name: 'Produktion', description: 'Tonnage, Tagesplan und Endprognose im Vergleich zum Schichtziel.', alt: 'Aufnahme des Produktionsmoduls mit Tonnage und Tagesplan, synthetische Daten' },
      fleet: { category: 'Ausstattung', name: 'LKW-Flotte', description: 'Betriebszustand, WENCO-Unterstatus und Zyklen jedes LKW mit vollständig filterbarer Liste.', alt: 'Aufnahme des LKW-Flottenmoduls mit Status und Zyklen, synthetische Daten' },
      loading: { category: 'Ausstattung', name: 'Beladung', description: 'Aktive Bagger und Fronts, mit Verfügbarkeit und Leistung derselben Schicht.', alt: 'Aufnahme des Beladungsmoduls mit aktiven Baggern und Fronts, synthetische Daten' },
      breakdowns: { category: 'Risiko', name: 'Ausfälle', description: 'Erfasste Stillzeiten und Fehler mit Auswirkung auf die Flottenverfügbarkeit.', alt: 'Aufnahme des Ausfallmoduls mit Stillzeiten und Fehlern, synthetische Daten' },
      alerts: { category: 'Risiko', name: 'Alarme', description: 'Operatives Risiko nach Kritikalität priorisiert, nicht nach Eingangsreihenfolge.', alt: 'Aufnahme des Alarmmoduls mit priorisiertem Risiko, synthetische Daten' },
      map3d: { category: 'Intelligenz', name: '3D-Betriebskarte', description: 'Eine dynamische Konstellation, die Produktion, Flotte, Risiken und Monatsplan verbindet.', alt: 'Aufnahme der 3D-Betriebskarte mit der Datenkonstellation, synthetische Daten' },
      aerial: { category: 'Produktion', name: 'Luftansicht', description: 'Orthofotos und Zustand des Tagebaus von oben als physischer Kontext des Betriebs.', alt: 'Aufnahme des Luftansichtsmoduls mit Orthofotos, synthetische Daten' },
    },
    final: {
      kicker: '10 · AKTUELLER STAND',
      title: 'Eine Plattform in Entwicklung, basierend auf realen Problemen.',
      body: 'Die größte Herausforderung im Bergbau ist nicht, mehr Daten zu bekommen, sondern zu verstehen, was sie bedeuten. NORTHMINE ist das Ergebnis von fünfzehn Jahren auf verschiedenen Ebenen des Betriebs.',
      ctaDemo: 'Demo-Zugang anfordern',
      ctaAcceso: 'Ich habe bereits Zugang',
      brand: 'NORTHMINE Intelligence',
      founder: 'Simón Mazuela Robles · Gründer',
    },
    meta: {
      title: 'Ursprung | Die Geschichte von NORTHMINE Intelligence',
      description: 'Der operative Werdegang, der NORTHMINE Intelligence hervorbrachte: von der ersten Bergbaulinie bis zur Entscheidungsplattform.',
    },
  },
  zh: {
    header: {
      navOrigen: '起源',
      navPreguntas: '问题',
      navPlataforma: '平台',
      acceder: '登录',
      solicitarDemo: '申请演示',
      ariaBrand: 'NORTHMINE，首页',
      ariaNav: '主导航',
    },
    hero: {
      kicker: '起源 · NORTHMINE 的诞生',
      title1: '我不是从写软件开始的。',
      title2: '我是从搬运矿石开始的。',
      lead: '从2010年至今，一段从矿业最深处——选厂、露天矿、调度——通往运营智能平台的学习之路。',
      ctaHistoria: '开始故事',
      ctaPlataforma: '了解 NORTHMINE',
      proofLabel: '15 年',
      proofItems: ['运营', '数据', '软件'],
      scroll: '向下滚动',
      ariaScroll: '继续阅读故事',
    },
    intro: {
      statement: '从运营一线建成。',
      body: '而不是从办公室或孵化器。',
      aria: '塑造 NORTHMINE 的经历',
      items: ['工厂', '露天矿', '调度', '智能'],
    },
    thesis: {
      kicker: '一段历程，一种解读',
      title: 'NorthMine 是从多个视角亲历矿业的结果。',
    },
    chaptersCaption: '运营经历',
    chapters: {
      chapter01: {
        era: '第一线',
        title: '一切开始的地方。',
        body: [
          '我进入矿业时才 19 岁。我不是以工程师、分析师或开发者的身份进入的。',
          '我的第一个工具不是电脑，而是一把铁锹。我先是在破碎机、球磨机、浓缩机以及选矿厂的不同区域做工业清洁。',
        ],
        quote: 'NORTHMINE 不是在这里诞生，而是我对矿业的理解在这里诞生。',
        alt: '孕育出 NORTHMINE 的运营经验开始的选矿厂',
      },
      chapter02: {
        era: '露天矿',
        title: '全规模的运营。',
        body: [
          '我从工厂内部转向操作装载设备、推土机和挖掘机。每一分钟、每一个动作、每一次等待都直接影响到产量。',
          '操作设备能教会你任何报告都无法展示的东西：每个循环都有原因，每次停机都有成本，每个决策都有后果。',
        ],
        quote: '视角改变了：从观察一台孤立的设备，到理解一条相互依存的链条。',
        alt: 'Simón 在矿业作业中站在一台前装载机旁',
      },
      chapter03: {
        era: '矿山调度',
        title: '问题诞生的地方。',
        body: [
          '在攻读计算机工程期间，我接受挑战成为矿山调度员。在控制室里，我必须协调操作员、维护、车间、规划、测量和 FMS 系统。',
          '系统展示的是信息，而运营需要的是即时、可比、易懂的答案。',
        ],
        quote: '这里不会移动一块石头，但这里决定千百万吨矿石如何移动。',
        alt: 'Simón 在一间被运营系统环绕的矿山调度室里',
      },
    },
    questions: {
      kicker: '06 · 看似简单的问题',
      title1: '系统展示的是信息。',
      title2: '运营需要的是答案。',
      items: [
        '1号铲的真实产能是多少？',
        '为什么2号铲产量更低？',
        '昨天同一时刻我们运了多少？',
        '班次里最好的时刻是哪一小时？',
        '循环到底要多久？',
        '为什么那个作业面没有卡车？',
      ],
    },
    formation: {
      kicker: '07 · 构建答案',
      title: '我并没有想过创建一家公司。',
      body: '我想的是缩短一个问题与一个决策之间的距离。',
      stages: [
        { stage: '工厂', meaning: '认识流程' },
        { stage: '露天矿', meaning: '理解规模' },
        { stage: '调度', meaning: '协调系统' },
        { stage: 'SQL', meaning: '提取答案' },
        { stage: '自动化', meaning: '减少摩擦' },
        { stage: 'AI', meaning: '识别模式' },
      ],
      result: { stage: 'NORTHMINE', meaning: '整合愿景' },
    },
    turning: {
      kicker: '08 · 转折点',
      title: '生产更多并不总意味着创造更多价值。',
      body: '一个问题改变了焦点：生产那些矿石花了多少钱？',
      aria: '生产、成本与利润之间的关系',
      equation: [
        { value: '+ 吨', label: '更多产量' },
        { value: '+ USD', label: '更高的运营成本' },
        { value: '− 利润', label: '更少的价值创造' },
      ],
    },
    product: {
      kicker: '09 · NORTHMINE INTELLIGENCE',
      title1: '过去我看到的是设备。',
      title2: '今天我看到的是关联。',
      body: 'NORTHMINE 不是为了展示仪表盘而生，而是为了把运营、成本、约束与决策连接进同一种运营视图。',
      alt: '带已标识合成数据的 NORTHMINE Decision Cockpit',
      figcaptionTitle: 'Decision Cockpit',
      figcaption: '把运营转化为一份执行级视图。',
    },
    modules: {
      cockpit: { category: '运营', name: 'Decision Cockpit', description: '状态、差距、所需节奏与建议行动，浓缩于一次班次阅读。', alt: 'Decision Cockpit 截图，展示班次执行视图，合成数据' },
      production: { category: '生产', name: '生产', description: '吨位、日计划与收盘预测与班次目标对比。', alt: '生产模块截图，展示吨位与日计划，合成数据' },
      fleet: { category: '设备', name: '卡车车队', description: '每辆卡车的运营状态、WENCO 子状态与循环，附完整可筛选列表。', alt: '卡车车队模块截图，展示状态与循环，合成数据' },
      loading: { category: '设备', name: '装载', description: '活跃电铲与作业面，可用性与绩效与同一班次挂钩。', alt: '装载模块截图，展示活跃电铲与作业面，合成数据' },
      breakdowns: { category: '风险', name: '故障', description: '记录的停机与故障，及其对车队可用性的影响。', alt: '故障模块截图，展示停机与故障，合成数据' },
      alerts: { category: '风险', name: '告警', description: '按严重程度排序的运营风险与安全，而非按到达顺序。', alt: '告警模块截图，展示排序后的风险，合成数据' },
      map3d: { category: '智能', name: '3D 运营地图', description: '连接生产、车队、风险与月度计划的动态星座图。', alt: '3D 运营地图截图，展示数据星座，合成数据' },
      aerial: { category: '生产', name: '空中视图', description: '从空中俯瞰的正射影像与矿坑状态，作为运营的物理背景。', alt: '空中视图模块截图，展示正射影像，合成数据' },
    },
    final: {
      kicker: '10 · 当前状态',
      title: '一个基于真实问题、仍在发展中的平台。',
      body: '矿业最大的挑战不是获取更多数据，而是理解它们的含义。NORTHMINE 是十五年穿行于运营不同层级的结果。',
      ctaDemo: '申请演示访问',
      ctaAcceso: '我已获得访问',
      brand: 'NORTHMINE Intelligence',
      founder: 'Simón Mazuela Robles · 创始人',
    },
    meta: {
      title: '起源 | NORTHMINE Intelligence 的故事',
      description: '从矿业一线到决策平台，NORTHMINE Intelligence 赖以诞生的运营历程。',
    },
  },
  ar: {
    header: {
      navOrigen: 'المنشأ',
      navPreguntas: 'الأسئلة',
      navPlataforma: 'المنصة',
      acceder: 'تسجيل الدخول',
      solicitarDemo: 'طلب عرض',
      ariaBrand: 'NORTHMINE، الرئيسية',
      ariaNav: 'التنقل الرئيسي',
    },
    hero: {
      kicker: 'المنشأ · صناعة NORTHMINE',
      title1: 'لم أبدأ ببناء البرمجيات.',
      title2: 'بدأت بنقل الخام.',
      lead: 'منذ عام 2010 وحتى اليوم، رحلة تعلّم من أعماق التعدين —المصنع، الحفرة، التوزيع— حتى منصة ذكاء تشغيلي.',
      ctaHistoria: 'ابدأ القصة',
      ctaPlataforma: 'شاهد NORTHMINE',
      proofLabel: '15 عاماً',
      proofItems: ['العمليات', 'البيانات', 'البرمجيات'],
      scroll: 'مرر',
      ariaScroll: 'الاستمرار إلى القصة',
    },
    intro: {
      statement: 'بُني من قلب العمليات.',
      body: 'ليس من مكتب أو حاضنة.',
      aria: 'الخبرات التي شكلت NORTHMINE',
      items: ['المصنع', 'المنجم', 'التوزيع', 'الذكاء'],
    },
    thesis: {
      kicker: 'مسيرة واحدة، قراءة واحدة',
      title: 'NorthMine هو نتيجة عيش التعدين من زوايا متعددة.',
    },
    chaptersCaption: 'خبرة تشغيلية',
    chapters: {
      chapter01: {
        era: 'الخط الأول',
        title: 'حيث بدأ كل شيء.',
        body: [
          'كان عمري 19 عاماً عندما دخلت التعدين لأول مرة. لم أصل كمهندس ولا محلل ولا مبرمج.',
          'لم تكن أداتي الأولى حاسوباً، بل مجرفة. بدأت بتنظيف صناعي داخل الكسارات والمطاحن والمكثفات ومختلف مناطق مصنع التركيز.',
        ],
        quote: 'لم يولد NORTHMINE هنا، بل وُلدت هنا طريقتِي في فهم التعدين.',
        alt: 'مصنع التركيز حيث بدأت الخبرة التشغيلية التي أنشأت NORTHMINE',
      },
      chapter02: {
        era: 'المنجم المكشوف',
        title: 'العملية بكل أبعادها.',
        body: [
          'انتقلت من داخل المصنع إلى تشغيل معدات التحميل والبلدوزرات والحفارات. كل دقيقة وكل حركة وكل انتظار كان يؤثر مباشرة في الإنتاجية.',
          'تشغيل المعدات يعلّم ما لا يستطيع أي تقرير إظهاره: لكل دورة سبب، ولكل توقف تكلفة، ولكل قرار عاقبة.',
        ],
        quote: 'تغيرت النظرة: من مشاهدة معدات معزولة إلى فهم سلسلة مترابطة.',
        alt: 'سيمون بجانب لودر أمامي في عملية تعدينية',
      },
      chapter03: {
        era: 'توزيع المنجم',
        title: 'حيث وُلدت الأسئلة.',
        body: [
          'أثناء دراستي لهندسة الحاسوب، قبلت التحدي لأصبح موزع منجم. من غرفة التحكم كان عليّ التنسيق بين المشغلين والصيانة والورشة والتخطيط والمساحة وأنظمة إدارة الأسطول.',
          'كان النظام يعرض المعلومات، بينما كانت العملية بحاجة إلى إجابات فورية وقابلة للمقارنة والفهم.',
        ],
        quote: 'لا تتحرك هنا صخرة واحدة، لكن هنا يُقرر كيف ستتحرك ملايين الأطنان.',
        alt: 'سيمون في غرفة توزيع منجم محاطاً بأنظمة تشغيلية',
      },
    },
    questions: {
      kicker: '06 · أسئلة تبدو بسيطة',
      title1: 'كان النظام يعرض المعلومات.',
      title2: 'كانت العملية بحاجة إلى إجابات.',
      items: [
        'ما الأداء الحقيقي للمجرفة 1؟',
        'لماذا تنتج المجرفة 2 أقل؟',
        'كم أنتجنا أمس في هذه الساعة نفسها؟',
        'ما أفضل ساعة في الوردية؟',
        'كم يستغرق الدورة فعلاً؟',
        'لماذا لا توجد شاحنات في هذا الوجه؟',
      ],
    },
    formation: {
      kicker: '07 · بناء الإجابات',
      title: 'لم أفكر في تأسيس شركة.',
      body: 'فكرت في تقليص الوقت بين السؤال والقرار.',
      stages: [
        { stage: 'المصنع', meaning: 'تعلّم العملية' },
        { stage: 'المنجم', meaning: 'فهم الحجم' },
        { stage: 'التوزيع', meaning: 'تنسيق النظام' },
        { stage: 'SQL', meaning: 'استخراج الإجابات' },
        { stage: 'الأتمتة', meaning: 'تقليل الاحتكاك' },
        { stage: 'الذكاء', meaning: 'التعرّف على الأنماط' },
      ],
      result: { stage: 'NORTHMINE', meaning: 'دمج الرؤية' },
    },
    turning: {
      kicker: '08 · نقطة التحول',
      title: 'إنتاج المزيد لا يعني دائماً إنتاج قيمة أكبر.',
      body: 'سؤال واحد غيّر التركيز: كم كلّف إنتاج تلك الأطنان؟',
      aria: 'العلاقة بين الإنتاج والتكلفة والهامش',
      equation: [
        { value: '+ طن', label: 'إنتاج أكثر' },
        { value: '+ دولار', label: 'تكلفة تشغيل أعلى' },
        { value: '− هامش', label: 'قيمة أقل' },
      ],
    },
    product: {
      kicker: '09 · NORTHMINE INTELLIGENCE',
      title1: 'كنت أرى المعدات من قبل.',
      title2: 'اليوم أرى العلاقات.',
      body: 'لم يُخلق NORTHMINE لعرض لوحات البيانات، بل لربط العمليات والتكاليف والقيود والقرارات في قراءة تشغيلية واحدة.',
      alt: 'Decision Cockpit من NORTHMINE ببيانات اصطناعية محددة',
      figcaptionTitle: 'Decision Cockpit',
      figcaption: 'العمليات تتحول إلى قراءة تنفيذية.',
    },
    modules: {
      cockpit: { category: 'العمليات', name: 'Decision Cockpit', description: 'الحالة والفجوة والوتيرة المطلوبة والإجراء المقترح في قراءة وردية واحدة.', alt: 'لقطة من Decision Cockpit تعرض قراءة الوردية التنفيذية، بيانات اصطناعية' },
      production: { category: 'الإنتاج', name: 'الإنتاج', description: 'الحمولة والخطة اليومية وتوقع الإغلاق مقارنةً بهدف الوردية.', alt: 'لقطة من وحدة الإنتاج تعرض الحمولة والخطة اليومية، بيانات اصطناعية' },
      fleet: { category: 'المعدات', name: 'أسطول الشاحنات', description: 'الحالة التشغيلية والحالة الفرعية WENCO ودورات كل شاحنة مع قائمة كاملة قابلة للتصفية.', alt: 'لقطة من وحدة أسطول الشاحنات تعرض الحالة والدورات، بيانات اصطناعية' },
      loading: { category: 'المعدات', name: 'التحميل', description: 'المجارف والوجوه النشطة، مع توافر وأداء مرتبطين بنفس الوردية.', alt: 'لقطة من وحدة التحميل تعرض المجارف والوجوه النشطة، بيانات اصطناعية' },
      breakdowns: { category: 'المخاطر', name: 'الأعطال', description: 'التوقفات والأعطال المسجلة مع أثرها على توافر الأسطول.', alt: 'لقطة من وحدة الأعطال تعرض التوقفات والأعطال، بيانات اصطناعية' },
      alerts: { category: 'المخاطر', name: 'التنبيهات', description: 'المخاطر والسلامة التشغيلية مرتبة بالأهمية لا بترتيب الوصول.', alt: 'لقطة من وحدة التنبيهات تعرض المخاطر المرتبة، بيانات اصطناعية' },
      map3d: { category: 'الذكاء', name: 'الخريطة التشغيلية 3D', description: 'كوكبة ديناميكية تربط الإنتاج والأسطول والمخاطر والخطة الشهرية.', alt: 'لقطة من الخريطة التشغيلية 3D تعرض كوكبة البيانات، بيانات اصطناعية' },
      aerial: { category: 'الإنتاج', name: 'العرض الجوي', description: 'صور جوية مركبة وحالة المنجم من الأعلى كسياق مادي للعملية.', alt: 'لقطة من وحدة العرض الجوي تعرض الصور الجوية المركبة، بيانات اصطناعية' },
    },
    final: {
      kicker: '10 · الوضع الحالي',
      title: 'منصة قيد التطوير، مبنية على مشكلات حقيقية.',
      body: 'أكبر تحدٍ في التعدين ليس الحصول على مزيد من البيانات، بل فهم ما تعنيه. NORTHMINE هو نتيجة خمسة عشر عاماً في مستويات مختلفة من العملية.',
      ctaDemo: 'طلب الوصول للعرض',
      ctaAcceso: 'لديّ وصول بالفعل',
      brand: 'NORTHMINE Intelligence',
      founder: 'سيمون مازويلا روبليس · المؤسس',
    },
    meta: {
      title: 'المنشأ | قصة NORTHMINE Intelligence',
      description: 'المسيرة التشغيلية التي أنشأت NORTHMINE Intelligence، من أولى خطوط التعدين إلى بناء منصة قرار.',
    },
  },
  ru: {
    header: {
      navOrigen: 'История',
      navPreguntas: 'Вопросы',
      navPlataforma: 'Платформа',
      acceder: 'Войти',
      solicitarDemo: 'Запросить демо',
      ariaBrand: 'NORTHMINE, главная',
      ariaNav: 'Основная навигация',
    },
    hero: {
      kicker: 'ИСТОРИЯ · КАК СОЗДАВАЛСЯ NORTHMINE',
      title1: 'Я начинал не с разработки ПО.',
      title2: 'Я начинал с перемещения руды.',
      lead: 'С 2010 года и по сегодняшний день — путь обучения от глубин горнодобычи —фабрика, карьер, диспетчерская— до платформы операционного интеллекта.',
      ctaHistoria: 'Начать историю',
      ctaPlataforma: 'Узнать о NORTHMINE',
      proofLabel: '15 лет',
      proofItems: ['Операции', 'Данные', 'ПО'],
      scroll: 'Листайте',
      ariaScroll: 'Продолжить к истории',
    },
    intro: {
      statement: 'Построено изнутри производства.',
      body: 'Не из офиса и не из инкубатора.',
      aria: 'Опыт, сформировавший NORTHMINE',
      items: ['ЗАВОД', 'КАРЬЕР', 'ДИСПЕТЧЕРИЗАЦИЯ', 'ИНТЕЛЛЕКТ'],
    },
    thesis: {
      kicker: 'ОДИН ПУТЬ, ОДНА КАРТИНА',
      title: 'NorthMine — результат того, что горную добычу я увидел с разных позиций.',
    },
    chaptersCaption: 'ОПЕРАЦИОННЫЙ ОПЫТ',
    chapters: {
      chapter01: {
        era: 'Первая линия',
        title: 'Где всё началось.',
        body: [
          'Мне было 19, когда я впервые попал в горную добычу. Не как инженер, аналитик или разработчик.',
          'Моим первым инструментом был не компьютер, а лопата. Я начал с промышленной уборки внутри дробилок, мельниц, сгустителей и разных участков обогатительной фабрики.',
        ],
        quote: 'Здесь родился не NORTHMINE. Здесь родилось моё понимание горного дела.',
        alt: 'Обогатительная фабрика, где начался операционный опыт, давший начало NORTHMINE',
      },
      chapter02: {
        era: 'Карьер',
        title: 'Операция во всём масштабе.',
        body: [
          'Я перешёл из цеха к управлению погрузочной техникой, бульдозерами и экскаваторами. Каждая минута, каждый манёвр и каждая задержка напрямую влияли на производительность.',
          'Работа на технике учит тому, чего не покажет ни один отчёт: у каждого цикла есть причина, у каждой остановки — цена, у каждого решения — последствие.',
        ],
        quote: 'Взгляд изменился: от наблюдения за отдельной машиной к пониманию взаимозависимой цепочки.',
        alt: 'Симон рядом с фронтальным погрузчиком на горном предприятии',
      },
      chapter03: {
        era: 'Диспетчеризация рудника',
        title: 'Где родились вопросы.',
        body: [
          'Учась на инженера-программиста, я принял вызов стать диспетчером рудника. Из зала управления я координировал операторов, обслуживание, цех, планирование, маркшейдерию и системы FMS.',
          'Система показывала информацию. Производству нужны были немедленные, сопоставимые и понятные ответы.',
        ],
        quote: 'Здесь не сдвигается ни один камень. Но здесь решается, как сдвинутся миллионы тонн.',
        alt: 'Симон в диспетчерской рудника среди операционных систем',
      },
    },
    questions: {
      kicker: '06 · НА ПЕРВЫЙ ВЗГЛЯД ПРОСТЫЕ ВОПРОСЫ',
      title1: 'Система показывала информацию.',
      title2: 'Производству нужны были ответы.',
      items: [
        'Какова реальная производительность экскаватора 1?',
        'Почему экскаватор 2 производит меньше?',
        'Сколько мы вывезли вчера в это же время?',
        'Какой час смены был лучшим?',
        'Сколько на самом деле длится цикл?',
        'Почему на этом забое нет самосвалов?',
      ],
    },
    formation: {
      kicker: '07 · СОЗДАВАЯ ОТВЕТЫ',
      title: 'Я не думал о создании компании.',
      body: 'Я думал о том, как сократить путь от вопроса к решению.',
      stages: [
        { stage: 'ЗАВОД', meaning: 'Познать процесс' },
        { stage: 'КАРЬЕР', meaning: 'Осознать масштаб' },
        { stage: 'ДИСПЕТЧЕРИЗАЦИЯ', meaning: 'Координировать систему' },
        { stage: 'SQL', meaning: 'Извлекать ответы' },
        { stage: 'АВТОМАТИЗАЦИЯ', meaning: 'Снижать трение' },
        { stage: 'ИИ', meaning: 'Распознавать паттерны' },
      ],
      result: { stage: 'NORTHMINE', meaning: 'Объединить видение' },
    },
    turning: {
      kicker: '08 · ТОЧКА ПЕРЕЛОМА',
      title: 'Производить больше — не всегда значит создавать больше ценности.',
      body: 'Один вопрос изменил фокус: сколько стоило произвести эти тонны?',
      aria: 'Связь между производством, затратами и маржой',
      equation: [
        { value: '+ т', label: 'Больше производства' },
        { value: '+ USD', label: 'Выше операционные затраты' },
        { value: '− маржа', label: 'Меньше созданной ценности' },
      ],
    },
    product: {
      kicker: '09 · NORTHMINE INTELLIGENCE',
      title1: 'Раньше я видел технику.',
      title2: 'Сегодня я вижу взаимосвязи.',
      body: 'NORTHMINE создан не для дашбордов. Он создан, чтобы соединить операции, затраты, ограничения и решения в единую операционную картину.',
      alt: 'Decision Cockpit от NORTHMINE с помеченными синтетическими данными',
      figcaptionTitle: 'Decision Cockpit',
      figcaption: 'Операция, превращённая в управленческую картину.',
    },
    modules: {
      cockpit: { category: 'Операции', name: 'Decision Cockpit', description: 'Состояние, разрыв, требуемый темп и рекомендуемое действие в одной картине смены.', alt: 'Снимок Decision Cockpit с исполнительной картиной смены, синтетические данные' },
      production: { category: 'Производство', name: 'Производство', description: 'Тоннаж, дневной план и прогноз на конец смены в сравнении с целью.', alt: 'Снимок модуля производства с тоннажем и дневным планом, синтетические данные' },
      fleet: { category: 'Оборудование', name: 'Парк самосвалов', description: 'Операционное состояние, подсостояние WENCO и циклы каждого самосвала с фильтруемым списком.', alt: 'Снимок модуля парка самосвалов с состоянием и циклами, синтетические данные' },
      loading: { category: 'Оборудование', name: 'Погрузка', description: 'Активные экскаваторы и забои с доступностью и производительностью в той же смене.', alt: 'Снимок модуля погрузки с активными экскаваторами и забоями, синтетические данные' },
      breakdowns: { category: 'Риск', name: 'Поломки', description: 'Зафиксированные простои и отказы с влиянием на доступность парка.', alt: 'Снимок модуля поломок с простоями и отказами, синтетические данные' },
      alerts: { category: 'Риск', name: 'Предупреждения', description: 'Риск и безопасность, приоритизированные по критичности, а не по порядку поступления.', alt: 'Снимок модуля предупреждений с приоритизированным риском, синтетические данные' },
      map3d: { category: 'Интеллект', name: '3D-карта операций', description: 'Динамическое созвездие, связывающее производство, парк, риски и месячный план.', alt: 'Снимок 3D-карты операций с созвездием данных, синтетические данные' },
      aerial: { category: 'Производство', name: 'Аэросъёмка', description: 'Ортофотопланы и состояние карьера сверху как физический контекст операции.', alt: 'Снимок модуля аэросъёмки с ортофотопланами, синтетические данные' },
    },
    final: {
      kicker: '10 · ТЕКУЩЕЕ СОСТОЯНИЕ',
      title: 'Платформа в разработке, основанная на реальных проблемах.',
      body: 'Главная задача горной добычи — не собрать больше данных, а понять, что они означают. NORTHMINE — результат пятнадцати лет на разных уровнях производства.',
      ctaDemo: 'Запросить доступ к демо',
      ctaAcceso: 'У меня уже есть доступ',
      brand: 'NORTHMINE Intelligence',
      founder: 'Simón Mazuela Robles · Основатель',
    },
    meta: {
      title: 'История | Путь NORTHMINE Intelligence',
      description: 'Операционный путь, который привёл к созданию NORTHMINE Intelligence: от первой линии горных работ до платформы решений.',
    },
  },
}
