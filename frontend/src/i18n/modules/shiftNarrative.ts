import type { ModuleDict } from '../useModuleT'

export interface ShiftNarrativeT {
  estado_sobre_meta: string
  estado_cerca_meta: string
  estado_brecha_moderada: string
  estado_brecha_importante: string
  parrafo1: (p: { shiftLabel: string; fecha: string; horas: number; minutos: string; toneladas: string; meta: string; cumplimiento: string; estado: string }) => string
  brecha_sufijo: (toneladas: string) => string
  lidera_turno: (caexId: string, toneladas: string, ciclos: number) => string
  caex_bajo_promedio: (n: number) => string
  sin_actividad: (n: number) => string
  posible_averia: (n: number) => string
  anomalias_criticas: (n: number) => string
  lo_destacado: (parts: string) => string
  causa_criticas: (n: number) => string
  causa_bajo_promedio: (n: number) => string
  causa_posible_averia: (n: number) => string
  brecha_explicada: (causas: string) => string
  sin_causa_evidente: string
  sobre_meta_mensaje: string
}

export const shiftNarrativeT: ModuleDict<ShiftNarrativeT> = {
  es: {
    estado_sobre_meta: 'sobre la meta',
    estado_cerca_meta: 'cerca de la meta',
    estado_brecha_moderada: 'bajo la meta, con brecha moderada',
    estado_brecha_importante: 'con una brecha importante respecto a la meta',
    parrafo1: (p) =>
      `El ${p.shiftLabel.toLowerCase()} del ${p.fecha} lleva ${p.horas}h ${p.minutos}m transcurridas, `
      + `con ${p.toneladas} movidas de una meta de ${p.meta} (${p.cumplimiento}%). `
      + `El turno esta ${p.estado}`,
    brecha_sufijo: (toneladas) => `, con ${toneladas} de brecha.`,
    lidera_turno: (caexId, toneladas, ciclos) => `${caexId} lidera el turno con ${toneladas} en ${ciclos} ciclos`,
    caex_bajo_promedio: (n) => `${n} ${n === 1 ? 'CAEX opera' : 'CAEX operan'} bajo el 80% del promedio de la flota`,
    sin_actividad: (n) => `${n} sin actividad reciente`,
    posible_averia: (n) => `${n} con posible averia`,
    anomalias_criticas: (n) => `${n} ${n === 1 ? 'anomalia critica de ciclo' : 'anomalias criticas de ciclo'} activas`,
    lo_destacado: (parts) => `Lo destacado: ${parts}.`,
    causa_criticas: (n) => `las ${n} anomalias criticas de ciclo (equipos detenidos mas tiempo del habitual)`,
    causa_bajo_promedio: (n) => `los ${n} equipos bajo promedio`,
    causa_posible_averia: (n) => `${n} equipos con posible averia`,
    brecha_explicada: (causas) => `La brecha se explica en parte por ${causas}. Revisar esos equipos primero antes de reforzar con recursos adicionales.`,
    sin_causa_evidente: 'No hay una causa unica evidente en los datos disponibles (sin anomalias ni equipos bajo promedio destacados); revisar condiciones de frente, clima o disponibilidad de flota.',
    sobre_meta_mensaje: 'Turno sobre meta: mantener el ritmo actual y monitorear que no aparezcan anomalias de ciclo en las horas restantes.',
  },
  en: {
    estado_sobre_meta: 'above target',
    estado_cerca_meta: 'close to target',
    estado_brecha_moderada: 'below target, with a moderate gap',
    estado_brecha_importante: 'with a significant gap versus target',
    parrafo1: (p) =>
      `The ${p.shiftLabel.toLowerCase()} of ${p.fecha} is ${p.horas}h ${p.minutos}m in, `
      + `with ${p.toneladas} moved against a target of ${p.meta} (${p.cumplimiento}%). `
      + `The shift is ${p.estado}`,
    brecha_sufijo: (toneladas) => `, with a gap of ${toneladas}.`,
    lidera_turno: (caexId, toneladas, ciclos) => `${caexId} leads the shift with ${toneladas} in ${ciclos} cycles`,
    caex_bajo_promedio: (n) => `${n} ${n === 1 ? 'CAEX is' : 'CAEX are'} running below 80% of the fleet average`,
    sin_actividad: (n) => `${n} with no recent activity`,
    posible_averia: (n) => `${n} with a possible breakdown`,
    anomalias_criticas: (n) => `${n} active critical cycle ${n === 1 ? 'anomaly' : 'anomalies'}`,
    lo_destacado: (parts) => `Highlights: ${parts}.`,
    causa_criticas: (n) => `the ${n} critical cycle ${n === 1 ? 'anomaly' : 'anomalies'} (equipment stopped longer than usual)`,
    causa_bajo_promedio: (n) => `the ${n} below-average units`,
    causa_posible_averia: (n) => `${n} units with a possible breakdown`,
    brecha_explicada: (causas) => `The gap is partly explained by ${causas}. Review those units first before adding extra resources.`,
    sin_causa_evidente: 'There is no single clear cause in the available data (no anomalies or below-average units stand out); check face conditions, weather or fleet availability.',
    sobre_meta_mensaje: 'Shift above target: keep the current pace and watch for cycle anomalies in the remaining hours.',
  },
  de: {
    estado_sobre_meta: 'ueber dem Ziel',
    estado_cerca_meta: 'nahe am Ziel',
    estado_brecha_moderada: 'unter dem Ziel, mit moderater Luecke',
    estado_brecha_importante: 'mit einer erheblichen Luecke gegenueber dem Ziel',
    parrafo1: (p) =>
      `Die ${p.shiftLabel.toLowerCase()} vom ${p.fecha} ist ${p.horas}h ${p.minutos}m im Gange, `
      + `mit ${p.toneladas} bewegt gegenueber einem Ziel von ${p.meta} (${p.cumplimiento}%). `
      + `Die Schicht liegt ${p.estado}`,
    brecha_sufijo: (toneladas) => `, mit einer Luecke von ${toneladas}.`,
    lidera_turno: (caexId, toneladas, ciclos) => `${caexId} fuehrt die Schicht mit ${toneladas} in ${ciclos} Zyklen an`,
    caex_bajo_promedio: (n) => `${n} ${n === 1 ? 'CAEX arbeitet' : 'CAEX arbeiten'} unter 80% des Flottendurchschnitts`,
    sin_actividad: (n) => `${n} ohne kuerzliche Aktivitaet`,
    posible_averia: (n) => `${n} mit moeglicher Stoerung`,
    anomalias_criticas: (n) => `${n} ${n === 1 ? 'kritische Zyklusanomalie' : 'kritische Zyklusanomalien'} aktiv`,
    lo_destacado: (parts) => `Hervorzuheben: ${parts}.`,
    causa_criticas: (n) => `die ${n} kritischen Zyklusanomalien (Geraete laenger als ueblich stillstehend)`,
    causa_bajo_promedio: (n) => `die ${n} unterdurchschnittlichen Geraete`,
    causa_posible_averia: (n) => `${n} Geraete mit moeglicher Stoerung`,
    brecha_explicada: (causas) => `Die Luecke ist teilweise durch ${causas} erklaerbar. Diese Geraete zuerst pruefen, bevor zusaetzliche Ressourcen eingesetzt werden.`,
    sin_causa_evidente: 'In den verfuegbaren Daten gibt es keine eindeutige Ursache (keine Anomalien oder auffaellige unterdurchschnittliche Geraete); Bedingungen an der Abbaufront, Wetter oder Flottenverfuegbarkeit pruefen.',
    sobre_meta_mensaje: 'Schicht ueber dem Ziel: aktuelles Tempo beibehalten und ueberwachen, dass in den verbleibenden Stunden keine Zyklusanomalien auftreten.',
  },
}
