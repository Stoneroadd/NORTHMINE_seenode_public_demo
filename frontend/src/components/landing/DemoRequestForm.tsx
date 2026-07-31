import { type FormEvent, useMemo, useRef, useState } from 'react'
import { AlertCircle, ArrowRight, Check, LoaderCircle } from 'lucide-react'
import { ApiError } from '../../lib/api'
import { submitDemoAccessRequest } from '../../services/demoAccessService'
import {
  DEMO_ACCESS_INTERESTS,
  type DemoAccessInterest,
  type DemoAccessRequestPayload,
} from '../../types/demoAccess'

const countries = [
  'Argentina',
  'Australia',
  'Bolivia',
  'Brasil',
  'Canada',
  'Chile',
  'Colombia',
  'Ecuador',
  'Estados Unidos',
  'Mexico',
  'Peru',
  'Sudafrica',
  'Otro',
] as const

const initialForm: DemoAccessRequestPayload = {
  first_name: '',
  last_name: '',
  email: '',
  company: '',
  role: '',
  country: '',
  operation_type: '',
  fleet_size_range: '',
  interests: [],
  message: '',
  phone: '',
  consent_accepted: false,
  consent_version: '2026-07-31',
  website: '',
}

type FormField = keyof DemoAccessRequestPayload | 'form'
type FormErrors = Partial<Record<FormField, string>>

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function cleanText(value: string) {
  return value.normalize('NFKC').replace(/[\u0000-\u001f\u007f]/g, ' ').trim()
}

function validate(form: DemoAccessRequestPayload): FormErrors {
  const errors: FormErrors = {}
  if (cleanText(form.first_name).length < 2) errors.first_name = 'Ingresa un nombre de al menos 2 caracteres.'
  if (cleanText(form.last_name).length < 2) errors.last_name = 'Ingresa un apellido de al menos 2 caracteres.'
  if (!emailPattern.test(form.email.trim())) errors.email = 'Ingresa un correo valido.'
  if (cleanText(form.company).length < 2) errors.company = 'Ingresa el nombre de la empresa.'
  if (cleanText(form.role).length < 2) errors.role = 'Indica tu cargo o funcion.'
  if (!form.country) errors.country = 'Selecciona un pais.'
  if (form.interests.length === 0) errors.interests = 'Selecciona al menos un interes.'
  if (!form.consent_accepted) errors.consent_accepted = 'Debes aceptar el tratamiento de estos datos.'
  if ((form.message?.length ?? 0) > 1200) errors.message = 'El mensaje no puede superar 1200 caracteres.'
  if ((form.phone?.length ?? 0) > 40) errors.phone = 'El telefono no puede superar 40 caracteres.'
  return errors
}

function inputErrorId(field: string) {
  return `demo-request-${field}-error`
}

