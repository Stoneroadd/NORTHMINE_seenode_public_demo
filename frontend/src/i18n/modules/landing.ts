import type { ModuleDict } from '../useModuleT'

export interface LandingHeaderT {
  skip: string
  nav: {
    plataforma: string
    propuesta: string
    problema: string
    diferencia: string
    seguridad: string
    origen: string
    demo: string
  }
  acceder: string
  solicitarDemo: string
  ariaNav: string
  ariaMovil: string
  ariaAbrir: string
  ariaCerrar: string
}

export interface LandingT {
  switcherAria: string
  header: LandingHeaderT
  hero: {
    badge: string
    title1: string
    title2: string
    lead: string
    ctaDemo: string
    ctaExplorar: string
  }
  definition: {
    kicker: string
    title: string
    body: string
    system: string
    sequence: string[]
    boundaryLabel: string
    boundary: string
    ariaSequence: string
  }
  mineBand: {
    kicker: string
    title1: string
    title2: string
    body: string
    signals: string[]
    aria: string
  }
  problem: {
    kicker: string
    title: string
    body: string
    items: { title: string; description: string }[]
    answerKicker: string
    answerTitle: string
    transformations: { before: string; after: string }[]
  }
  flow: {
    kicker: string
    title: string
    steps: { title: string; description: string }[]
  }
  benefits: {
    title: string
    items: { title: string; description: string }[]
  }
  evidence: { kicker: string; title: string; body: string }
  stage: { toolbar: string; alt: string }
  security: {
    kicker: string
    title: string
    points: { label: string; detail: string }[]
  }
  cta: { title: string; lead: string; ctaDemo: string; ctaAcceso: string }
  footer: {
    tagline: string
    navHistoria: string
    navPrivacidad: string
    navSolicitar: string
    navAcceso: string
    status: string
    aria: string
  }
  meta: { title: string; description: string }
}

