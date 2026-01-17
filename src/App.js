// src/App.js
import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import Login from './components/Login';
import Layout from './components/Layout';
import NuevoPaciente from './components/NuevoPaciente';
import ProgramarCita from './components/ProgramarCita';
import ReportarTratamiento from './components/ReportarTratamiento';
import Dashboard from './components/Dashboard';
import AdminPanel from './components/AdminPanel';
import MisPacientes from './components/MisPacientes';
import { SUPABASE_CONFIG } from './config/api';

// Tiempo de inactividad en minutos (diferenciado por rol)
const TIMEOUT_ESTUDIANTES_MINUTOS = 5;
const TIMEOUT_DOCENTES_MINUTOS = 360; // 6 horas

// Componente de inicio
const Inicio = ({ usuario }) => {
  const [citasProximas, setCitasProximas] = useState([]);
  const [cargandoCitas, setCargandoCitas] = useState(true);
  const [rechazos, setRechazos] = useState([]);
  const [cargandoRechazos, setCargandoRechazos] = useState(true);

  useEffect(() => {
    if (usuario?.rol === 'estudiante' && usuario?.id) {
      // Cargar citas
      const cargarCitas = async () => {
        try {
          const hoy = new Date().toISOString().split('T')[0];
          const res = await fetch(
            `${SUPABASE_CONFIG.URL}/rest/v1/citas?estudiante_id=eq.${usuario.id}&fecha_cita=gte.${hoy}&estado=neq.cancelada&order=fecha_cita,hora&select=*,pacientes(primer_nombre,primer_apellido)`,
            {
              headers: {
                'apikey': SUPABASE_CONFIG.ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_CONFIG.ANON_KEY}`
              }
            }
          );
          const data = await res.json();
          setCitasProximas(Array.isArray(data) ? data.slice(0, 5) : []);
        } catch (err) {
          console.error('Error cargando citas:', err);
        } finally {
          setCargandoCitas(false);
        }
      };

      // Cargar rechazos
      const cargarRechazos = async () => {
        try {
          // Primero obtener los rechazos
          const resRechazos = await fetch(
            `${SUPABASE_CONFIG.URL}/rest/v1/reporte_items?estado_aprobacion=eq.rechazado&select=*,reportes_tratamiento!inner(estudiante_id,pacientes:paciente_id(primer_nombre,primer_apellido)),usuarios:aprobado_por(nombre_completo)&reportes_tratamiento.estudiante_id=eq.${usuario.id}`,
            {
              headers: {
                'apikey': SUPABASE_CONFIG.ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_CONFIG.ANON_KEY}`
              }
            }
          );
          const rechazosData = await resRechazos.json();
          
          if (!Array.isArray(rechazosData) || rechazosData.length === 0) {
            setRechazos([]);
            setCargandoRechazos(false);
            return;
          }

          // Obtener los aprobados para filtrar los que ya fueron corregidos
          const resAprobados = await fetch(
            `${SUPABASE_CONFIG.URL}/rest/v1/reporte_items?estado_aprobacion=eq.aprobado&select=tipo_tratamiento,especificacion,created_at,reportes_tratamiento!inner(estudiante_id)&reportes_tratamiento.estudiante_id=eq.${usuario.id}`,
            {
              headers: {
                'apikey': SUPABASE_CONFIG.ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_CONFIG.ANON_KEY}`
              }
            }
          );
          const aprobadosData = await resAprobados.json();

          // Filtrar: mostrar rechazos solo si NO hay un aprobado posterior
          const rechazosActivos = rechazosData.filter(rechazo => {
            const aprobadoPosterior = (aprobadosData || []).find(apr => 
              apr.tipo_tratamiento === rechazo.tipo_tratamiento &&
              apr.especificacion === rechazo.especificacion &&
              new Date(apr.created_at) > new Date(rechazo.created_at)
            );
            return !aprobadoPosterior;
          });

          setRechazos(rechazosActivos);
        } catch (err) {
          console.error('Error cargando rechazos:', err);
        } finally {
          setCargandoRechazos(false);
        }
      };

      cargarCitas();
      cargarRechazos();
    } else {
      setCargandoCitas(false);
      setCargandoRechazos(false);
    }
  }, [usuario]);

  const formatearHora = (hora24) => {
    if (!hora24) return '';
    const [h, m] = hora24.split(':').map(Number);
    const periodo = h >= 12 ? 'PM' : 'AM';
    const hora12 = h > 12 ? h - 12 : (h === 0 ? 12 : h);
    return `${hora12}:${m.toString().padStart(2, '0')} ${periodo}`;
  };

  const formatearFecha = (fechaStr) => {
    const fecha = new Date(fechaStr + 'T12:00:00');
    return fecha.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          ¡Bienvenido, {usuario?.nombre_completo || 'Usuario'}!
        </h2>
        <p className="text-gray-600 mb-6">Sistema Clínico - Dra. Johana María Escobar Palomá</p>
        
        {usuario?.rol === 'estudiante' ? (
          <>
            {/* Alerta de rechazos */}
            {!cargandoRechazos && rechazos.length > 0 && (
              <div className="mb-6 p-4 bg-red-50 border border-red-300 rounded-lg">
                <h3 className="font-bold text-red-800 mb-3 flex items-center gap-2">
                  ⚠️ Tratamientos Rechazados ({rechazos.length})
                </h3>
                <div className="space-y-2">
                  {rechazos.map(r => (
                    <div key={r.id} className="bg-white p-3 rounded border border-red-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-800">
                          {r.tipo_tratamiento} {r.especificacion && `- ${r.especificacion}`}
                        </span>
                        <span className="text-sm text-gray-500">
                          {r.reportes_tratamiento?.pacientes?.primer_nombre} {r.reportes_tratamiento?.pacientes?.primer_apellido}
                        </span>
                      </div>
                      {r.comentario_aprobacion && (
                        <p className="text-sm text-red-700 bg-red-50 p-2 rounded">
                          <strong>Motivo:</strong> {r.comentario_aprobacion}
                        </p>
                      )}
                      {r.usuarios?.nombre_completo && (
                        <p className="text-xs text-gray-500 mt-1 text-right">
                          Rechazado por: Dra. {r.usuarios.nombre_completo}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-sm text-red-600 mt-3">
                  Debes corregir estos tratamientos y reportarlos nuevamente.
                </p>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-3">
              <Link to="/programar-cita" className="bg-green-50 p-4 rounded-lg border border-green-200 hover:bg-green-100 hover:shadow-md transition cursor-pointer">
                <h3 className="font-bold text-green-800 mb-2">📅 Programar Cita</h3>
                <p className="text-sm text-green-600">Agenda citas para tus pacientes</p>
              </Link>
              <Link to="/mis-pacientes" className="bg-teal-50 p-4 rounded-lg border border-teal-200 hover:bg-teal-100 hover:shadow-md transition cursor-pointer">
                <h3 className="font-bold text-teal-800 mb-2">👥 Mis Pacientes</h3>
                <p className="text-sm text-teal-600">Ver pacientes y cargar planes</p>
              </Link>
              <Link to="/reportar" className="bg-purple-50 p-4 rounded-lg border border-purple-200 hover:bg-purple-100 hover:shadow-md transition cursor-pointer">
                <h3 className="font-bold text-purple-800 mb-2">📝 Reportar</h3>
                <p className="text-sm text-purple-600">Reporta los tratamientos realizados</p>
              </Link>
            </div>

            {/* Mis próximas citas */}
            <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
              <h3 className="font-bold text-green-800 mb-3">📅 Mis próximas citas agendadas</h3>
              {cargandoCitas ? (
                <p className="text-sm text-gray-500">Cargando...</p>
              ) : citasProximas.length === 0 ? (
                <p className="text-sm text-gray-500">No tienes citas programadas</p>
              ) : (
                <div className="space-y-2">
                  {citasProximas.map(cita => (
                    <div key={cita.id} className="flex items-center justify-between bg-white p-3 rounded-lg border">
                      <div>
                        <p className="font-medium text-gray-800">
                          {cita.pacientes?.primer_nombre} {cita.pacientes?.primer_apellido}
                        </p>
                        <p className="text-sm text-gray-500">{cita.tratamiento_programado}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-green-700">{formatearFecha(cita.fecha_cita)}</p>
                        <p className="text-sm text-gray-500">{formatearHora(cita.hora)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <Link to="/dashboard" className="bg-amber-50 p-4 rounded-lg border border-amber-200 hover:bg-amber-100 hover:shadow-md transition cursor-pointer">
              <h3 className="font-bold text-amber-800 mb-2">📊 Dashboard</h3>
              <p className="text-sm text-amber-600">Revisa y aprueba los tratamientos reportados</p>
            </Link>
            <Link to="/admin" className="bg-indigo-50 p-4 rounded-lg border border-indigo-200 hover:bg-indigo-100 hover:shadow-md transition cursor-pointer">
              <h3 className="font-bold text-indigo-800 mb-2">⚙️ Administración</h3>
              <p className="text-sm text-indigo-600">Gestiona estudiantes, horarios y configuración</p>
            </Link>
          </div>
        )}

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-bold text-gray-700 mb-2">📅 Horarios habilitados del sistema</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• <strong>Miércoles:</strong> 1:00 PM - 7:00 PM</li>
            <li>• <strong>Viernes:</strong> 8:00 AM - 2:00 PM</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

// Componente de sesión expirada
const SesionExpirada = ({ onVolver }) => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
    <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
      <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="text-3xl">⏰</span>
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Sesión expirada</h2>
      <p className="text-gray-600 mb-6">
        Tu sesión se cerró por inactividad.
      </p>
      <button
        onClick={onVolver}
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
      >
        Volver a iniciar sesión
      </button>
    </div>
  </div>
);

// Componente para forzar redirección a inicio
const InicioRedirect = ({ onRedirected }) => {
  const navigate = useNavigate();
  
  useEffect(() => {
    navigate('/inicio', { replace: true });
    onRedirected();
  }, [navigate, onRedirected]);
  
  return null;
};

function App() {
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sesionExpirada, setSesionExpirada] = useState(false);
  const [irAInicio, setIrAInicio] = useState(false);

  // Función para cerrar sesión
  const cerrarSesion = useCallback((porInactividad = false) => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('usuario');
    sessionStorage.removeItem('ultimaActividad');
    setUsuario(null);
    if (porInactividad) {
      setSesionExpirada(true);
    }
  }, []);

  // Función para actualizar última actividad
  const actualizarActividad = useCallback(() => {
    if (usuario) {
      sessionStorage.setItem('ultimaActividad', Date.now().toString());
    }
  }, [usuario]);

  // Verificar sesión al cargar
  useEffect(() => {
    const token = sessionStorage.getItem('token');
    const usuarioGuardado = sessionStorage.getItem('usuario');
    const ultimaActividad = sessionStorage.getItem('ultimaActividad');
    
    if (token && usuarioGuardado) {
      const usuarioData = JSON.parse(usuarioGuardado);
      const timeoutMinutos = usuarioData.rol === 'docente' 
        ? TIMEOUT_DOCENTES_MINUTOS 
        : TIMEOUT_ESTUDIANTES_MINUTOS;
      
      // Verificar si la sesión expiró por inactividad
      if (ultimaActividad) {
        const tiempoInactivo = Date.now() - parseInt(ultimaActividad);
        const tiempoLimite = timeoutMinutos * 60 * 1000;
        
        if (tiempoInactivo > tiempoLimite) {
          cerrarSesion(true);
          setLoading(false);
          return;
        }
      }
      
      setUsuario(usuarioData);
      sessionStorage.setItem('ultimaActividad', Date.now().toString());
      setIrAInicio(true);
    }
    
    setLoading(false);
  }, [cerrarSesion]);

  // Verificar inactividad cada 30 segundos
  useEffect(() => {
    if (!usuario) return;

    const timeoutMinutos = usuario.rol === 'docente' 
      ? TIMEOUT_DOCENTES_MINUTOS 
      : TIMEOUT_ESTUDIANTES_MINUTOS;

    const verificarInactividad = () => {
      const ultimaActividad = sessionStorage.getItem('ultimaActividad');
      if (ultimaActividad) {
        const tiempoInactivo = Date.now() - parseInt(ultimaActividad);
        const tiempoLimite = timeoutMinutos * 60 * 1000;
        
        if (tiempoInactivo > tiempoLimite) {
          cerrarSesion(true);
        }
      }
    };

    const intervalo = setInterval(verificarInactividad, 30000); // cada 30 segundos
    return () => clearInterval(intervalo);
  }, [usuario, cerrarSesion]);

  // Detectar actividad del usuario
  useEffect(() => {
    if (!usuario) return;

    const eventos = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    
    const handleActividad = () => {
      actualizarActividad();
    };

    eventos.forEach(evento => {
      window.addEventListener(evento, handleActividad, { passive: true });
    });

    return () => {
      eventos.forEach(evento => {
        window.removeEventListener(evento, handleActividad);
      });
    };
  }, [usuario, actualizarActividad]);

  // Pantalla de carga
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Cargando...</p>
      </div>
    );
  }

  // Sesión expirada por inactividad
  if (sesionExpirada) {
    return <SesionExpirada onVolver={() => setSesionExpirada(false)} />;
  }

  // No hay usuario, mostrar login
  if (!usuario) {
    return <Login onLoginSuccess={(u) => {
      setUsuario(u);
      setSesionExpirada(false);
      setIrAInicio(true);
    }} />;
  }

  return (
    <BrowserRouter>
      {irAInicio && (
        <InicioRedirect onRedirected={() => setIrAInicio(false)} />
      )}
      <Routes>
        <Route path="/" element={<Layout usuario={usuario} />}>
          <Route index element={<Navigate to="/inicio" replace />} />
          <Route path="inicio" element={<Inicio usuario={usuario} />} />
          <Route path="nuevo-paciente" element={usuario?.rol === 'estudiante' ? <NuevoPaciente /> : <Navigate to="/inicio" replace />} />
          <Route path="programar-cita" element={usuario?.rol === 'estudiante' ? <ProgramarCita /> : <Navigate to="/inicio" replace />} />
          <Route path="reportar" element={usuario?.rol === 'estudiante' ? <ReportarTratamiento /> : <Navigate to="/inicio" replace />} />
          <Route path="mis-pacientes" element={usuario?.rol === 'estudiante' ? <MisPacientes /> : <Navigate to="/inicio" replace />} />
          <Route path="dashboard" element={usuario?.rol === 'docente' ? <Dashboard /> : <Navigate to="/inicio" replace />} />
          <Route path="admin" element={usuario?.rol === 'docente' ? <AdminPanel /> : <Navigate to="/inicio" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/inicio" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