export function DemoRequestForm() {
  const [form, setForm] = useState<DemoAccessRequestPayload>(initialForm)
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const submittingRef = useRef(false)
  const errorSummaryRef = useRef<HTMLDivElement>(null)
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({})
  const errorEntries = useMemo(
    () => Object.entries(errors).filter(([field]) => field !== 'form'),
    [errors],
  )

  const setText = (field: keyof DemoAccessRequestPayload, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }))
  }

  const toggleInterest = (interest: DemoAccessInterest) => {
    setForm((current) => ({
      ...current,
      interests: current.interests.includes(interest)
        ? current.interests.filter((item) => item !== interest)
        : [...current.interests, interest],
    }))
    if (errors.interests) setErrors((current) => ({ ...current, interests: undefined }))
  }

  const focusFirstError = (nextErrors: FormErrors) => {
    const firstField = Object.keys(nextErrors).find((field) => field !== 'form')
    window.setTimeout(() => {
      errorSummaryRef.current?.focus()
      if (firstField) fieldRefs.current[firstField]?.focus()
    }, 0)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submittingRef.current) return

    const nextErrors = validate(form)
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      focusFirstError(nextErrors)
      return
    }

    submittingRef.current = true
    setSubmitting(true)
    setErrors({})
    try {
      const payload: DemoAccessRequestPayload = {
        ...form,
        first_name: cleanText(form.first_name),
        last_name: cleanText(form.last_name),
        email: form.email.normalize('NFKC').trim().toLowerCase(),
        company: cleanText(form.company),
        role: cleanText(form.role),
        operation_type: cleanText(form.operation_type ?? ''),
        fleet_size_range: cleanText(form.fleet_size_range ?? ''),
        message: cleanText(form.message ?? ''),
        phone: cleanText(form.phone ?? ''),
      }
      const receipt = await submitDemoAccessRequest(payload)
      sessionStorage.setItem('northmine.demo-access.reference', receipt.reference)
      window.location.assign('/solicitud-recibida')
    } catch (error) {
      let message = 'No fue posible enviar la solicitud. Revisa tu conexion e intenta nuevamente.'
      if (error instanceof ApiError) {
        if (error.status === 429) {
          message = 'Se alcanzo el limite temporal de solicitudes. Intenta nuevamente mas tarde.'
        } else if (error.status === 422) {
          message = 'La API rechazo uno o mas campos. Revisa los datos ingresados.'
        } else if (error.status === 503) {
          message = 'Las solicitudes estan temporalmente no disponibles. Tus datos no fueron guardados; intenta nuevamente mas tarde.'
        } else if (error.status >= 500) {
          message = 'El servicio de solicitudes no esta disponible en este momento.'
        }
      }
      const nextErrors = { form: message }
      setErrors(nextErrors)
      window.setTimeout(() => errorSummaryRef.current?.focus(), 0)
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  const describedBy = (field: keyof DemoAccessRequestPayload) =>
    errors[field] ? inputErrorId(field) : undefined

  return (
    <form className="nm-demo-request-form" onSubmit={handleSubmit} noValidate>
      {Object.keys(errors).length > 0 && (
        <div
          className="nm-form-error-summary"
          ref={errorSummaryRef}
          role="alert"
          tabIndex={-1}
          aria-labelledby="demo-request-errors-title"
        >
          <AlertCircle size={20} aria-hidden="true" />
          <div>
            <h2 id="demo-request-errors-title">
              {errors.form ? 'No se pudo enviar la solicitud' : 'Revisa los campos indicados'}
            </h2>
            {errors.form && <p>{errors.form}</p>}
            {errorEntries.length > 0 && (
              <ul>
                {errorEntries.map(([field, message]) => (
                  <li key={field}>{message}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <fieldset className="nm-form-section">
        <legend>Datos de contacto</legend>
        <p>Usaremos esta informacion exclusivamente para revisar tu solicitud de demostracion.</p>
        <div className="nm-form-grid">
          <label>
            <span>Nombre <b aria-hidden="true">*</b></span>
            <input
              ref={(node) => { fieldRefs.current.first_name = node }}
              value={form.first_name}
              onChange={(event) => setText('first_name', event.target.value)}
              autoComplete="given-name"
              maxLength={80}
              required
              aria-invalid={Boolean(errors.first_name)}
              aria-describedby={describedBy('first_name')}
            />
            {errors.first_name && <small id={inputErrorId('first_name')}>{errors.first_name}</small>}
          </label>
          <label>
            <span>Apellido <b aria-hidden="true">*</b></span>
            <input
              ref={(node) => { fieldRefs.current.last_name = node }}
              value={form.last_name}
              onChange={(event) => setText('last_name', event.target.value)}
              autoComplete="family-name"
              maxLength={80}
              required
              aria-invalid={Boolean(errors.last_name)}
              aria-describedby={describedBy('last_name')}
            />
            {errors.last_name && <small id={inputErrorId('last_name')}>{errors.last_name}</small>}
          </label>
          <label>
            <span>Correo <b aria-hidden="true">*</b></span>
            <input
              ref={(node) => { fieldRefs.current.email = node }}
              value={form.email}
              onChange={(event) => setText('email', event.target.value)}
              type="email"
              inputMode="email"
              autoComplete="email"
              maxLength={254}
              required
              aria-invalid={Boolean(errors.email)}
              aria-describedby={describedBy('email')}
            />
            {errors.email && <small id={inputErrorId('email')}>{errors.email}</small>}
          </label>
          <label>
            <span>Telefono <em>opcional</em></span>
            <input
              ref={(node) => { fieldRefs.current.phone = node }}
              value={form.phone}
              onChange={(event) => setText('phone', event.target.value)}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              maxLength={40}
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={describedBy('phone')}
            />
            {errors.phone && <small id={inputErrorId('phone')}>{errors.phone}</small>}
          </label>
        </div>
      </fieldset>

      <fieldset className="nm-form-section">
        <legend>Contexto profesional</legend>
        <p>No solicites ni incluyas credenciales, servidores o datos productivos confidenciales.</p>
        <div className="nm-form-grid">
          <label>
            <span>Empresa <b aria-hidden="true">*</b></span>
            <input
              ref={(node) => { fieldRefs.current.company = node }}
              value={form.company}
              onChange={(event) => setText('company', event.target.value)}
              autoComplete="organization"
              maxLength={160}
              required
              aria-invalid={Boolean(errors.company)}
              aria-describedby={describedBy('company')}
            />
            {errors.company && <small id={inputErrorId('company')}>{errors.company}</small>}
          </label>
          <label>
            <span>Cargo o funcion <b aria-hidden="true">*</b></span>
            <input
              ref={(node) => { fieldRefs.current.role = node }}
              value={form.role}
              onChange={(event) => setText('role', event.target.value)}
              autoComplete="organization-title"
              maxLength={120}
              required
              aria-invalid={Boolean(errors.role)}
              aria-describedby={describedBy('role')}
            />
            {errors.role && <small id={inputErrorId('role')}>{errors.role}</small>}
          </label>
          <label>
            <span>Pais <b aria-hidden="true">*</b></span>
            <select
              ref={(node) => { fieldRefs.current.country = node }}
              value={form.country}
              onChange={(event) => setText('country', event.target.value)}
              autoComplete="country-name"
              required
              aria-invalid={Boolean(errors.country)}
              aria-describedby={describedBy('country')}
            >
              <option value="">Selecciona un pais</option>
              {countries.map((country) => <option key={country}>{country}</option>)}
            </select>
            {errors.country && <small id={inputErrorId('country')}>{errors.country}</small>}
          </label>
          <label>
            <span>Tipo de operacion <em>opcional</em></span>
            <select
              value={form.operation_type}
              onChange={(event) => setText('operation_type', event.target.value)}
            >
              <option value="">No especificado</option>
              <option>Mineria a cielo abierto</option>
              <option>Mineria subterranea</option>
              <option>Servicios mineros</option>
              <option>Tecnologia e integracion</option>
              <option>Otro</option>
            </select>
          </label>
          <label>
            <span>Tamano aproximado de flota <em>opcional</em></span>
            <select
              value={form.fleet_size_range}
              onChange={(event) => setText('fleet_size_range', event.target.value)}
            >
              <option value="">No especificado</option>
              <option>1-10 equipos</option>
              <option>11-30 equipos</option>
              <option>31-75 equipos</option>
              <option>76-150 equipos</option>
              <option>Mas de 150 equipos</option>
            </select>
          </label>
        </div>
      </fieldset>

      <fieldset className="nm-form-section">
        <legend>Que necesitas evaluar</legend>
        <p>Selecciona una o mas capacidades.</p>
        <div
          className="nm-interest-grid"
          aria-invalid={Boolean(errors.interests)}
          aria-describedby={describedBy('interests')}
        >
          {DEMO_ACCESS_INTERESTS.map((interest, index) => (
            <label key={interest}>
              <input
                ref={(node) => {
                  if (index === 0) fieldRefs.current.interests = node
                }}
                type="checkbox"
                checked={form.interests.includes(interest)}
                onChange={() => toggleInterest(interest)}
              />
              <span><Check size={15} aria-hidden="true" /> {interest}</span>
            </label>
          ))}
        </div>
        {errors.interests && <small id={inputErrorId('interests')} className="nm-field-error">{errors.interests}</small>}
      </fieldset>

      <fieldset className="nm-form-section">
        <legend>Contexto adicional</legend>
        <label className="nm-form-field--wide">
          <span>Mensaje <em>opcional</em></span>
          <textarea
            ref={(node) => { fieldRefs.current.message = node }}
            value={form.message}
            onChange={(event) => setText('message', event.target.value)}
            rows={5}
            maxLength={1200}
            aria-invalid={Boolean(errors.message)}
            aria-describedby={`demo-request-message-help${errors.message ? ` ${inputErrorId('message')}` : ''}`}
          />
          <span id="demo-request-message-help" className="nm-field-help">
            Describe el flujo o modulo que deseas revisar. No incluyas informacion confidencial.
          </span>
          {errors.message && <small id={inputErrorId('message')}>{errors.message}</small>}
        </label>
      </fieldset>

      <div className="nm-honeypot">
        <label>
          Sitio web. Deja este campo vacio.
          <input
            value={form.website}
            onChange={(event) => setText('website', event.target.value)}
            autoComplete="off"
            tabIndex={-1}
          />
        </label>
      </div>

      <div className="nm-form-consent">
        <label>
          <input
            ref={(node) => { fieldRefs.current.consent_accepted = node }}
            type="checkbox"
            checked={form.consent_accepted}
            onChange={(event) => {
              setForm((current) => ({ ...current, consent_accepted: event.target.checked }))
              if (errors.consent_accepted) {
                setErrors((current) => ({ ...current, consent_accepted: undefined }))
              }
            }}
            required
            aria-invalid={Boolean(errors.consent_accepted)}
            aria-describedby={describedBy('consent_accepted')}
          />
          <span>
            Acepto que estos datos se utilicen para revisar y responder mi solicitud de demostracion.
            Consulte la <a href="/privacy">politica de privacidad</a>.
          </span>
        </label>
        {errors.consent_accepted && (
          <small id={inputErrorId('consent_accepted')}>{errors.consent_accepted}</small>
        )}
      </div>

      <div className="nm-form-submit">
        <p>La solicitud sera revisada. El envio no crea una cuenta ni garantiza aprobacion inmediata.</p>
        <button className="nm-public-button nm-public-button--primary" type="submit" disabled={submitting}>
          {submitting ? (
            <><LoaderCircle className="nm-form-spinner" size={18} aria-hidden="true" /> Enviando solicitud</>
          ) : (
            <>Enviar solicitud <ArrowRight size={18} aria-hidden="true" /></>
          )}
        </button>
      </div>
      <div className="nm-form-live" aria-live="polite">
        {submitting ? 'Enviando solicitud. No cierres esta pagina.' : ''}
      </div>
    </form>
  )
}
