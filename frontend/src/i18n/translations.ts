export type LangId = 'es' | 'en' | 'fr' | 'de' | 'pt' | 'zh' | 'ar' | 'ru'

// backward-compat alias
export type Lang = LangId

interface NavT { resumen:string; turno:string; flota:string; rendimiento:string; comparativa:string; alertas:string; velocidades:string; averias:string; prediccion:string; simulador:string; aerea:string; calidad:string; operacion:string; analisis:string; herramientas:string }
interface KpiT  { tonelaje:string; ciclos:string; meta:string; cumplimiento:string; caex_activos:string; prom_ciclo:string; disp_fisica:string; utilizacion:string; factor_op:string; ton_hora:string }
interface StatusT { operacion_normal:string; en_seguimiento:string; requiere_atencion:string; cumplido:string; en_riesgo:string; deficit:string; activo:string; inactivo:string; averia:string; sobre_meta:string; bajo_meta:string; mantencion:string; demora:string }
interface TurnoT  { dia:string; noche:string; ambos:string; inicio:string; fin:string; transcurrido:string; restante:string }
interface ActionT { actualizar:string; exportar:string; filtrar:string; buscar:string; ver_mas:string; generar:string; descargar:string; cargar:string; limpiar:string; aplicar:string; cerrar:string; restablecer:string; analizar:string }
interface AuthT   { titulo:string; subtitulo:string; usuario:string; password:string; ingresar:string; salir:string; bienvenido:string; error_login:string; modo_demo:string }
interface FasesT  { f01:string; f02:string; chancado:string; total:string }
interface TiempoT { hoy:string; ayer:string; semana:string; mes:string; dias:string; horas:string; minutos:string; restantes:string; transcurridos:string }
interface GeneralT { cargando:string; sin_datos:string; error:string; norte:string; version:string; fecha_reporte:string; periodo:string; faena:string; empresa:string; modo_demo:string }
interface SettingsT {
  titulo:string; apariencia:string; efectos_visuales:string; idioma:string; vista_previa:string
  mfa_titulo:string; mfa_boton:string; cambiar_password:string
  tema_dark:string; tema_light:string; tema_futuristic:string; tema_minimal:string; tema_carbon:string
  tema_dark_desc:string; tema_light_desc:string; tema_futuristic_desc:string; tema_minimal_desc:string; tema_carbon_desc:string
  fx_scanlines:string; fx_hexgrid:string; fx_glow:string; fx_cursor:string; fx_animations:string
  pw_actual:string; pw_nueva:string; pw_confirmar:string; pw_boton:string; pw_cambiando:string
  pw_exito:string; pw_error_generico:string
  pw_err_actual:string; pw_err_nueva:string; pw_err_min:string; pw_err_mayus:string; pw_err_numero:string; pw_err_especial:string; pw_err_no_coincide:string
  pw_fuerza_debil:string; pw_fuerza_medio:string; pw_fuerza_fuerte:string
}

export interface Translations { nav:NavT; kpi:KpiT; status:StatusT; turno:TurnoT; action:ActionT; auth:AuthT; fases:FasesT; tiempo:TiempoT; general:GeneralT; settings:SettingsT }

