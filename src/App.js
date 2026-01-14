// src/App.js
import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import Login from './components/Login';
import Layout from './components/Layout';
import NuevoPaciente from './components/NuevoPaciente';
import ProgramarCita from './components/ProgramarCita';
import ReportarTratamiento from './components/ReportarTratamiento';
import Dashboard from './components/Dashboard';
import AdminPanel from './components/AdminPanel';
import MisPacientes from './components/MisPacientes';

// Tiempo de inactividad en minutos (diferenciado por rol)
const TIMEOUT_ESTUDIANTES_MINUTOS = 5;
const TIMEOUT_DOCENTES_MINUTOS = 360; // 6 horas

// Componente de inicio
const Inicio = ({ usuario }) => (
  <div className="max-w-4xl mx-auto">
    <div className="bg-white rounded-lg shadow-lg p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        ¡Bienvenido, {usuario?.nombre_completo || 'Usuario'}!
      </h2>
      <p className="text-gray-600 mb-6">Sistema Clínico - Dra. Johana María Escobar Palomá</p>
      
      {usuario?.rol === 'estudiante' ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Link to="/nuevo-paciente" className="bg-blue-50 p-4 rounded-lg border border-blue-200 hover:bg-blue-100 hover:shadow-md transition cursor-pointer">
            <h3 className="font-bold text-blue-800 mb-2">📋 Nuevo Paciente</h3>
            <p className="text-sm text-blue-600">Registra pacientes con su plan de tratamiento</p>
          </Link>
          <Link to="/programar-cita" className="bg-green-50 p-4 rounded-lg border border-green-200 hover:bg-green-100 hover:shadow-md transition cursor-pointer">
            <h3 className="font-bold text-green-800 mb-2">📅 Programar Cita</h3>
            <p className="text-sm text-green-600">Agenda citas para tus pacientes</p>
          </Link>
          <Link to="/reportar" className="bg-purple-50 p-4 rounded-lg border border-purple-200 hover:bg-purple-100 hover:shadow-md transition cursor-pointer">
            <h3 className="font-bold text-purple-800 mb-2">📝 Reportar</h3>
            <p className="text-sm text-purple-600">Reporta los tratamientos realizados</p>
          </Link>
        </div>
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

      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-bold text-gray-700 mb-2">📅 Horarios de Clínica</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• <strong>Miércoles:</strong> 1:00 PM - 7:00 PM</li>
          <li>• <strong>Viernes:</strong> 8:00 AM - 2:00 PM</li>
        </ul>
      </div>
    </div>
  </div>
);

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

function App() {
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sesionExpirada, setSesionExpirada] = useState(false);

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
    }} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout usuario={usuario} />}>
          <Route index element={<Inicio usuario={usuario} />} />
          <Route path="inicio" element={<Inicio usuario={usuario} />} />
          <Route path="nuevo-paciente" element={<NuevoPaciente />} />
          <Route path="programar-cita" element={<ProgramarCita />} />
          <Route path="reportar" element={<ReportarTratamiento />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="admin" element={<AdminPanel />} />
          <Route path="mis-pacientes" element={<MisPacientes />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;