export const landingT: ModuleDict<LandingT> = {
  es: {
    switcherAria: 'Cambiar idioma',
    header: {
      skip: 'Saltar al contenido',
      nav: {
        plataforma: 'Plataforma',
        propuesta: 'Propuesta',
        problema: 'Problema',
        diferencia: 'Diferencia',
        seguridad: 'Seguridad',
        origen: 'Origen',
        demo: 'Demo',
      },
      acceder: 'Acceder',
      solicitarDemo: 'Solicitar demo',
      ariaNav: 'Navegación principal',
      ariaMovil: 'Navegación móvil',
      ariaAbrir: 'Abrir navegación',
      ariaCerrar: 'Cerrar navegación',
    },
    hero: {
      badge: 'Inteligencia operacional para minería',
      title1: 'Observe la operación completa.',
      title2: 'Decida con contexto.',
      lead: 'NORTHMINE es un Command Center minero que transforma datos dispersos en decisiones priorizadas, explicables y trazables durante el turno.',
      ctaDemo: 'Solicitar acceso al demo',
      ctaExplorar: 'Explorar la plataforma',
    },
    definition: {
      kicker: 'Qué es NORTHMINE',
      title: 'Una capa de decisión sobre sus sistemas operacionales.',
      body: 'NORTHMINE es un Command Center para minería a cielo abierto. Integra producción, carguío, transporte, mantenimiento, riesgos y planificación en una lectura operacional común.',
      system: 'Convierte datos dispersos en decisiones priorizadas, explicables y trazables dentro del turno.',
      sequence: ['Estado', 'Brecha', 'Causa', 'Riesgo', 'Acción', 'Resultado'],
      boundaryLabel: 'Integra',
      boundary: 'No reemplaza despacho, mantenimiento, SQL ni los sistemas fuente existentes.',
      ariaSequence: 'Secuencia de decisión operacional',
    },
    mineBand: {
      kicker: 'INTELIGENCIA OPERACIONAL CONECTADA',
      title1: 'Una operación.',
      title2: 'Una lectura compartida.',
      body: 'NORTHMINE reúne las señales que normalmente llegan separadas y las convierte en contexto para decidir durante el turno.',
      signals: ['Producción', 'Flota', 'Carguío', 'Riesgo', 'Plan'],
      aria: 'Señales conectadas por NORTHMINE',
    },
    problem: {
      kicker: 'La problemática',
      title: 'La mina tiene datos. La decisión sigue fragmentada.',
      body: 'El desafío no es producir otro reporte. Es relacionar la condición del turno, su causa y la acción disponible antes de que la ventana de recuperación desaparezca.',
      items: [
        { title: 'Información fragmentada', description: 'Cada área posee datos correctos, pero no una visión operacional compartida.' },
        { title: 'Brechas detectadas tarde', description: 'Cuando la desviación se entiende, queda poco tiempo para recuperar el turno.' },
        { title: 'Indicadores sin prioridad', description: 'Muchos KPI muestran qué ocurrió, pero no explican qué atender primero.' },
      ],
      answerKicker: 'La respuesta NORTHMINE',
      answerTitle: 'De múltiples fuentes a una lectura operacional común.',
      transformations: [
        { before: 'Sistemas separados', after: 'Contexto conectado' },
        { before: 'KPI aislados', after: 'Estado, brecha y causa' },
        { before: 'Alertas planas', after: 'Riesgo priorizado' },
        { before: 'Decisiones informales', after: 'Acción y resultado trazables' },
      ],
    },
    flow: {
      kicker: 'Cómo funciona',
      title: 'De la señal dispersa a la decisión trazable.',
      steps: [
        { title: 'Conectar señales', description: 'Producción, flota, carguío y riesgo se integran desde sus fuentes operacionales, sin planillas intermedias.' },
        { title: 'Interpretar la operación', description: 'NORTHMINE ordena las señales en estado, brecha y ritmo requerido para cerrar el turno.' },
        { title: 'Recomendar y auditar decisiones', description: 'Cada recomendación queda registrada junto a la acción tomada y su resultado posterior.' },
      ],
    },
    benefits: {
      title: 'Lo que diferencia a NORTHMINE.',
      items: [
        { title: 'Orientado a decisiones', description: 'Explica dónde está la brecha, qué la provoca y qué acción evaluar primero.' },
        { title: 'Conecta áreas', description: 'Producción, despacho, flota, mantenimiento, riesgos y plan comparten contexto.' },
        { title: 'Profundidad operacional', description: 'Permite bajar del resultado global al frente, pala, CAEX, ciclo o avería.' },
        { title: 'Trazabilidad', description: 'Vincula condición, evidencia, decisión, responsable, ejecución y resultado.' },
        { title: 'Integra sin reemplazar', description: 'Aprovecha los datos disponibles y conserva los sistemas fuente de la operación.' },
        { title: 'Continuidad compartida', description: 'Reduce la pérdida de contexto entre turnos, áreas y niveles de decisión.' },
      ],
    },
    evidence: {
      kicker: 'Evidencia del producto',
      title: 'Una lectura ejecutiva, no otra colección de KPI.',
      body: 'El Decision Cockpit concentra estado, brecha, ritmo, riesgo y acción. Esta única captura usa datos sintéticos identificados.',
    },
    stage: {
      toolbar: 'CAPTURA DEL DEMO · DATOS SINTÉTICOS',
      alt: 'Captura del Decision Cockpit de NORTHMINE mostrando la lectura ejecutiva del turno con datos de demostración sintéticos',
    },
    security: {
      kicker: 'Seguridad y transparencia',
      title: 'Acceso controlado, sin mezclar entornos.',
      points: [
        { label: 'Entorno demostrativo', detail: 'Separado del producto real, sin acceso a bases operacionales.' },
        { label: 'Datos sintéticos', detail: 'Valores representativos, identificados en cada pantalla del demo.' },
        { label: 'Autenticación', detail: 'Acceso individual, revisado antes de habilitarse.' },
        { label: 'Control administrativo', detail: 'Roles y permisos gestionados desde el panel de administración.' },
        { label: 'Persistencia', detail: 'Solicitudes almacenadas por separado de los datos operacionales.' },
        { label: 'Privacidad', detail: 'Tratamiento de datos documentado y disponible para revisión.' },
      ],
    },
    cta: {
      title: 'Vea NORTHMINE operando con contexto.',
      lead: 'Solicite acceso al entorno demostrativo y explore el Cockpit, los equipos y el Mapa Operacional 3D.',
      ctaDemo: 'Solicitar acceso',
      ctaAcceso: 'Acceder al demo',
    },
    footer: {
      tagline: 'Inteligencia operacional para minería a cielo abierto.',
      navHistoria: 'Nuestra historia',
      navPrivacidad: 'Privacidad',
      navSolicitar: 'Solicitar acceso',
      navAcceso: 'Acceso al demo',
      status: 'Demo con datos sintéticos',
      aria: 'Enlaces del pie',
    },
    meta: {
      title: 'NORTHMINE Intelligence | Decisiones operacionales mineras',
      description: 'NORTHMINE conecta producción, flota, carguío y riesgo para convertir señales operacionales dispersas en decisiones comprensibles y trazables.',
    },
  },
  en: {
    switcherAria: 'Change language',
    header: {
      skip: 'Skip to content',
      nav: {
        plataforma: 'Platform',
        propuesta: 'Approach',
        problema: 'Problem',
        diferencia: 'Difference',
        seguridad: 'Security',
        origen: 'Origin',
        demo: 'Demo',
      },
      acceder: 'Sign in',
      solicitarDemo: 'Request demo',
      ariaNav: 'Primary navigation',
      ariaMovil: 'Mobile navigation',
      ariaAbrir: 'Open navigation',
      ariaCerrar: 'Close navigation',
    },
    hero: {
      badge: 'Operational intelligence for mining',
      title1: 'See the full operation.',
      title2: 'Decide with context.',
      lead: 'NORTHMINE is a mining Command Center that turns scattered data into prioritized, explainable and traceable decisions during the shift.',
      ctaDemo: 'Request demo access',
      ctaExplorar: 'Explore the platform',
    },
    definition: {
      kicker: 'What NORTHMINE is',
      title: 'A decision layer on top of your operational systems.',
      body: 'NORTHMINE is a Command Center for open-pit mining. It integrates production, loading, hauling, maintenance, risks and planning into one common operational reading.',
      system: 'It turns scattered data into prioritized, explainable and traceable decisions within the shift.',
      sequence: ['Status', 'Gap', 'Cause', 'Risk', 'Action', 'Outcome'],
      boundaryLabel: 'Integrates',
      boundary: 'It does not replace dispatch, maintenance, SQL or the existing source systems.',
      ariaSequence: 'Operational decision sequence',
    },
    mineBand: {
      kicker: 'CONNECTED OPERATIONAL INTELLIGENCE',
      title1: 'One operation.',
      title2: 'One shared reading.',
      body: 'NORTHMINE brings together the signals that usually arrive separately and turns them into context for deciding during the shift.',
      signals: ['Production', 'Fleet', 'Loading', 'Risk', 'Plan'],
      aria: 'Signals connected by NORTHMINE',
    },
    problem: {
      kicker: 'The problem',
      title: 'The mine has data. The decision is still fragmented.',
      body: 'The challenge is not to produce another report. It is to relate the shift condition, its cause and the available action before the recovery window closes.',
      items: [
        { title: 'Fragmented information', description: 'Each area has correct data, but no shared operational view.' },
        { title: 'Gaps detected too late', description: 'By the time the deviation is understood, there is little time left to recover the shift.' },
        { title: 'Unprioritized indicators', description: 'Many KPIs show what happened, but not what to tackle first.' },
      ],
      answerKicker: 'The NORTHMINE answer',
      answerTitle: 'From multiple sources to one common operational reading.',
      transformations: [
        { before: 'Separate systems', after: 'Connected context' },
        { before: 'Isolated KPIs', after: 'Status, gap and cause' },
        { before: 'Flat alerts', after: 'Prioritized risk' },
        { before: 'Informal decisions', after: 'Traceable action and outcome' },
      ],
    },
    flow: {
      kicker: 'How it works',
      title: 'From scattered signal to traceable decision.',
      steps: [
        { title: 'Connect signals', description: 'Production, fleet, loading and risk are integrated from their operational sources, with no intermediate spreadsheets.' },
        { title: 'Interpret the operation', description: 'NORTHMINE orders the signals into status, gap and required pace to close the shift.' },
        { title: 'Recommend and audit decisions', description: 'Every recommendation is recorded alongside the action taken and its later outcome.' },
      ],
    },
    benefits: {
      title: 'What sets NORTHMINE apart.',
      items: [
        { title: 'Decision-oriented', description: 'Explains where the gap is, what causes it and which action to evaluate first.' },
        { title: 'Connects areas', description: 'Production, dispatch, fleet, maintenance, risks and plan share context.' },
        { title: 'Operational depth', description: 'Drills down from the global result to the bench, shovel, truck, cycle or breakdown.' },
        { title: 'Traceability', description: 'Links condition, evidence, decision, owner, execution and outcome.' },
        { title: 'Integrates without replacing', description: 'Leverages available data and keeps the operation’s source systems.' },
        { title: 'Shared continuity', description: 'Reduces context loss across shifts, areas and decision levels.' },
      ],
    },
    evidence: {
      kicker: 'Product evidence',
      title: 'An executive reading, not another KPI collection.',
      body: 'The Decision Cockpit concentrates status, gap, pace, risk and action. This single capture uses identified synthetic data.',
    },
    stage: {
      toolbar: 'DEMO CAPTURE · SYNTHETIC DATA',
      alt: 'Capture of the NORTHMINE Decision Cockpit showing the executive shift reading with synthetic demonstration data',
    },
    security: {
      kicker: 'Security and transparency',
      title: 'Controlled access, without mixing environments.',
      points: [
        { label: 'Demo environment', detail: 'Separate from the real product, with no access to operational databases.' },
        { label: 'Synthetic data', detail: 'Representative values, identified on every demo screen.' },
        { label: 'Authentication', detail: 'Individual access, reviewed before being enabled.' },
        { label: 'Administrative control', detail: 'Roles and permissions managed from the admin panel.' },
        { label: 'Persistence', detail: 'Requests stored separately from operational data.' },
        { label: 'Privacy', detail: 'Data handling documented and available for review.' },
      ],
    },
    cta: {
      title: 'See NORTHMINE operating with context.',
      lead: 'Request access to the demo environment and explore the Cockpit, the equipment and the 3D Operational Map.',
      ctaDemo: 'Request access',
      ctaAcceso: 'Go to demo',
    },
    footer: {
      tagline: 'Operational intelligence for open-pit mining.',
      navHistoria: 'Our story',
      navPrivacidad: 'Privacy',
      navSolicitar: 'Request access',
      navAcceso: 'Demo access',
      status: 'Demo with synthetic data',
      aria: 'Footer links',
    },
    meta: {
      title: 'NORTHMINE Intelligence | Mining operational decisions',
      description: 'NORTHMINE connects production, fleet, loading and risk to turn scattered operational signals into understandable, traceable decisions.',
    },
  },
  de: {
    switcherAria: 'Sprache ändern',
    header: {
      skip: 'Zum Inhalt springen',
      nav: {
        plataforma: 'Plattform',
        propuesta: 'Ansatz',
        problema: 'Problem',
        diferencia: 'Unterschied',
        seguridad: 'Sicherheit',
        origen: 'Ursprung',
        demo: 'Demo',
      },
      acceder: 'Anmelden',
      solicitarDemo: 'Demo anfordern',
      ariaNav: 'Hauptnavigation',
      ariaMovil: 'Mobile Navigation',
      ariaAbrir: 'Navigation öffnen',
      ariaCerrar: 'Navigation schließen',
    },
    hero: {
      badge: 'Operative Intelligenz für den Bergbau',
      title1: 'Beobachten Sie den gesamten Betrieb.',
      title2: 'Entscheiden Sie mit Kontext.',
      lead: 'NORTHMINE ist ein Mining Command Center, das verstreute Daten während der Schicht in priorisierte, erklärbare und nachvollziehbare Entscheidungen verwandelt.',
      ctaDemo: 'Demo-Zugang anfordern',
      ctaExplorar: 'Plattform erkunden',
    },
    definition: {
      kicker: 'Was NORTHMINE ist',
      title: 'Eine Entscheidungsebene über Ihren Betriebssystemen.',
      body: 'NORTHMINE ist ein Command Center für den Tagebau. Es integriert Produktion, Beladung, Transport, Wartung, Risiken und Planung in eine gemeinsame operative Lesart.',
      system: 'Verwandelt verstreute Daten innerhalb der Schicht in priorisierte, erklärbare und nachvollziehbare Entscheidungen.',
      sequence: ['Status', 'Lücke', 'Ursache', 'Risiko', 'Aktion', 'Ergebnis'],
      boundaryLabel: 'Integriert',
      boundary: 'Ersetzt weder Disposition, Wartung, SQL noch die bestehenden Quellsysteme.',
      ariaSequence: 'Operative Entscheidungssequenz',
    },
    mineBand: {
      kicker: 'VERBUNDENE OPERATIVE INTELLIGENZ',
      title1: 'Ein Betrieb.',
      title2: 'Eine gemeinsame Lesart.',
      body: 'NORTHMINE führt die Signale zusammen, die normalerweise getrennt eintreffen, und macht daraus Kontext für Entscheidungen während der Schicht.',
      signals: ['Produktion', 'Flotte', 'Beladung', 'Risiko', 'Plan'],
      aria: 'Von NORTHMINE verbundene Signale',
    },
    problem: {
      kicker: 'Das Problem',
      title: 'Das Bergwerk hat Daten. Die Entscheidung bleibt fragmentiert.',
      body: 'Die Herausforderung ist nicht ein weiterer Bericht. Es geht darum, den Zustand der Schicht, ihre Ursache und die verfügbare Aktion zu verknüpfen, bevor das Zeitfenster schließt.',
      items: [
        { title: 'Fragmentierte Informationen', description: 'Jede Abteilung hat korrekte Daten, aber keine gemeinsame operative Sicht.' },
        { title: 'Lücken zu spät erkannt', description: 'Wenn die Abweichung verstanden wird, bleibt wenig Zeit, die Schicht zu retten.' },
        { title: 'Indikatoren ohne Priorität', description: 'Viele KPIs zeigen, was passiert ist, aber nicht, was zuerst zu tun ist.' },
      ],
      answerKicker: 'Die NORTHMINE-Antwort',
      answerTitle: 'Von vielen Quellen zu einer gemeinsamen operativen Lesart.',
      transformations: [
        { before: 'Getrennte Systeme', after: 'Verbundener Kontext' },
        { before: 'Isolierte KPIs', after: 'Status, Lücke und Ursache' },
        { before: 'Flache Alarme', after: 'Priorisiertes Risiko' },
        { before: 'Informelle Entscheidungen', after: 'Nachvollziehbare Aktion und Ergebnis' },
      ],
    },
    flow: {
      kicker: 'So funktioniert es',
      title: 'Vom verstreuten Signal zur nachvollziehbaren Entscheidung.',
      steps: [
        { title: 'Signale verbinden', description: 'Produktion, Flotte, Beladung und Risiko werden direkt aus ihren operativen Quellen integriert, ohne Zwischentabellen.' },
        { title: 'Betrieb interpretieren', description: 'NORTHMINE ordnet die Signale in Status, Lücke und erforderliches Tempo, um die Schicht zu schließen.' },
        { title: 'Entscheidungen empfehlen und prüfen', description: 'Jede Empfehlung wird zusammen mit der getroffenen Aktion und ihrem späteren Ergebnis protokolliert.' },
      ],
    },
    benefits: {
      title: 'Was NORTHMINE auszeichnet.',
      items: [
        { title: 'Entscheidungsorientiert', description: 'Erklärt, wo die Lücke liegt, was sie verursacht und welche Aktion zuerst zu prüfen ist.' },
        { title: 'Verbindet Bereiche', description: 'Produktion, Disposition, Flotte, Wartung, Risiken und Plan teilen Kontext.' },
        { title: 'Operative Tiefe', description: 'Erlaubt den Weg vom Gesamtergebnis bis zum Front, Bagger, LKW, Zyklus oder Ausfall.' },
        { title: 'Nachvollziehbarkeit', description: 'Verknüpft Zustand, Evidenz, Entscheidung, Verantwortlichen, Umsetzung und Ergebnis.' },
        { title: 'Integriert statt ersetzt', description: 'Nutzt verfügbare Daten und erhält die Quellsysteme des Betriebs.' },
        { title: 'Geteilte Kontinuität', description: 'Reduziert Kontextverluste zwischen Schichten, Bereichen und Entscheidungsebenen.' },
      ],
    },
    evidence: {
      kicker: 'Produktevidenz',
      title: 'Eine Führungslesart, keine weitere KPI-Sammlung.',
      body: 'Der Decision Cockpit bündelt Status, Lücke, Tempo, Risiko und Aktion. Diese eine Aufnahme verwendet gekennzeichnete synthetische Daten.',
    },
    stage: {
      toolbar: 'DEMO-AUFNAHME · SYNTHETISCHE DATEN',
      alt: 'Aufnahme des NORTHMINE Decision Cockpit mit der operativen Schichtlesart und synthetischen Demodaten',
    },
    security: {
      kicker: 'Sicherheit und Transparenz',
      title: 'Kontrollierter Zugriff ohne Vermischung der Umgebungen.',
      points: [
        { label: 'Demo-Umgebung', detail: 'Getrennt vom echten Produkt, ohne Zugriff auf operative Datenbanken.' },
        { label: 'Synthetische Daten', detail: 'Repräsentative Werte, auf jedem Demo-Bildschirm gekennzeichnet.' },
        { label: 'Authentifizierung', detail: 'Individueller Zugriff, vor der Freischaltung geprüft.' },
        { label: 'Administrative Kontrolle', detail: 'Rollen und Berechtigungen werden über das Admin-Panel verwaltet.' },
        { label: 'Speicherung', detail: 'Anfragen getrennt von operativen Daten gespeichert.' },
        { label: 'Datenschutz', detail: 'Datenbehandlung dokumentiert und zur Prüfung verfügbar.' },
      ],
    },
    cta: {
      title: 'Sehen Sie NORTHMINE mit Kontext in Betrieb.',
      lead: 'Fordern Sie Zugang zur Demo-Umgebung an und erkunden Sie Cockpit, Ausrüstung und die 3D-Betriebskarte.',
      ctaDemo: 'Zugang anfordern',
      ctaAcceso: 'Zur Demo',
    },
    footer: {
      tagline: 'Operative Intelligenz für den Tagebau.',
      navHistoria: 'Unsere Geschichte',
      navPrivacidad: 'Datenschutz',
      navSolicitar: 'Zugang anfordern',
      navAcceso: 'Demo-Zugang',
      status: 'Demo mit synthetischen Daten',
      aria: 'Fußzeilen-Links',
    },
    meta: {
      title: 'NORTHMINE Intelligence | Operative Bergbau-Entscheidungen',
      description: 'NORTHMINE verbindet Produktion, Flotte, Beladung und Risiko, um verstreute Betriebssignale in verständliche, nachvollziehbare Entscheidungen zu verwandeln.',
    },
  },
  zh: {
    switcherAria: '切换语言',
    header: {
      skip: '跳到主要内容',
      nav: {
        plataforma: '平台',
        propuesta: '方案',
        problema: '问题',
        diferencia: '差异',
        seguridad: '安全',
        origen: '起源',
        demo: '演示',
      },
      acceder: '登录',
      solicitarDemo: '申请演示',
      ariaNav: '主导航',
      ariaMovil: '移动导航',
      ariaAbrir: '打开导航',
      ariaCerrar: '关闭导航',
    },
    hero: {
      badge: '面向矿业的运营智能',
      title1: '纵览完整运营。',
      title2: '基于全局背景决策。',
      lead: 'NORTHMINE 是一个矿业指挥中心，将分散的数据在班次内转化为优先级明确、可解释、可追溯的决策。',
      ctaDemo: '申请演示访问',
      ctaExplorar: '探索平台',
    },
    definition: {
      kicker: '什么是 NORTHMINE',
      title: '在您的运营系统之上的一层决策能力。',
      body: 'NORTHMINE 是面向露天矿的指挥中心，将生产、装载、运输、维护、风险与计划整合为统一的运营视图。',
      system: '在班次内将分散数据转化为优先级明确、可解释、可追溯的决策。',
      sequence: ['状态', '差距', '原因', '风险', '行动', '结果'],
      boundaryLabel: '集成',
      boundary: '不取代调度、维护、SQL 或现有的源系统。',
      ariaSequence: '运营决策序列',
    },
    mineBand: {
      kicker: '互联运营智能',
      title1: '同一运营。',
      title2: '同一共享视图。',
      body: 'NORTHMINE 将通常孤立到达的信号汇集起来，转化为班次内决策所需的背景信息。',
      signals: ['生产', '车队', '装载', '风险', '计划'],
      aria: 'NORTHMINE 连接的信号',
    },
    problem: {
      kicker: '问题所在',
      title: '矿山有数据，但决策仍然碎片化。',
      body: '挑战不是再生成一份报告，而是在恢复窗口关闭之前，将班次状态、其原因与可用行动关联起来。',
      items: [
        { title: '信息碎片化', description: '每个部门都有正确的数据，但没有共享的运营视图。' },
        { title: '差距发现过晚', description: '当偏差被理解时，留给挽回班次的时间已经不多了。' },
        { title: '指标缺乏优先级', description: '许多 KPI 只展示发生了什么，却不说明该先处理什么。' },
      ],
      answerKicker: 'NORTHMINE 的答案',
      answerTitle: '从多个来源走向统一的运营视图。',
      transformations: [
        { before: '各自独立的系统', after: '互联的背景信息' },
        { before: '孤立的 KPI', after: '状态、差距与原因' },
        { before: '平面化告警', after: '优先级化的风险' },
        { before: '非正式决策', after: '可追溯的行动与结果' },
      ],
    },
    flow: {
      kicker: '工作方式',
      title: '从分散信号到可追溯决策。',
      steps: [
        { title: '连接信号', description: '生产、车队、装载与风险直接从运营源集成，无需中间表格。' },
        { title: '解读运营', description: 'NORTHMINE 将信号整理为状态、差距与所需节奏，以完成班次。' },
        { title: '推荐与审计决策', description: '每条建议连同所采取的行动及后续结果一并记录。' },
      ],
    },
    benefits: {
      title: 'NORTHMINE 的与众不同。',
      items: [
        { title: '面向决策', description: '说明差距在哪里、由什么引起以及应优先评估哪项行动。' },
        { title: '连通部门', description: '生产、调度、车队、维护、风险与计划共享背景信息。' },
        { title: '运营深度', description: '可从全局结果下钻到作业面、电铲、卡车、循环或故障。' },
        { title: '可追溯性', description: '将状态、证据、决策、责任人、执行与结果关联起来。' },
        { title: '集成而不替换', description: '利用现有数据并保留运营的源系统。' },
        { title: '共享连续性', description: '减少班次、部门与决策层级之间的背景信息流失。' },
      ],
    },
    evidence: {
      kicker: '产品实证',
      title: '一份执行级视图，而非又一个 KPI 集合。',
      body: 'Decision Cockpit 汇集状态、差距、节奏、风险与行动。这一张截图使用已标识的合成数据。',
    },
    stage: {
      toolbar: '演示截图 · 合成数据',
      alt: 'NORTHMINE Decision Cockpit 截图，展示班次执行视图与合成演示数据',
    },
    security: {
      kicker: '安全与透明',
      title: '受控访问，不混淆环境。',
      points: [
        { label: '演示环境', detail: '与真实产品隔离，不接触运营数据库。' },
        { label: '合成数据', detail: '具有代表性的数值，在每个演示屏幕上有标识。' },
        { label: '身份认证', detail: '个人访问权限，启用前经过审核。' },
        { label: '管理控制', detail: '角色与权限通过管理面板管理。' },
        { label: '持久化', detail: '请求与运营数据分开存储。' },
        { label: '隐私', detail: '数据处理已文档化并可查阅。' },
      ],
    },
    cta: {
      title: '观看 NORTHMINE 在真实背景中运行。',
      lead: '申请访问演示环境，探索 Cockpit、设备与 3D 运营地图。',
      ctaDemo: '申请访问',
      ctaAcceso: '进入演示',
    },
    footer: {
      tagline: '面向露天矿的运营智能。',
      navHistoria: '我们的故事',
      navPrivacidad: '隐私',
      navSolicitar: '申请访问',
      navAcceso: '演示访问',
      status: '使用合成数据的演示',
      aria: '页脚链接',
    },
    meta: {
      title: 'NORTHMINE Intelligence | 矿业运营决策',
      description: 'NORTHMINE 连接生产、车队、装载与风险，将分散的运营信号转化为清晰、可追溯的决策。',
    },
  },
  ar: {
    switcherAria: 'تغيير اللغة',
    header: {
      skip: 'تخطي إلى المحتوى',
      nav: {
        plataforma: 'المنصة',
        propuesta: 'النهج',
        problema: 'المشكلة',
        diferencia: 'الفرق',
        seguridad: 'الأمان',
        origen: 'المنشأ',
        demo: 'العرض',
      },
      acceder: 'تسجيل الدخول',
      solicitarDemo: 'طلب عرض',
      ariaNav: 'التنقل الرئيسي',
      ariaMovil: 'تنقل الجوال',
      ariaAbrir: 'فتح التنقل',
      ariaCerrar: 'إغلاق التنقل',
    },
    hero: {
      badge: 'ذكاء تشغيلي للتعدين',
      title1: 'راقب العملية كاملة.',
      title2: 'قرر بمعرفة السياق.',
      lead: 'NORTHMINE هو مركز قيادة تعديني يحوّل البيانات المبعثرة إلى قرارات مرتّبة بالأولوية وقابلة للتفسير والتتبع أثناء الوردية.',
      ctaDemo: 'طلب الوصول للعرض',
      ctaExplorar: 'استكشف المنصة',
    },
    definition: {
      kicker: 'ما هو NORTHMINE',
      title: 'طبقة قرار فوق أنظمتكم التشغيلية.',
      body: 'NORTHMINE هو مركز قيادة للتعدين المكشوف، يدمج الإنتاج والتحميل والنقل والصيانة والمخاطر والتخطيط في قراءة تشغيلية موحدة.',
      system: 'يحوّل البيانات المبعثرة إلى قرارات مرتّبة بالأولوية وقابلة للتفسير والتتبع خلال الوردية.',
      sequence: ['الحالة', 'الفجوة', 'السبب', 'الخطر', 'الإجراء', 'النتيجة'],
      boundaryLabel: 'يدمج',
      boundary: 'لا يستبدل نظام التوزيع ولا الصيانة ولا SQL ولا الأنظمة المصدرية القائمة.',
      ariaSequence: 'تسلسل القرار التشغيلي',
    },
    mineBand: {
      kicker: 'ذكاء تشغيلي مترابط',
      title1: 'عملية واحدة.',
      title2: 'قراءة مشتركة واحدة.',
      body: 'يجمع NORTHMINE الإشارات التي تصل عادةً منفصلة ويحوّلها إلى سياق للقرار أثناء الوردية.',
      signals: ['الإنتاج', 'الأسطول', 'التحميل', 'المخاطر', 'الخطة'],
      aria: 'الإشارات التي يربطها NORTHMINE',
    },
    problem: {
      kicker: 'المشكلة',
      title: 'المنجم لديه البيانات، لكن القرار ما زال مجزّأً.',
      body: 'التحدي ليس إنتاج تقرير آخر، بل ربط حالة الوردية وسببها والإجراء المتاح قبل أن تُغلق نافذة التعافي.',
      items: [
        { title: 'معلومات مجزّأة', description: 'لكل منطقة بيانات صحيحة، لكن لا توجد رؤية تشغيلية مشتركة.' },
        { title: 'فجوات تُكتشف متأخراً', description: 'عندما يُفهم الانحراف، يتبقى وقت قليل لتعويض الوردية.' },
        { title: 'مؤشرات بلا أولوية', description: 'العديد من المؤشرات تعرض ما حدث، لكنها لا تفسر ما يجب معالجته أولاً.' },
      ],
      answerKicker: 'إجابة NORTHMINE',
      answerTitle: 'من مصادر متعددة إلى قراءة تشغيلية موحدة.',
      transformations: [
        { before: 'أنظمة منفصلة', after: 'سياق مترابط' },
        { before: 'مؤشرات معزولة', after: 'الحالة والفجوة والسبب' },
        { before: 'تنبيهات مسطحة', after: 'مخاطر مرتّبة' },
        { before: 'قرارات غير رسمية', after: 'إجراء ونتيجة قابلان للتتبع' },
      ],
    },
    flow: {
      kicker: 'كيف يعمل',
      title: 'من إشارة مبعثرة إلى قرار قابل للتتبع.',
      steps: [
        { title: 'ربط الإشارات', description: 'يتم دمج الإنتاج والأسطول والتحميل والمخاطر من مصادرها التشغيلية دون جداول وسيطة.' },
        { title: 'تفسير العملية', description: 'يرتّب NORTHMINE الإشارات في الحالة والفجوة والوتيرة المطلوبة لإتمام الوردية.' },
        { title: 'التوصية ومراجعة القرارات', description: 'يُسجَّل كل اقتراح إلى جانب الإجراء المتخذ ونتيجته اللاحقة.' },
      ],
    },
    benefits: {
      title: 'ما يميز NORTHMINE.',
      items: [
        { title: 'موجّه للقرار', description: 'يشرح مكان الفجوة، وما سببها، وأي إجراء يجب تقييمه أولاً.' },
        { title: 'يربط المناطق', description: 'الإنتاج والتوزيع والأسطول والصيانة والمخاطر والخطة تتبادل السياق.' },
        { title: 'عمق تشغيلي', description: 'يتيح النزول من النتيجة الإجمالية إلى الوجه، والمجارف، والشاحنات، والدورة، أو العطل.' },
        { title: 'التتبع', description: 'يربط الحالة والأدلة والقرار والمسؤول والتنفيذ والنتيجة.' },
        { title: 'دمج دون استبدال', description: 'يستفيد من البيانات المتاحة ويحافظ على الأنظمة المصدرية للعملية.' },
        { title: 'استمرارية مشتركة', description: 'يقلل فقدان السياق بين الورديات والمناطق ومستويات القرار.' },
      ],
    },
    evidence: {
      kicker: 'أدلة المنتج',
      title: 'قراءة تنفيذية، لا مجموعة مؤشرات أخرى.',
      body: 'يركّز Decision Cockpit الحالة والفجوة والوتيرة والخطر والإجراء. هذه اللقطة الواحدة تستخدم بيانات اصطناعية محددة.',
    },
    stage: {
      toolbar: 'لقطة العرض · بيانات اصطناعية',
      alt: 'لقطة من Decision Cockpit الخاص بـ NORTHMINE تعرض قراءة الوردية التنفيذية ببيانات عرض اصطناعية',
    },
    security: {
      kicker: 'الأمان والشفافية',
      title: 'وصول محكوم دون خلط البيئات.',
      points: [
        { label: 'بيئة العرض', detail: 'منفصلة عن المنتج الحقيقي، دون الوصول إلى قواعد البيانات التشغيلية.' },
        { label: 'بيانات اصطناعية', detail: 'قيم تمثيلية محددة على كل شاشة في العرض.' },
        { label: 'المصادقة', detail: 'وصول فردي يُراجَع قبل تفعيله.' },
        { label: 'التحكم الإداري', detail: 'الأدوار والصلاحيات تُدار من لوحة الإدارة.' },
        { label: 'التخزين', detail: 'الطلبات تُخزَّن منفصلة عن البيانات التشغيلية.' },
        { label: 'الخصوصية', detail: 'معالجة البيانات موثقة ومتاحة للمراجعة.' },
      ],
    },
    cta: {
      title: 'شاهد NORTHMINE يعمل بمعرفة السياق.',
      lead: 'اطلب الوصول إلى بيئة العرض واستكشف الكوكبيت والمعدات وخريطة التشغيل ثلاثية الأبعاد.',
      ctaDemo: 'طلب الوصول',
      ctaAcceso: 'الدخول إلى العرض',
    },
    footer: {
      tagline: 'ذكاء تشغيلي للتعدين المكشوف.',
      navHistoria: 'قصتنا',
      navPrivacidad: 'الخصوصية',
      navSolicitar: 'طلب الوصول',
      navAcceso: 'الوصول للعرض',
      status: 'عرض ببيانات اصطناعية',
      aria: 'روابط التذييل',
    },
    meta: {
      title: 'NORTHMINE Intelligence | قرارات تشغيلية تعدينية',
      description: 'يربط NORTHMINE الإنتاج والأسطول والتحميل والمخاطر لتحويل الإشارات التشغيلية المبعثرة إلى قرارات واضحة وقابلة للتتبع.',
    },
  },
  ru: {
    switcherAria: 'Сменить язык',
    header: {
      skip: 'Перейти к содержимому',
      nav: {
        plataforma: 'Платформа',
        propuesta: 'Подход',
        problema: 'Проблема',
        diferencia: 'Отличие',
        seguridad: 'Безопасность',
        origen: 'История',
        demo: 'Демо',
      },
      acceder: 'Войти',
      solicitarDemo: 'Запросить демо',
      ariaNav: 'Основная навигация',
      ariaMovil: 'Мобильная навигация',
      ariaAbrir: 'Открыть навигацию',
      ariaCerrar: 'Закрыть навигацию',
    },
    hero: {
      badge: 'Операционный интеллект для горнодобывающей отрасли',
      title1: 'Наблюдайте за операцией целиком.',
      title2: 'Принимайте решения с контекстом.',
      lead: 'NORTHMINE — это горнодобывающий командный центр, который превращает разрозненные данные в приоритизированные, объяснимые и прослеживаемые решения в течение смены.',
      ctaDemo: 'Запросить доступ к демо',
      ctaExplorar: 'Изучить платформу',
    },
    definition: {
      kicker: 'Что такое NORTHMINE',
      title: 'Уровень принятия решений поверх ваших операционных систем.',
      body: 'NORTHMINE — это командный центр для открытых горных работ. Он объединяет производство, погрузку, транспортировку, техническое обслуживание, риски и планирование в единую операционную картину.',
      system: 'Превращает разрозненные данные в приоритизированные, объяснимые и прослеживаемые решения в рамках смены.',
      sequence: ['Состояние', 'Разрыв', 'Причина', 'Риск', 'Действие', 'Результат'],
      boundaryLabel: 'Интегрирует',
      boundary: 'Не заменяет диспетчеризацию, обслуживание, SQL и существующие системы-источники.',
      ariaSequence: 'Последовательность операционных решений',
    },
    mineBand: {
      kicker: 'СВЯЗАННЫЙ ОПЕРАЦИОННЫЙ ИНТЕЛЛЕКТ',
      title1: 'Одна операция.',
      title2: 'Общая картина.',
      body: 'NORTHMINE объединяет сигналы, которые обычно приходят раздельно, и превращает их в контекст для решений в течение смены.',
      signals: ['Производство', 'Флот', 'Погрузка', 'Риск', 'План'],
      aria: 'Сигналы, объединяемые NORTHMINE',
    },
    problem: {
      kicker: 'Проблема',
      title: 'На руднике есть данные. Решения всё ещё разрозненны.',
      body: 'Задача — не создать ещё один отчёт, а связать состояние смены, его причину и доступное действие до того, как закроется окно восстановления.',
      items: [
        { title: 'Разрозненная информация', description: 'У каждой службы есть корректные данные, но нет общей операционной картины.' },
        { title: 'Разрывы замечают поздно', description: 'Когда отклонение осознано, на восстановление смены остаётся мало времени.' },
        { title: 'Показатели без приоритета', description: 'Многие KPI показывают, что произошло, но не объясняют, за что взяться в первую очередь.' },
      ],
      answerKicker: 'Ответ NORTHMINE',
      answerTitle: 'От множества источников к единой операционной картине.',
      transformations: [
        { before: 'Разрозненные системы', after: 'Связанный контекст' },
        { before: 'Изолированные KPI', after: 'Состояние, разрыв и причина' },
        { before: 'Плоские оповещения', after: 'Приоритизированный риск' },
        { before: 'Неформальные решения', after: 'Прослеживаемые действие и результат' },
      ],
    },
    flow: {
      kicker: 'Как это работает',
      title: 'От разрозненного сигнала к прослеживаемому решению.',
      steps: [
        { title: 'Связываем сигналы', description: 'Производство, флот, погрузка и риск интегрируются напрямую из операционных источников, без промежуточных таблиц.' },
        { title: 'Интерпретируем операцию', description: 'NORTHMINE упорядочивает сигналы в состояние, разрыв и требуемый темп для завершения смены.' },
        { title: 'Рекомендуем и аудируем решения', description: 'Каждая рекомендация фиксируется вместе с принятым действием и его последующим результатом.' },
      ],
    },
    benefits: {
      title: 'Что отличает NORTHMINE.',
      items: [
        { title: 'Ориентация на решения', description: 'Объясняет, где разрыв, что его вызывает и какое действие оценить первым.' },
        { title: 'Связывает службы', description: 'Производство, диспетчеризация, флот, обслуживание, риски и план обмениваются контекстом.' },
        { title: 'Операционная глубина', description: 'Позволяет спускаться от общего результата к забою, экскаватору, самосвалу, циклу или поломке.' },
        { title: 'Прослеживаемость', description: 'Связывает состояние, доказательства, решение, ответственного, исполнение и результат.' },
        { title: 'Интеграция без замены', description: 'Использует доступные данные и сохраняет системы-источники операции.' },
        { title: 'Общая преемственность', description: 'Снижает потерю контекста между сменами, службами и уровнями решений.' },
      ],
    },
    evidence: {
      kicker: 'Доказательства продукта',
      title: 'Управленческая картина, а не очередная коллекция KPI.',
      body: 'Decision Cockpit объединяет состояние, разрыв, темп, риск и действие. Этот единственный снимок использует помеченные синтетические данные.',
    },
    stage: {
      toolbar: 'СНИМОК ДЕМО · СИНТЕТИЧЕСКИЕ ДАННЫЕ',
      alt: 'Снимок Decision Cockpit от NORTHMINE с исполнительной картиной смены на синтетических демо-данных',
    },
    security: {
      kicker: 'Безопасность и прозрачность',
      title: 'Контролируемый доступ без смешивания сред.',
      points: [
        { label: 'Демо-среда', detail: 'Отделена от реального продукта, без доступа к операционным базам данных.' },
        { label: 'Синтетические данные', detail: 'Репрезентативные значения, помеченные на каждом экране демо.' },
        { label: 'Аутентификация', detail: 'Индивидуальный доступ, проверяемый перед активацией.' },
        { label: 'Административный контроль', detail: 'Роли и права управляются через админ-панель.' },
        { label: 'Хранение', detail: 'Заявки хранятся отдельно от операционных данных.' },
        { label: 'Конфиденциальность', detail: 'Обработка данных задокументирована и доступна для проверки.' },
      ],
    },
    cta: {
      title: 'Увидьте NORTHMINE в работе с контекстом.',
      lead: 'Запросите доступ к демо-среде и изучите Cockpit, оборудование и 3D-карту операций.',
      ctaDemo: 'Запросить доступ',
      ctaAcceso: 'Перейти к демо',
    },
    footer: {
      tagline: 'Операционный интеллект для открытых горных работ.',
      navHistoria: 'Наша история',
      navPrivacidad: 'Конфиденциальность',
      navSolicitar: 'Запросить доступ',
      navAcceso: 'Доступ к демо',
      status: 'Демо с синтетическими данными',
      aria: 'Ссылки подвала',
    },
    meta: {
      title: 'NORTHMINE Intelligence | Операционные решения для горной добычи',
      description: 'NORTHMINE связывает производство, флот, погрузку и риски, превращая разрозненные операционные сигналы в понятные и прослеживаемые решения.',
    },
  },
}
