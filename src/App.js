// src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Layout from './components/Layout';
import NuevoPaciente from './components/NuevoPaciente';
import ProgramarCita from './components/ProgramarCita';
import ReportarTratamiento from './components/ReportarTratamiento';
import Dashboard from './components/Dashboard';
import AdminPanel from './components/AdminPanel';

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
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="font-bold text-blue-800 mb-2">📋 Nuevo Paciente</h3>
            <p className="text-sm text-blue-600">Registra pacientes con su plan de tratamiento</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h3 className="font-bold text-green-800 mb-2">📅 Programar Cita</h3>
            <p className="text-sm text-green-600">Agenda citas para tus pacientes</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <h3 className="font-bold text-purple-800 mb-2">📝 Reportar</h3>
            <p className="text-sm text-purple-600">Reporta los tratamientos realizados</p>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
          <h3 className="font-bold text-amber-800 mb-2">🏥 Panel de Docente</h3>
          <p className="text-sm text-amber-600">
            Ve al Dashboard para revisar y aprobar los tratamientos reportados por tus estudiantes.
          </p>
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

function App() {
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const usuarioGuardado = localStorage.getItem('usuario');
    
    if (token && usuarioGuardado) {
      setUsuario(JSON.parse(usuarioGuardado));
    }
    
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Cargando...</p>
      </div>
    );
  }

  if (!usuario) {
    return <Login onLoginSuccess={setUsuario} />;
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
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;