export const translations: Record<LangId, Translations> = {
  es: {
    nav: { resumen:'Resumen Ejecutivo', turno:'Turno Actual', flota:'Flota y Equipos', rendimiento:'Rendimiento', comparativa:'Comparativa', alertas:'Alertas', velocidades:'Velocidades', averias:'Averías', prediccion:'Predicción ML', simulador:'Simulador', aerea:'Vista Aérea', calidad:'Data Quality', operacion:'OPERACIÓN', analisis:'ANÁLISIS', herramientas:'HERRAMIENTAS' },
    kpi: { tonelaje:'Tonelaje', ciclos:'Ciclos', meta:'Meta', cumplimiento:'Cumplimiento', caex_activos:'CAEX Activos', prom_ciclo:'Prom/Ciclo', disp_fisica:'Disp. Física', utilizacion:'Utilización', factor_op:'Factor Op.', ton_hora:'t/Hora' },
    status: { operacion_normal:'OPERACIÓN NORMAL', en_seguimiento:'EN SEGUIMIENTO', requiere_atencion:'REQUIERE ATENCIÓN', cumplido:'CUMPLIDO', en_riesgo:'EN RIESGO', deficit:'DÉFICIT', activo:'ACTIVO', inactivo:'INACTIVO', averia:'AVERÍA', sobre_meta:'SOBRE META', bajo_meta:'BAJO META', mantencion:'MANTENCIÓN', demora:'DEMORA' },
    turno: { dia:'TURNO DÍA', noche:'TURNO NOCHE', ambos:'TODOS LOS TURNOS', inicio:'Inicio', fin:'Fin', transcurrido:'Tiempo transcurrido', restante:'Tiempo restante' },
    action: { actualizar:'Actualizar', exportar:'Exportar', filtrar:'Filtrar', buscar:'Buscar', ver_mas:'Ver más', generar:'Generar', descargar:'Descargar', cargar:'Cargar', limpiar:'Limpiar', aplicar:'Aplicar', cerrar:'Cerrar', restablecer:'Restablecer', analizar:'Analizar' },
    auth: { titulo:'NORTHMINE Intelligence', subtitulo:'Sistema de Control Operacional Minero', usuario:'Usuario', password:'Contraseña', ingresar:'Ingresar', salir:'Cerrar Sesión', bienvenido:'Bienvenido', error_login:'Usuario o contraseña incorrectos', modo_demo:'MODO DEMO' },
    fases: { f01:'F01 (NORTHMINE)', f02:'F02 (Cobro aparte)', chancado:'Chancado', total:'Total Mina' },
    tiempo: { hoy:'Hoy', ayer:'Ayer', semana:'Última semana', mes:'Este mes', dias:'días', horas:'horas', minutos:'minutos', restantes:'restantes', transcurridos:'transcurridos' },
    general: { cargando:'Cargando datos...', sin_datos:'Sin datos disponibles', error:'Error al cargar datos', norte:'NORTHMINE', version:'v2.0', fecha_reporte:'Fecha de reporte', periodo:'Período', faena:'Faena', empresa:'Empresa', modo_demo:'Modo Demo' },
    settings: {
      titulo:'Configuración del sistema', apariencia:'Apariencia', efectos_visuales:'Efectos visuales', idioma:'Idioma / Language', vista_previa:'Vista previa',
      mfa_titulo:'Autenticación de dos factores (MFA)', mfa_boton:'Configurar MFA', cambiar_password:'Cambiar contraseña',
      tema_dark:'DARK', tema_light:'LIGHT', tema_futuristic:'FUTUR', tema_minimal:'MINIMAL', tema_carbon:'CARBON',
      tema_dark_desc:'Startup Intelligence', tema_light_desc:'Ejecutivo corporativo', tema_futuristic_desc:'Deep Space neón', tema_minimal_desc:'Blanco y negro', tema_carbon_desc:'Fibra de carbono',
      fx_scanlines:'Scanlines', fx_hexgrid:'Grilla hexagonal', fx_glow:'Efectos glow', fx_cursor:'Cursor personalizado', fx_animations:'Animaciones',
      pw_actual:'Contraseña actual', pw_nueva:'Nueva contraseña', pw_confirmar:'Confirmar nueva contraseña', pw_boton:'Cambiar contraseña', pw_cambiando:'Cambiando...',
      pw_exito:'Contraseña actualizada correctamente', pw_error_generico:'Error al cambiar contraseña',
      pw_err_actual:'Ingrese contraseña actual', pw_err_nueva:'Ingrese nueva contraseña', pw_err_min:'Mínimo 10 caracteres', pw_err_mayus:'Debe contener una mayúscula', pw_err_numero:'Debe contener un número', pw_err_especial:'Debe contener un carácter especial', pw_err_no_coincide:'Las contraseñas no coinciden',
      pw_fuerza_debil:'DÉBIL', pw_fuerza_medio:'MEDIO', pw_fuerza_fuerte:'FUERTE',
    },
  },
  en: {
    nav: { resumen:'Executive Summary', turno:'Current Shift', flota:'Fleet & Equipment', rendimiento:'Performance', comparativa:'Comparative', alertas:'Alerts', velocidades:'Speed Control', averias:'Breakdowns', prediccion:'ML Prediction', simulador:'Simulator', aerea:'Aerial View', calidad:'Data Quality', operacion:'OPERATIONS', analisis:'ANALYTICS', herramientas:'TOOLS' },
    kpi: { tonelaje:'Tonnage', ciclos:'Cycles', meta:'Target', cumplimiento:'Compliance', caex_activos:'Active Trucks', prom_ciclo:'Avg/Cycle', disp_fisica:'Phys. Avail.', utilizacion:'Utilization', factor_op:'Op. Factor', ton_hora:'t/Hour' },
    status: { operacion_normal:'NORMAL OPERATION', en_seguimiento:'MONITORING', requiere_atencion:'REQUIRES ATTENTION', cumplido:'ACHIEVED', en_riesgo:'AT RISK', deficit:'DEFICIT', activo:'ACTIVE', inactivo:'INACTIVE', averia:'BREAKDOWN', sobre_meta:'ABOVE TARGET', bajo_meta:'BELOW TARGET', mantencion:'MAINTENANCE', demora:'DELAY' },
    turno: { dia:'DAY SHIFT', noche:'NIGHT SHIFT', ambos:'ALL SHIFTS', inicio:'Start', fin:'End', transcurrido:'Elapsed time', restante:'Remaining time' },
    action: { actualizar:'Refresh', exportar:'Export', filtrar:'Filter', buscar:'Search', ver_mas:'See more', generar:'Generate', descargar:'Download', cargar:'Load', limpiar:'Clear', aplicar:'Apply', cerrar:'Close', restablecer:'Reset', analizar:'Analyze' },
    auth: { titulo:'NORTHMINE Intelligence', subtitulo:'Mining Operational Control System', usuario:'Username', password:'Password', ingresar:'Sign In', salir:'Sign Out', bienvenido:'Welcome', error_login:'Invalid username or password', modo_demo:'DEMO MODE' },
    fases: { f01:'F01 (NORTHMINE)', f02:'F02 (Separate billing)', chancado:'Crushing', total:'Total Mine' },
    tiempo: { hoy:'Today', ayer:'Yesterday', semana:'Last week', mes:'This month', dias:'days', horas:'hours', minutos:'minutes', restantes:'remaining', transcurridos:'elapsed' },
    general: { cargando:'Loading data...', sin_datos:'No data available', error:'Error loading data', norte:'NORTHMINE', version:'v2.0', fecha_reporte:'Report date', periodo:'Period', faena:'Mine Site', empresa:'Company', modo_demo:'Demo Mode' },
    settings: {
      titulo:'System Settings', apariencia:'Appearance', efectos_visuales:'Visual Effects', idioma:'Language', vista_previa:'Preview',
      mfa_titulo:'Two-Factor Authentication (MFA)', mfa_boton:'Set up MFA', cambiar_password:'Change Password',
      tema_dark:'DARK', tema_light:'LIGHT', tema_futuristic:'FUTUR', tema_minimal:'MINIMAL', tema_carbon:'CARBON',
      tema_dark_desc:'Startup Intelligence', tema_light_desc:'Corporate executive', tema_futuristic_desc:'Deep Space neon', tema_minimal_desc:'Black & white', tema_carbon_desc:'Carbon fiber',
      fx_scanlines:'Scanlines', fx_hexgrid:'Hex grid', fx_glow:'Glow effects', fx_cursor:'Custom cursor', fx_animations:'Animations',
      pw_actual:'Current password', pw_nueva:'New password', pw_confirmar:'Confirm new password', pw_boton:'Change password', pw_cambiando:'Changing...',
      pw_exito:'Password updated successfully', pw_error_generico:'Error changing password',
      pw_err_actual:'Enter current password', pw_err_nueva:'Enter new password', pw_err_min:'Minimum 10 characters', pw_err_mayus:'Must contain an uppercase letter', pw_err_numero:'Must contain a number', pw_err_especial:'Must contain a special character', pw_err_no_coincide:'Passwords do not match',
      pw_fuerza_debil:'WEAK', pw_fuerza_medio:'MEDIUM', pw_fuerza_fuerte:'STRONG',
    },
  },
  fr: {
    nav: { resumen:'Résumé Exécutif', turno:'Quart Actuel', flota:'Flotte & Équipements', rendimiento:'Performance', comparativa:'Comparatif', alertas:'Alertes', velocidades:'Contrôle Vitesse', averias:'Pannes', prediccion:'Prédiction ML', simulador:'Simulateur', aerea:'Vue Aérienne', calidad:'Qualité Données', operacion:'OPÉRATIONS', analisis:'ANALYSE', herramientas:'OUTILS' },
    kpi: { tonelaje:'Tonnage', ciclos:'Cycles', meta:'Objectif', cumplimiento:'Conformité', caex_activos:'Camions actifs', prom_ciclo:'Moy/Cycle', disp_fisica:'Disp. Phys.', utilizacion:'Utilisation', factor_op:'Fact. Op.', ton_hora:'t/Heure' },
    status: { operacion_normal:'OPÉRATION NORMALE', en_seguimiento:'SUIVI', requiere_atencion:'ATTENTION REQUISE', cumplido:'ATTEINT', en_riesgo:'À RISQUE', deficit:'DÉFICIT', activo:'ACTIF', inactivo:'INACTIF', averia:'PANNE', sobre_meta:'AU-DESSUS', bajo_meta:'EN DESSOUS', mantencion:'MAINTENANCE', demora:'RETARD' },
    turno: { dia:'QUART DE JOUR', noche:'QUART DE NUIT', ambos:'TOUS LES QUARTS', inicio:'Début', fin:'Fin', transcurrido:'Temps écoulé', restante:'Temps restant' },
    action: { actualizar:'Actualiser', exportar:'Exporter', filtrar:'Filtrer', buscar:'Rechercher', ver_mas:'Voir plus', generar:'Générer', descargar:'Télécharger', cargar:'Charger', limpiar:'Effacer', aplicar:'Appliquer', cerrar:'Fermer', restablecer:'Réinitialiser', analizar:'Analyser' },
    auth: { titulo:'NORTHMINE Intelligence', subtitulo:'Système de Contrôle Opérationnel Minier', usuario:'Utilisateur', password:'Mot de passe', ingresar:'Connexion', salir:'Déconnexion', bienvenido:'Bienvenue', error_login:"Nom d'utilisateur ou mot de passe incorrect", modo_demo:'MODE DÉMO' },
    fases: { f01:'F01 (NORTHMINE)', f02:'F02 (Facturation séparée)', chancado:'Concassage', total:'Total Mine' },
    tiempo: { hoy:"Aujourd'hui", ayer:'Hier', semana:'Semaine dernière', mes:'Ce mois', dias:'jours', horas:'heures', minutos:'minutes', restantes:'restants', transcurridos:'écoulés' },
    general: { cargando:'Chargement...', sin_datos:'Aucune donnée disponible', error:'Erreur de chargement', norte:'NORTHMINE', version:'v2.0', fecha_reporte:'Date du rapport', periodo:'Période', faena:'Site minier', empresa:'Société', modo_demo:'Mode Démo' },
    settings: {
      titulo:'Paramètres du système', apariencia:'Apparence', efectos_visuales:'Effets visuels', idioma:'Langue', vista_previa:'Aperçu',
      mfa_titulo:'Authentification à deux facteurs (MFA)', mfa_boton:'Configurer MFA', cambiar_password:'Changer le mot de passe',
      tema_dark:'DARK', tema_light:'LIGHT', tema_futuristic:'FUTUR', tema_minimal:'MINIMAL', tema_carbon:'CARBON',
      tema_dark_desc:'Startup Intelligence', tema_light_desc:'Exécutif corporatif', tema_futuristic_desc:'Deep Space néon', tema_minimal_desc:'Noir et blanc', tema_carbon_desc:'Fibre de carbone',
      fx_scanlines:'Scanlines', fx_hexgrid:'Grille hexagonale', fx_glow:'Effets lumineux', fx_cursor:'Curseur personnalisé', fx_animations:'Animations',
      pw_actual:'Mot de passe actuel', pw_nueva:'Nouveau mot de passe', pw_confirmar:'Confirmer le nouveau mot de passe', pw_boton:'Changer le mot de passe', pw_cambiando:'Changement...',
      pw_exito:'Mot de passe mis à jour avec succès', pw_error_generico:'Erreur lors du changement de mot de passe',
      pw_err_actual:'Entrez le mot de passe actuel', pw_err_nueva:'Entrez le nouveau mot de passe', pw_err_min:'Minimum 10 caractères', pw_err_mayus:'Doit contenir une majuscule', pw_err_numero:'Doit contenir un chiffre', pw_err_especial:'Doit contenir un caractère spécial', pw_err_no_coincide:'Les mots de passe ne correspondent pas',
      pw_fuerza_debil:'FAIBLE', pw_fuerza_medio:'MOYEN', pw_fuerza_fuerte:'FORT',
    },
  },
  de: {
    nav: { resumen:'Führungsübersicht', turno:'Aktuelle Schicht', flota:'Flotte & Ausrüstung', rendimiento:'Leistung', comparativa:'Vergleich', alertas:'Warnungen', velocidades:'Geschwindigkeit', averias:'Ausfälle', prediccion:'ML-Prognose', simulador:'Simulator', aerea:'Luftansicht', calidad:'Datenqualität', operacion:'BETRIEB', analisis:'ANALYSE', herramientas:'WERKZEUGE' },
    kpi: { tonelaje:'Tonnage', ciclos:'Zyklen', meta:'Ziel', cumplimiento:'Einhaltung', caex_activos:'Aktive LKW', prom_ciclo:'Ø/Zyklus', disp_fisica:'Phys. Verf.', utilizacion:'Auslastung', factor_op:'Op. Faktor', ton_hora:'t/Stunde' },
    status: { operacion_normal:'NORMALBETRIEB', en_seguimiento:'ÜBERWACHUNG', requiere_atencion:'AUFMERKSAMKEIT', cumplido:'ERREICHT', en_riesgo:'IM RISIKO', deficit:'DEFIZIT', activo:'AKTIV', inactivo:'INAKTIV', averia:'AUSFALL', sobre_meta:'ÜBER ZIEL', bajo_meta:'UNTER ZIEL', mantencion:'WARTUNG', demora:'VERZÖGERUNG' },
    turno: { dia:'TAGSCHICHT', noche:'NACHTSCHICHT', ambos:'ALLE SCHICHTEN', inicio:'Start', fin:'Ende', transcurrido:'Abgelaufene Zeit', restante:'Verbleibende Zeit' },
    action: { actualizar:'Aktualisieren', exportar:'Exportieren', filtrar:'Filtern', buscar:'Suchen', ver_mas:'Mehr sehen', generar:'Generieren', descargar:'Herunterladen', cargar:'Laden', limpiar:'Löschen', aplicar:'Anwenden', cerrar:'Schließen', restablecer:'Zurücksetzen', analizar:'Analysieren' },
    auth: { titulo:'NORTHMINE Intelligence', subtitulo:'Bergbau-Betriebssteuerungssystem', usuario:'Benutzername', password:'Passwort', ingresar:'Anmelden', salir:'Abmelden', bienvenido:'Willkommen', error_login:'Ungültiger Benutzername oder Passwort', modo_demo:'DEMO-MODUS' },
    fases: { f01:'F01 (NORTHMINE)', f02:'F02 (Separate Abrechnung)', chancado:'Brechen', total:'Gesamt Bergwerk' },
    tiempo: { hoy:'Heute', ayer:'Gestern', semana:'Letzte Woche', mes:'Diesen Monat', dias:'Tage', horas:'Stunden', minutos:'Minuten', restantes:'verbleibend', transcurridos:'abgelaufen' },
    general: { cargando:'Daten werden geladen...', sin_datos:'Keine Daten verfügbar', error:'Fehler beim Laden', norte:'NORTHMINE', version:'v2.0', fecha_reporte:'Berichtsdatum', periodo:'Zeitraum', faena:'Bergbaustandort', empresa:'Unternehmen', modo_demo:'Demo-Modus' },
    settings: {
      titulo:'Systemeinstellungen', apariencia:'Erscheinungsbild', efectos_visuales:'Visuelle Effekte', idioma:'Sprache', vista_previa:'Vorschau',
      mfa_titulo:'Zwei-Faktor-Authentifizierung (MFA)', mfa_boton:'MFA einrichten', cambiar_password:'Passwort ändern',
      tema_dark:'DARK', tema_light:'LIGHT', tema_futuristic:'FUTUR', tema_minimal:'MINIMAL', tema_carbon:'CARBON',
      tema_dark_desc:'Startup Intelligence', tema_light_desc:'Unternehmensausführung', tema_futuristic_desc:'Deep Space Neon', tema_minimal_desc:'Schwarz-Weiß', tema_carbon_desc:'Karbonfaser',
      fx_scanlines:'Scanlines', fx_hexgrid:'Sechseckraster', fx_glow:'Leuchteffekte', fx_cursor:'Benutzerdefinierter Cursor', fx_animations:'Animationen',
      pw_actual:'Aktuelles Passwort', pw_nueva:'Neues Passwort', pw_confirmar:'Neues Passwort bestätigen', pw_boton:'Passwort ändern', pw_cambiando:'Wird geändert...',
      pw_exito:'Passwort erfolgreich aktualisiert', pw_error_generico:'Fehler beim Ändern des Passworts',
      pw_err_actual:'Aktuelles Passwort eingeben', pw_err_nueva:'Neues Passwort eingeben', pw_err_min:'Mindestens 10 Zeichen', pw_err_mayus:'Muss einen Großbuchstaben enthalten', pw_err_numero:'Muss eine Zahl enthalten', pw_err_especial:'Muss ein Sonderzeichen enthalten', pw_err_no_coincide:'Passwörter stimmen nicht überein',
      pw_fuerza_debil:'SCHWACH', pw_fuerza_medio:'MITTEL', pw_fuerza_fuerte:'STARK',
    },
  },
  pt: {
    nav: { resumen:'Resumo Executivo', turno:'Turno Atual', flota:'Frota e Equipamentos', rendimiento:'Desempenho', comparativa:'Comparativo', alertas:'Alertas', velocidades:'Controle de Velocidade', averias:'Avarias', prediccion:'Previsão ML', simulador:'Simulador', aerea:'Vista Aérea', calidad:'Qualidade de Dados', operacion:'OPERAÇÃO', analisis:'ANÁLISE', herramientas:'FERRAMENTAS' },
    kpi: { tonelaje:'Tonelagem', ciclos:'Ciclos', meta:'Meta', cumplimiento:'Cumprimento', caex_activos:'Caminhões Ativos', prom_ciclo:'Méd/Ciclo', disp_fisica:'Disp. Fís.', utilizacion:'Utilização', factor_op:'Fator Op.', ton_hora:'t/Hora' },
    status: { operacion_normal:'OPERAÇÃO NORMAL', en_seguimiento:'MONITORAMENTO', requiere_atencion:'REQUER ATENÇÃO', cumplido:'ATINGIDO', en_riesgo:'EM RISCO', deficit:'DÉFICIT', activo:'ATIVO', inactivo:'INATIVO', averia:'AVARIA', sobre_meta:'ACIMA DA META', bajo_meta:'ABAIXO DA META', mantencion:'MANUTENÇÃO', demora:'DEMORA' },
    turno: { dia:'TURNO DIA', noche:'TURNO NOITE', ambos:'TODOS OS TURNOS', inicio:'Início', fin:'Fim', transcurrido:'Tempo decorrido', restante:'Tempo restante' },
    action: { actualizar:'Atualizar', exportar:'Exportar', filtrar:'Filtrar', buscar:'Buscar', ver_mas:'Ver mais', generar:'Gerar', descargar:'Baixar', cargar:'Carregar', limpiar:'Limpar', aplicar:'Aplicar', cerrar:'Fechar', restablecer:'Redefinir', analizar:'Analisar' },
    auth: { titulo:'NORTHMINE Intelligence', subtitulo:'Sistema de Controle Operacional Mineiro', usuario:'Usuário', password:'Senha', ingresar:'Entrar', salir:'Sair', bienvenido:'Bem-vindo', error_login:'Usuário ou senha incorretos', modo_demo:'MODO DEMO' },
    fases: { f01:'F01 (NORTHMINE)', f02:'F02 (Faturação separada)', chancado:'Britagem', total:'Total Mina' },
    tiempo: { hoy:'Hoje', ayer:'Ontem', semana:'Última semana', mes:'Este mês', dias:'dias', horas:'horas', minutos:'minutos', restantes:'restantes', transcurridos:'decorridos' },
    general: { cargando:'Carregando dados...', sin_datos:'Sem dados disponíveis', error:'Erro ao carregar dados', norte:'NORTHMINE', version:'v2.0', fecha_reporte:'Data do relatório', periodo:'Período', faena:'Mina', empresa:'Empresa', modo_demo:'Modo Demo' },
    settings: {
      titulo:'Configurações do sistema', apariencia:'Aparência', efectos_visuales:'Efeitos visuais', idioma:'Idioma', vista_previa:'Pré-visualização',
      mfa_titulo:'Autenticação de dois fatores (MFA)', mfa_boton:'Configurar MFA', cambiar_password:'Alterar senha',
      tema_dark:'DARK', tema_light:'LIGHT', tema_futuristic:'FUTUR', tema_minimal:'MINIMAL', tema_carbon:'CARBON',
      tema_dark_desc:'Startup Intelligence', tema_light_desc:'Executivo corporativo', tema_futuristic_desc:'Deep Space neon', tema_minimal_desc:'Preto e branco', tema_carbon_desc:'Fibra de carbono',
      fx_scanlines:'Scanlines', fx_hexgrid:'Grade hexagonal', fx_glow:'Efeitos de brilho', fx_cursor:'Cursor personalizado', fx_animations:'Animações',
      pw_actual:'Senha atual', pw_nueva:'Nova senha', pw_confirmar:'Confirmar nova senha', pw_boton:'Alterar senha', pw_cambiando:'Alterando...',
      pw_exito:'Senha atualizada com sucesso', pw_error_generico:'Erro ao alterar a senha',
      pw_err_actual:'Digite a senha atual', pw_err_nueva:'Digite a nova senha', pw_err_min:'Mínimo de 10 caracteres', pw_err_mayus:'Deve conter uma letra maiúscula', pw_err_numero:'Deve conter um número', pw_err_especial:'Deve conter um caractere especial', pw_err_no_coincide:'As senhas não coincidem',
      pw_fuerza_debil:'FRACA', pw_fuerza_medio:'MÉDIA', pw_fuerza_fuerte:'FORTE',
    },
  },
  zh: {
    nav: { resumen:'执行摘要', turno:'当前班次', flota:'车队与设备', rendimiento:'绩效', comparativa:'比较', alertas:'警报', velocidades:'速度控制', averias:'故障', prediccion:'ML预测', simulador:'模拟器', aerea:'空中视图', calidad:'数据质量', operacion:'操作', analisis:'分析', herramientas:'工具' },
    kpi: { tonelaje:'吨位', ciclos:'循环', meta:'目标', cumplimiento:'合规', caex_activos:'活跃卡车', prom_ciclo:'均值/循环', disp_fisica:'物理可用性', utilizacion:'利用率', factor_op:'运营系数', ton_hora:'吨/小时' },
    status: { operacion_normal:'正常运营', en_seguimiento:'监控中', requiere_atencion:'需要关注', cumplido:'已完成', en_riesgo:'处于风险', deficit:'亏损', activo:'活跃', inactivo:'非活跃', averia:'故障', sobre_meta:'超额完成', bajo_meta:'未达目标', mantencion:'维护中', demora:'延误' },
    turno: { dia:'白班', noche:'夜班', ambos:'所有班次', inicio:'开始', fin:'结束', transcurrido:'已用时间', restante:'剩余时间' },
    action: { actualizar:'刷新', exportar:'导出', filtrar:'筛选', buscar:'搜索', ver_mas:'查看更多', generar:'生成', descargar:'下载', cargar:'加载', limpiar:'清除', aplicar:'应用', cerrar:'关闭', restablecer:'重置', analizar:'分析' },
    auth: { titulo:'NORTHMINE Intelligence', subtitulo:'矿山运营控制系统', usuario:'用户名', password:'密码', ingresar:'登录', salir:'退出', bienvenido:'欢迎', error_login:'用户名或密码错误', modo_demo:'演示模式' },
    fases: { f01:'F01 (NORTHMINE)', f02:'F02 (单独计费)', chancado:'破碎', total:'矿山总计' },
    tiempo: { hoy:'今天', ayer:'昨天', semana:'上周', mes:'本月', dias:'天', horas:'小时', minutos:'分钟', restantes:'剩余', transcurridos:'已过' },
    general: { cargando:'正在加载数据...', sin_datos:'无可用数据', error:'加载数据时出错', norte:'NORTHMINE', version:'v2.0', fecha_reporte:'报告日期', periodo:'时间段', faena:'矿场', empresa:'公司', modo_demo:'演示模式' },
    settings: {
      titulo:'系统设置', apariencia:'外观', efectos_visuales:'视觉效果', idioma:'语言', vista_previa:'预览',
      mfa_titulo:'双因素认证 (MFA)', mfa_boton:'设置 MFA', cambiar_password:'修改密码',
      tema_dark:'DARK', tema_light:'LIGHT', tema_futuristic:'FUTUR', tema_minimal:'MINIMAL', tema_carbon:'CARBON',
      tema_dark_desc:'启动智能', tema_light_desc:'企业高管风格', tema_futuristic_desc:'深空霓虹', tema_minimal_desc:'黑白极简', tema_carbon_desc:'碳纤维',
      fx_scanlines:'扫描线', fx_hexgrid:'六边形网格', fx_glow:'发光效果', fx_cursor:'自定义光标', fx_animations:'动画效果',
      pw_actual:'当前密码', pw_nueva:'新密码', pw_confirmar:'确认新密码', pw_boton:'修改密码', pw_cambiando:'修改中...',
      pw_exito:'密码更新成功', pw_error_generico:'修改密码时出错',
      pw_err_actual:'请输入当前密码', pw_err_nueva:'请输入新密码', pw_err_min:'至少10个字符', pw_err_mayus:'必须包含大写字母', pw_err_numero:'必须包含数字', pw_err_especial:'必须包含特殊字符', pw_err_no_coincide:'两次密码不一致',
      pw_fuerza_debil:'弱', pw_fuerza_medio:'中', pw_fuerza_fuerte:'强',
    },
  },
  ar: {
    nav: { resumen:'الملخص التنفيذي', turno:'الوردية الحالية', flota:'الأسطول والمعدات', rendimiento:'الأداء', comparativa:'المقارنة', alertas:'التنبيهات', velocidades:'التحكم بالسرعة', averias:'الأعطال', prediccion:'تنبؤ ML', simulador:'المحاكاة', aerea:'العرض الجوي', calidad:'جودة البيانات', operacion:'العمليات', analisis:'التحليل', herramientas:'الأدوات' },
    kpi: { tonelaje:'الحمولة', ciclos:'الدورات', meta:'الهدف', cumplimiento:'الامتثال', caex_activos:'الشاحنات النشطة', prom_ciclo:'متوسط/دورة', disp_fisica:'التوافر الفعلي', utilizacion:'الاستخدام', factor_op:'عامل التشغيل', ton_hora:'طن/ساعة' },
    status: { operacion_normal:'تشغيل طبيعي', en_seguimiento:'مراقبة', requiere_atencion:'يتطلب انتباهاً', cumplido:'محقق', en_riesgo:'في خطر', deficit:'عجز', activo:'نشط', inactivo:'غير نشط', averia:'عطل', sobre_meta:'فوق الهدف', bajo_meta:'دون الهدف', mantencion:'الصيانة', demora:'تأخير' },
    turno: { dia:'وردية النهار', noche:'وردية الليل', ambos:'جميع الورديات', inicio:'البداية', fin:'النهاية', transcurrido:'الوقت المنقضي', restante:'الوقت المتبقي' },
    action: { actualizar:'تحديث', exportar:'تصدير', filtrar:'تصفية', buscar:'بحث', ver_mas:'عرض المزيد', generar:'إنشاء', descargar:'تنزيل', cargar:'تحميل', limpiar:'مسح', aplicar:'تطبيق', cerrar:'إغلاق', restablecer:'إعادة تعيين', analizar:'تحليل' },
    auth: { titulo:'NORTHMINE Intelligence', subtitulo:'نظام التحكم التشغيلي للتعدين', usuario:'اسم المستخدم', password:'كلمة المرور', ingresar:'تسجيل الدخول', salir:'تسجيل الخروج', bienvenido:'مرحباً', error_login:'اسم المستخدم أو كلمة المرور غير صحيحة', modo_demo:'وضع العرض' },
    fases: { f01:'F01 (NORTHMINE)', f02:'F02 (فوترة منفصلة)', chancado:'التكسير', total:'إجمالي المنجم' },
    tiempo: { hoy:'اليوم', ayer:'أمس', semana:'الأسبوع الماضي', mes:'هذا الشهر', dias:'أيام', horas:'ساعات', minutos:'دقائق', restantes:'متبقية', transcurridos:'منقضية' },
    general: { cargando:'جاري تحميل البيانات...', sin_datos:'لا توجد بيانات متاحة', error:'خطأ في تحميل البيانات', norte:'NORTHMINE', version:'v2.0', fecha_reporte:'تاريخ التقرير', periodo:'الفترة', faena:'موقع التعدين', empresa:'الشركة', modo_demo:'وضع العرض' },
    settings: {
      titulo:'إعدادات النظام', apariencia:'المظهر', efectos_visuales:'التأثيرات البصرية', idioma:'اللغة', vista_previa:'معاينة',
      mfa_titulo:'المصادقة الثنائية (MFA)', mfa_boton:'إعداد المصادقة الثنائية', cambiar_password:'تغيير كلمة المرور',
      tema_dark:'DARK', tema_light:'LIGHT', tema_futuristic:'FUTUR', tema_minimal:'MINIMAL', tema_carbon:'CARBON',
      tema_dark_desc:'Startup Intelligence', tema_light_desc:'تنفيذي مؤسسي', tema_futuristic_desc:'فضاء عميق نيون', tema_minimal_desc:'أبيض وأسود', tema_carbon_desc:'ألياف الكربون',
      fx_scanlines:'خطوط المسح', fx_hexgrid:'شبكة سداسية', fx_glow:'تأثيرات التوهج', fx_cursor:'مؤشر مخصص', fx_animations:'الحركات المتحركة',
      pw_actual:'كلمة المرور الحالية', pw_nueva:'كلمة المرور الجديدة', pw_confirmar:'تأكيد كلمة المرور الجديدة', pw_boton:'تغيير كلمة المرور', pw_cambiando:'جارٍ التغيير...',
      pw_exito:'تم تحديث كلمة المرور بنجاح', pw_error_generico:'خطأ في تغيير كلمة المرور',
      pw_err_actual:'أدخل كلمة المرور الحالية', pw_err_nueva:'أدخل كلمة المرور الجديدة', pw_err_min:'10 أحرف على الأقل', pw_err_mayus:'يجب أن تحتوي على حرف كبير', pw_err_numero:'يجب أن تحتوي على رقم', pw_err_especial:'يجب أن تحتوي على رمز خاص', pw_err_no_coincide:'كلمتا المرور غير متطابقتين',
      pw_fuerza_debil:'ضعيفة', pw_fuerza_medio:'متوسطة', pw_fuerza_fuerte:'قوية',
    },
  },
  ru: {
    nav: { resumen:'Исполнительная сводка', turno:'Текущая смена', flota:'Флот и оборудование', rendimiento:'Производительность', comparativa:'Сравнение', alertas:'Предупреждения', velocidades:'Контроль скорости', averias:'Поломки', prediccion:'ML-прогноз', simulador:'Симулятор', aerea:'Аэросъёмка', calidad:'Качество данных', operacion:'ОПЕРАЦИИ', analisis:'АНАЛИТИКА', herramientas:'ИНСТРУМЕНТЫ' },
    kpi: { tonelaje:'Тоннаж', ciclos:'Циклы', meta:'Цель', cumplimiento:'Соответствие', caex_activos:'Активные грузовики', prom_ciclo:'Ср/Цикл', disp_fisica:'Физ. доступн.', utilizacion:'Загрузка', factor_op:'Операц. фактор', ton_hora:'т/час' },
    status: { operacion_normal:'НОРМАЛЬНАЯ РАБОТА', en_seguimiento:'МОНИТОРИНГ', requiere_atencion:'ТРЕБУЕТ ВНИМАНИЯ', cumplido:'ВЫПОЛНЕНО', en_riesgo:'В ЗОНЕ РИСКА', deficit:'ДЕФИЦИТ', activo:'АКТИВЕН', inactivo:'НЕАКТИВЕН', averia:'ПОЛОМКА', sobre_meta:'ВЫШЕ ЦЕЛИ', bajo_meta:'НИЖЕ ЦЕЛИ', mantencion:'ОБСЛУЖИВАНИЕ', demora:'ЗАДЕРЖКА' },
    turno: { dia:'ДНЕВНАЯ СМЕНА', noche:'НОЧНАЯ СМЕНА', ambos:'ВСЕ СМЕНЫ', inicio:'Начало', fin:'Конец', transcurrido:'Прошло времени', restante:'Осталось времени' },
    action: { actualizar:'Обновить', exportar:'Экспорт', filtrar:'Фильтр', buscar:'Поиск', ver_mas:'Показать больше', generar:'Создать', descargar:'Скачать', cargar:'Загрузить', limpiar:'Очистить', aplicar:'Применить', cerrar:'Закрыть', restablecer:'Сбросить', analizar:'Анализ' },
    auth: { titulo:'NORTHMINE Intelligence', subtitulo:'Система управления горными операциями', usuario:'Имя пользователя', password:'Пароль', ingresar:'Войти', salir:'Выйти', bienvenido:'Добро пожаловать', error_login:'Неверное имя пользователя или пароль', modo_demo:'ДЕМО-РЕЖИМ' },
    fases: { f01:'F01 (NORTHMINE)', f02:'F02 (Отдельный счёт)', chancado:'Дробление', total:'Итого по шахте' },
    tiempo: { hoy:'Сегодня', ayer:'Вчера', semana:'Прошлая неделя', mes:'Этот месяц', dias:'дней', horas:'часов', minutos:'минут', restantes:'осталось', transcurridos:'прошло' },
    general: { cargando:'Загрузка данных...', sin_datos:'Данные недоступны', error:'Ошибка загрузки данных', norte:'NORTHMINE', version:'v2.0', fecha_reporte:'Дата отчёта', periodo:'Период', faena:'Шахта', empresa:'Компания', modo_demo:'Демо-режим' },
    settings: {
      titulo:'Настройки системы', apariencia:'Внешний вид', efectos_visuales:'Визуальные эффекты', idioma:'Язык', vista_previa:'Предпросмотр',
      mfa_titulo:'Двухфакторная аутентификация (MFA)', mfa_boton:'Настроить MFA', cambiar_password:'Изменить пароль',
      tema_dark:'DARK', tema_light:'LIGHT', tema_futuristic:'FUTUR', tema_minimal:'MINIMAL', tema_carbon:'CARBON',
      tema_dark_desc:'Startup Intelligence', tema_light_desc:'Корпоративный', tema_futuristic_desc:'Deep Space неон', tema_minimal_desc:'Чёрно-белый', tema_carbon_desc:'Карбоновое волокно',
      fx_scanlines:'Сканлайны', fx_hexgrid:'Гекс-сетка', fx_glow:'Эффекты свечения', fx_cursor:'Свой курсор', fx_animations:'Анимации',
      pw_actual:'Текущий пароль', pw_nueva:'Новый пароль', pw_confirmar:'Подтвердите новый пароль', pw_boton:'Изменить пароль', pw_cambiando:'Изменение...',
      pw_exito:'Пароль успешно обновлён', pw_error_generico:'Ошибка при изменении пароля',
      pw_err_actual:'Введите текущий пароль', pw_err_nueva:'Введите новый пароль', pw_err_min:'Минимум 10 символов', pw_err_mayus:'Должен содержать заглавную букву', pw_err_numero:'Должен содержать цифру', pw_err_especial:'Должен содержать специальный символ', pw_err_no_coincide:'Пароли не совпадают',
      pw_fuerza_debil:'СЛАБЫЙ', pw_fuerza_medio:'СРЕДНИЙ', pw_fuerza_fuerte:'НАДЁЖНЫЙ',
    },
  },
}
