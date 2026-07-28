import type { ModuleDict } from '../useModuleT'

export interface AuthModuleT {
  mfa_titulo: string
  cerrar: string
  err_iniciar_config: string
  err_codigo_requerido: string
  err_codigo_invalido: string
  configurando: string
  escanear_qr: string
  qr_alt: string
  ingresar_manual: string
  codigos_respaldo: string
  ingresar_codigo_activar: string
  placeholder_codigo: string
  btn_verificando: string
  btn_activar: string
  mfa_activado_titulo: string
  mfa_activado_desc: string
}

export const authModuleT: ModuleDict<AuthModuleT> = {
  es: {
    mfa_titulo: 'MFA - AUTENTICACIÓN DE DOS FACTORES',
    cerrar: 'CERRAR',
    err_iniciar_config: 'Error al iniciar configuración MFA',
    err_codigo_requerido: 'Ingrese el código de 6 dígitos',
    err_codigo_invalido: 'Código inválido',
    configurando: 'Configurando MFA...',
    escanear_qr: 'Escanee el siguiente código QR con su aplicación de autenticación (Google Authenticator, Authy, etc.).',
    qr_alt: 'Código QR MFA',
    ingresar_manual: 'O ingrese manualmente:',
    codigos_respaldo: 'Códigos de respaldo (guárdelos en un lugar seguro):',
    ingresar_codigo_activar: 'Ingrese el código de 6 dígitos de su aplicación para activar:',
    placeholder_codigo: '000000',
    btn_verificando: 'VERIFICANDO...',
    btn_activar: 'ACTIVAR MFA',
    mfa_activado_titulo: 'MFA ACTIVADO CORRECTAMENTE',
    mfa_activado_desc: 'A partir de ahora necesitará su código de autenticación para iniciar sesión.',
  },
  en: {
    mfa_titulo: 'MFA - TWO-FACTOR AUTHENTICATION',
    cerrar: 'CLOSE',
    err_iniciar_config: 'Error starting MFA setup',
    err_codigo_requerido: 'Enter the 6-digit code',
    err_codigo_invalido: 'Invalid code',
    configurando: 'Setting up MFA...',
    escanear_qr: 'Scan the following QR code with your authenticator app (Google Authenticator, Authy, etc.).',
    qr_alt: 'MFA QR Code',
    ingresar_manual: 'Or enter manually:',
    codigos_respaldo: 'Backup codes (keep them in a safe place):',
    ingresar_codigo_activar: 'Enter the 6-digit code from your app to activate:',
    placeholder_codigo: '000000',
    btn_verificando: 'VERIFYING...',
    btn_activar: 'ENABLE MFA',
    mfa_activado_titulo: 'MFA ENABLED SUCCESSFULLY',
    mfa_activado_desc: 'From now on you will need your authentication code to sign in.',
  },
}
