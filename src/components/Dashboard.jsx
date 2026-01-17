// src/components/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Loader2, RefreshCw, Clock, User, FileText, AlertCircle } from 'lucide-react';
import { SUPABASE_CONFIG } from '../config/api';

const Dashboard = () => {
  const [reportes, setReportes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [procesando, setProcesando] = useState(null);
  const [comentarioRechazo, setComentarioRechazo] = useState('');
  const [itemRechazando, setItemRechazando] = useState(null);

  const usuario = JSON.parse(sessionStorage.getItem('usuario') || '{}');

  const cargarReportes = async () => {
    setCargando(true);
    setError(null);

    try {
      // Cargar items pendientes con datos del reporte, estudiante y paciente
      const response = await fetch(
        `${SUPABASE_CONFIG.URL}/rest/v1/reporte_items?estado_aprobacion=eq.pendiente&select=*,reportes_tratamiento(id,fecha_reporte,reporte_texto,estudiante_id,paciente_id,usuarios:estudiante_id(nombre_completo,correo),pacientes:paciente_id(primer_nombre,primer_apellido,cedula))`,
        {
          headers: {
            'apikey': SUPABASE_CONFIG.ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_CONFIG.ANON_KEY}`
          }
        }
      );

      if (!response.ok) throw new Error('Error al cargar reportes');

      const data = await response.json();
      
      // Agrupar items por reporte
      const reportesAgrupados = data.reduce((acc, item) => {
        const reporteId = item.reporte_id;
        if (!acc[reporteId]) {
          const reporte = item.reportes_tratamiento;
          const estudiante = reporte?.usuarios;
          const paciente = reporte?.pacientes;
          
          acc[reporteId] = {
            id: reporteId,
            fecha: reporte?.fecha_reporte,
            estudiante: estudiante?.nombre_completo || 'Sin nombre',
            correo: estudiante?.correo || '',
            paciente: paciente ? `${paciente.primer_nombre} ${paciente.primer_apellido}` : 'Sin paciente',
            cedula: paciente?.cedula || '',
            observacion: reporte?.reporte_texto || '',
            items: []
          };
        }
        acc[reporteId].items.push({
          id: item.id,
          tipo_tratamiento: item.tipo_tratamiento,
          especificacion: item.especificacion,
          estado_reportado: item.estado_reportado
        });
        return acc;
      }, {});

      setReportes(Object.values(reportesAgrupados));
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarReportes();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const aprobarItem = async (itemId) => {
    setProcesando(itemId);

    try {
      const response = await fetch(
        `${SUPABASE_CONFIG.URL}/rest/v1/reporte_items?id=eq.${itemId}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_CONFIG.ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_CONFIG.ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            estado_aprobacion: 'aprobado',
            aprobado_por: usuario.id,
            fecha_aprobacion: new Date().toISOString()
          })
        }
      );

      if (response.ok) {
        // Actualizar UI - remover item aprobado
        setReportes(prev => prev.map(reporte => ({
          ...reporte,
          items: reporte.items.filter(item => item.id !== itemId)
        })).filter(reporte => reporte.items.length > 0));
      } else {
        alert('Error al aprobar');
      }
    } catch (err) {
      alert('Error de conexión');
    } finally {
      setProcesando(null);
    }
  };

  const rechazarItem = async (itemId) => {
    if (!comentarioRechazo.trim()) {
      alert('Por favor indica el motivo del rechazo');
      return;
    }

    setProcesando(itemId);

    try {
      const response = await fetch(
        `${SUPABASE_CONFIG.URL}/rest/v1/reporte_items?id=eq.${itemId}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_CONFIG.ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_CONFIG.ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            estado_aprobacion: 'rechazado',
            aprobado_por: usuario.id,
            fecha_aprobacion: new Date().toISOString(),
            comentario_aprobacion: comentarioRechazo
          })
        }
      );

      if (response.ok) {
        setReportes(prev => prev.map(reporte => ({
          ...reporte,
          items: reporte.items.filter(item => item.id !== itemId)
        })).filter(reporte => reporte.items.length > 0));
        setItemRechazando(null);
        setComentarioRechazo('');
      } else {
        alert('Error al rechazar');
      }
    } catch (err) {
      alert('Error de conexión');
    } finally {
      setProcesando(null);
    }
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return 'Sin fecha';
    return new Date(fecha).toLocaleDateString('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatearEstado = (estado) => {
    return estado === 'completo' ? 'TT' : 'EP';
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={48} className="animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg mb-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Dashboard de Aprobaciones</h2>
            <p className="text-gray-600">Revisa y aprueba los tratamientos reportados</p>
          </div>
          <button
            onClick={cargarReportes}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            <RefreshCw size={20} />
            Actualizar
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-100 border border-red-300 text-red-800 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {/* Sin reportes */}
      {reportes.length === 0 && !error && (
        <div className="bg-white rounded-lg shadow-lg p-12 text-center">
          <CheckCircle size={64} className="mx-auto mb-4 text-green-500" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">¡Todo al día!</h3>
          <p className="text-gray-600">No hay reportes pendientes de aprobación</p>
        </div>
      )}

      {/* Lista de reportes */}
      <div className="space-y-6">
        {reportes.map(reporte => (
          <div key={reporte.id} className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Header del reporte */}
            <div className="bg-gray-50 px-6 py-4 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-100 p-2 rounded-full">
                    <User size={24} className="text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{reporte.estudiante}</h3>
                    <p className="text-sm text-gray-500">{reporte.correo}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-gray-500">
                  <Clock size={16} />
                  <span className="text-sm">{formatearFecha(reporte.fecha)}</span>
                </div>
              </div>
            </div>

            {/* Info Paciente */}
            <div className="px-6 py-3 bg-purple-50 border-b">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-purple-600" />
                <span className="font-medium text-purple-800">{reporte.paciente}</span>
                <span className="text-sm text-purple-600">CC: {reporte.cedula}</span>
              </div>
            </div>

            {/* Observación del estudiante */}
            {reporte.observacion && reporte.observacion !== 'Reporte de tratamientos' && (
              <div className="px-6 py-3 bg-yellow-50 border-b">
                <p className="text-sm text-yellow-800">
                  <span className="font-medium">📝 Observación:</span> {reporte.observacion}
                </p>
              </div>
            )}

            {/* Items del reporte */}
            <div className="divide-y">
              {reporte.items.map(item => (
                <div key={item.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          item.estado_reportado === 'completo' 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {formatearEstado(item.estado_reportado)}
                        </span>
                        <span className="font-medium text-gray-900">{item.tipo_tratamiento}</span>
                        {item.especificacion && (
                          <span className="text-gray-500">- {item.especificacion}</span>
                        )}
                      </div>
                    </div>

                    {/* Botones de acción */}
                    <div className="flex items-center gap-2 ml-4">
                      {itemRechazando === item.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={comentarioRechazo}
                            onChange={(e) => setComentarioRechazo(e.target.value)}
                            placeholder="Motivo del rechazo..."
                            className="border border-gray-300 rounded px-3 py-1 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-red-500"
                            autoFocus
                          />
                          <button
                            onClick={() => rechazarItem(item.id)}
                            disabled={procesando === item.id}
                            className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 disabled:bg-gray-300"
                          >
                            {procesando === item.id ? <Loader2 size={16} className="animate-spin" /> : 'Confirmar'}
                          </button>
                          <button
                            onClick={() => { setItemRechazando(null); setComentarioRechazo(''); }}
                            className="text-gray-500 hover:text-gray-700 px-2"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => aprobarItem(item.id)}
                            disabled={procesando === item.id}
                            className="flex items-center gap-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-300 transition"
                          >
                            {procesando === item.id ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <CheckCircle size={16} />
                            )}
                            Aprobar
                          </button>
                          <button
                            onClick={() => setItemRechazando(item.id)}
                            disabled={procesando === item.id}
                            className="flex items-center gap-1 bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 disabled:bg-gray-300 transition"
                          >
                            <XCircle size={16} />
                            Rechazar
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
