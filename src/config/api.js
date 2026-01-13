// config/api.js
export const API_ENDPOINTS = {
  // Autenticación
  AUTH_SOLICITAR_CODIGO: 'https://brainlogic.ddnsfree.com/webhook/ces-auth',
  AUTH_VALIDAR_CODIGO: 'https://brainlogic.ddnsfree.com/webhook/ces-auth',
  
  // Gestión de pacientes
  NUEVO_PACIENTE: 'https://brainlogic.ddnsfree.com/webhook/ces-nuevo-paciente',
  
  // Citas
  PROGRAMAR_CITA: 'https://brainlogic.ddnsfree.com/webhook/ces-programar-cita',
  
  // Reportes
  REPORTAR_TRATAMIENTO: 'https://brainlogic.ddnsfree.com/webhook/ces-reportar-tratamiento',
  
  // Aprobación (Dashboard Johana)
  APROBAR_RECHAZAR_ITEM: 'https://brainlogic.ddnsfree.com/webhook/ces-aprobar-item'
};

// Supabase
export const SUPABASE_CONFIG = {
  URL: 'https://sgctotnttqdtiilxcwoi.supabase.co',
  ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnY3RvdG50dHFkdGlpbHhjd29pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxODQ3NzEsImV4cCI6MjA4Mzc2MDc3MX0.vwfEHe81nI6PAntDRL1PuoW0CyfOBUpGiYOlR5Mj6mc'
};