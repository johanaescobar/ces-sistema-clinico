// src/components/ReportarTratamiento.jsx
import React, { useState, useEffect } from 'react';
import { FileText, Loader2, CheckCircle, AlertCircle, ChevronLeft, User, Save } from 'lucide-react';
import { SUPABASE_CONFIG } from '../config/api';

const ReportarTratamiento = () => {
  // Estados
  const [paso, setPaso] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  // Datos
  const [pacientes, setPacientes] = useState([]);
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState(null);
  const [planTratamiento, setPlanTratamiento] = useState([]);
  const [reportesExistentes, setReportesExistentes] = useState([]);
  const [selecciones, setSelecciones] = useState({});
  const [observacion, setObservacion] = useState('');

  const usuario = JSON.parse(sessionStorage.getItem('usuario') || '{}');

  // Cargar pacientes del estudiante
  useEffect(() => {
    cargarPacientes();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const cargarPacientes = async () => {
    try {
      setCargando(true);
      const response = await fetch(
        `${SUPABASE_CONFIG.URL}/rest/v1/pacientes?estudiante_actual_id=eq.${usuario.id}&select=*,planes_tratamiento(*)`,
        {
          headers: {
            'apikey': SUPABASE_CONFIG.ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_CONFIG.ANON_KEY}`
          }
        }
      );

      if (!response.ok) throw new Error('Error al cargar pacientes');
      
      const data = await response.json();
      // Filtrar solo pacientes con plan aprobado
      const pacientesConPlan = data.filter(p => {
        const planes = p.planes_tratamiento || [];
        return planes.some(plan => plan.estado === 'aprobado' && !plan.fecha_finalizacion);
      });
      setPacientes(pacientesConPlan);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  const seleccionarPaciente = async (paciente) => {
    setPacienteSeleccionado(paciente);
    setCargando(true);
    setError('');

    try {
      // Obtener plan activo
      const planes = paciente.planes_tratamiento || [];
      const planActivo = planes.find(p => p.estado === 'aprobado' && !p.fecha_finalizacion);
      
      if (!planActivo) {
        setError('Este paciente no tiene un plan de tratamiento activo');
        setCargando(false);
        return;
      }

      // Parsear el plan
      const planData = typeof planActivo.plan_completo === 'string' 
        ? JSON.parse(planActivo.plan_completo) 
        : planActivo.plan_completo;

      // Extraer tratamientos del plan
      const tratamientos = extraerTratamientos(planData);
      setPlanTratamiento(tratamientos);

      // Cargar reportes existentes aprobados para este paciente
      const resReportes = await fetch(
        `${SUPABASE_CONFIG.URL}/rest/v1/reporte_items?select=*,reportes_tratamiento!inner(paciente_id)&reportes_tratamiento.paciente_id=eq.${paciente.id}&estado_aprobacion=eq.aprobado`,
        {
          headers: {
            'apikey': SUPABASE_CONFIG.ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_CONFIG.ANON_KEY}`
          }
        }
      );

      if (resReportes.ok) {
        const reportesData = await resReportes.json();
        setReportesExistentes(reportesData || []);
      }

      setPaso(2);
    } catch (err) {
      setError('Error al cargar el plan: ' + err.message);
    } finally {
      setCargando(false);
    }
  };

  const extraerTratamientos = (plan) => {
    const tratamientos = [];
    let id = 0;

    // Fase higiénica periodontal
    if (plan.fase_higienica_periodontal) {
      if (plan.fase_higienica_periodontal.profilaxis) {
        tratamientos.push({ id: id++, tipo: 'Profilaxis', especificacion: '', fase: 'Fase Higiénica Periodontal' });
      }
      if (plan.fase_higienica_periodontal.detartraje?.generalizado) {
        tratamientos.push({ id: id++, tipo: 'Detartraje', especificacion: 'Generalizado', fase: 'Fase Higiénica Periodontal' });
      }
      if (plan.fase_higienica_periodontal.detartraje?.dientes?.length > 0) {
        plan.fase_higienica_periodontal.detartraje.dientes.forEach(d => {
          tratamientos.push({ id: id++, tipo: 'Detartraje', especificacion: `Diente ${d}`, fase: 'Fase Higiénica Periodontal' });
        });
      }
      if (plan.fase_higienica_periodontal.pulido_coronal?.generalizado) {
        tratamientos.push({ id: id++, tipo: 'Pulido Coronal', especificacion: 'Generalizado', fase: 'Fase Higiénica Periodontal' });
      }
      if (plan.fase_higienica_periodontal.pulido_coronal?.dientes?.length > 0) {
        plan.fase_higienica_periodontal.pulido_coronal.dientes.forEach(d => {
          tratamientos.push({ id: id++, tipo: 'Pulido Coronal', especificacion: `Diente ${d}`, fase: 'Fase Higiénica Periodontal' });
        });
      }
      if (plan.fase_higienica_periodontal.raspaje_alisado_radicular?.dientes?.length > 0) {
        plan.fase_higienica_periodontal.raspaje_alisado_radicular.dientes.forEach(d => {
          tratamientos.push({ id: id++, tipo: 'Raspaje y Alisado', especificacion: `Diente ${d}`, fase: 'Fase Higiénica Periodontal' });
        });
      }
    }

    // Fase higiénica dental
    if (plan.fase_higienica_dental) {
      if (plan.fase_higienica_dental.operatoria?.dientes?.length > 0) {
        plan.fase_higienica_dental.operatoria.dientes.forEach(d => {
          tratamientos.push({ id: id++, tipo: 'Operatoria', especificacion: `Diente ${d}`, fase: 'Fase Higiénica Dental' });
        });
      }
      if (plan.fase_higienica_dental.exodoncias?.length > 0) {
        plan.fase_higienica_dental.exodoncias.forEach(d => {
          tratamientos.push({ id: id++, tipo: 'Exodoncia', especificacion: `Diente ${d}`, fase: 'Fase Higiénica Dental' });
        });
      }
      if (plan.fase_higienica_dental.provisionales?.dientes?.length > 0) {
        plan.fase_higienica_dental.provisionales.dientes.forEach(d => {
          tratamientos.push({ id: id++, tipo: 'Provisional', especificacion: `Diente ${d}`, fase: 'Fase Higiénica Dental' });
        });
      }
    }

    // Fase reevaluativa
    if (plan.fase_reevaluativa) {
      tratamientos.push({ id: id++, tipo: 'Reevaluación', especificacion: '', fase: 'Fase Reevaluativa' });
    }

    // Fase correctiva inicial
    if (plan.fase_correctiva_inicial) {
      if (plan.fase_correctiva_inicial.endodoncia?.length > 0) {
        plan.fase_correctiva_inicial.endodoncia.forEach(d => {
          tratamientos.push({ id: id++, tipo: 'Endodoncia', especificacion: `Diente ${d}`, fase: 'Fase Correctiva Inicial' });
        });
      }
      if (plan.fase_correctiva_inicial.postes?.length > 0) {
        plan.fase_correctiva_inicial.postes.forEach(d => {
          tratamientos.push({ id: id++, tipo: 'Poste', especificacion: `Diente ${d}`, fase: 'Fase Correctiva Inicial' });
        });
      }
      if (plan.fase_correctiva_inicial.nucleos?.length > 0) {
        plan.fase_correctiva_inicial.nucleos.forEach(d => {
          tratamientos.push({ id: id++, tipo: 'Núcleo', especificacion: `Diente ${d}`, fase: 'Fase Correctiva Inicial' });
        });
      }
      if (plan.fase_correctiva_inicial.reconstruccion_munon?.length > 0) {
        plan.fase_correctiva_inicial.reconstruccion_munon.forEach(d => {
          tratamientos.push({ id: id++, tipo: 'Reconstrucción Muñón', especificacion: `Diente ${d}`, fase: 'Fase Correctiva Inicial' });
        });
      }
    }

    // Fase correctiva final
    if (plan.fase_correctiva_final) {
      if (plan.fase_correctiva_final.coronas?.length > 0) {
        plan.fase_correctiva_final.coronas.forEach(d => {
          tratamientos.push({ id: id++, tipo: 'Corona', especificacion: `Diente ${d}`, fase: 'Fase Correctiva Final' });
        });
      }
      if (plan.fase_correctiva_final.incrustaciones?.length > 0) {
        plan.fase_correctiva_final.incrustaciones.forEach(i => {
          const esp = typeof i === 'object' 
            ? `Diente ${i.diente}${i.tipo ? ` (${i.tipo})` : ''}` 
            : `Diente ${i}`;
          tratamientos.push({ id: id++, tipo: 'Incrustación', especificacion: esp, fase: 'Fase Correctiva Final' });
        });
      }
      if (plan.fase_correctiva_final.protesis_removible) {
        tratamientos.push({ id: id++, tipo: 'Prótesis Removible', especificacion: '', fase: 'Fase Correctiva Final' });
      }
      if (plan.fase_correctiva_final.protesis_total) {
        tratamientos.push({ id: id++, tipo: 'Prótesis Total', especificacion: '', fase: 'Fase Correctiva Final' });
      }
    }

    // Fase mantenimiento
    if (plan.fase_mantenimiento) {
      tratamientos.push({ id: id++, tipo: 'Mantenimiento', especificacion: '', fase: 'Fase de Mantenimiento' });
    }

    return tratamientos;
  };

  const estaAprobado = (tratamiento) => {
    return reportesExistentes.some(r => 
      r.tipo_tratamiento === tratamiento.tipo && 
      r.especificacion === tratamiento.especificacion &&
      r.estado_aprobacion === 'aprobado'
    );
  };

  const handleSeleccion = (tratamientoId, estado) => {
    setSelecciones(prev => {
      const nuevo = { ...prev };
      if (nuevo[tratamientoId] === estado) {
        delete nuevo[tratamientoId];
      } else {
        nuevo[tratamientoId] = estado;
      }
      return nuevo;
    });
  };

  const guardarReporte = async () => {
    const seleccionados = Object.entries(selecciones);
    if (seleccionados.length === 0) {
      setError('Selecciona al menos un tratamiento');
      return;
    }

    setGuardando(true);
    setError('');

    try {
      // 1. Crear el reporte principal
      const resReporte = await fetch(
        `${SUPABASE_CONFIG.URL}/rest/v1/reportes_tratamiento`,
        {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_CONFIG.ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_CONFIG.ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            paciente_id: pacienteSeleccionado.id,
            estudiante_id: usuario.id,
            fecha_reporte: new Date().toISOString(),
            reporte_texto: observacion || 'Reporte de tratamientos',
            estado: 'pendiente'
          })
        }
      );

      if (!resReporte.ok) throw new Error('Error al crear reporte');
      
      const reporteCreado = await resReporte.json();
      const reporteId = reporteCreado[0].id;

      // 2. Crear los items del reporte
      const items = seleccionados.map(([id, estado]) => {
        const tratamiento = planTratamiento.find(t => t.id === parseInt(id));
        return {
          reporte_id: reporteId,
          tipo_tratamiento: tratamiento.tipo,
          especificacion: tratamiento.especificacion,
          descripcion: `${tratamiento.tipo} ${tratamiento.especificacion}`.trim(),
          estado_reportado: estado,
          estado_aprobacion: 'pendiente',
          actualizado_excel: false
        };
      });

      const resItems = await fetch(
        `${SUPABASE_CONFIG.URL}/rest/v1/reporte_items`,
        {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_CONFIG.ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_CONFIG.ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(items)
        }
      );

      if (!resItems.ok) throw new Error('Error al guardar tratamientos');

      setPaso(3);

    } catch (err) {
      setError('Error al guardar: ' + err.message);
    } finally {
      setGuardando(false);
    }
  };

  const reiniciar = () => {
    setPaso(1);
    setPacienteSeleccionado(null);
    setPlanTratamiento([]);
    setReportesExistentes([]);
    setSelecciones({});
    setObservacion('');
    setError('');
  };

  // Agrupar tratamientos por fase
  const tratamientosPorFase = planTratamiento.reduce((acc, t) => {
    if (!acc[t.fase]) acc[t.fase] = [];
    acc[t.fase].push(t);
    return acc;
  }, {});

  if (cargando && paso === 1) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <Loader2 className="animate-spin mx-auto text-purple-600 mb-4" size={48} />
          <p className="text-gray-600">Cargando pacientes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-purple-600 text-white px-6 py-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileText size={24} />
            Reportar Tratamiento
          </h2>
          <p className="text-purple-100 text-sm mt-1">
            {paso === 1 && 'Selecciona un paciente'}
            {paso === 2 && 'Marca los tratamientos realizados'}
            {paso === 3 && '¡Reporte enviado!'}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <div className="p-6">
          {/* PASO 1: Seleccionar paciente */}
          {paso === 1 && (
            <div>
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <User size={20} />
                Selecciona el paciente
              </h3>

              {pacientes.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <User size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No tienes pacientes con plan aprobado.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {[...pacientes]
                    .sort((a, b) => {
                      const nombreA = `${a.primer_nombre} ${a.primer_apellido}`.toLowerCase();
                      const nombreB = `${b.primer_nombre} ${b.primer_apellido}`.toLowerCase();
                      return nombreA.localeCompare(nombreB);
                    })
                    .map(p => (
                      <button
                        key={p.id}
                        onClick={() => seleccionarPaciente(p)}
                        className="w-full text-left p-4 border rounded-lg hover:bg-purple-50 hover:border-purple-300 transition"
                      >
                        <div className="font-medium">
                          {p.primer_nombre} {p.segundo_nombre || ''} {p.primer_apellido} {p.segundo_apellido || ''}
                        </div>
                        <div className="text-sm text-gray-500">
                          CC: {p.cedula} | Tel: {p.celular}
                        </div>
                      </button>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* PASO 2: Marcar tratamientos */}
          {paso === 2 && (
            <div>
              {cargando ? (
                <div className="text-center py-8">
                  <Loader2 className="animate-spin mx-auto text-purple-600 mb-4" size={32} />
                  <p className="text-gray-600">Cargando plan de tratamiento...</p>
                </div>
              ) : (
                <>
                  {/* Info paciente */}
                  <div className="bg-purple-50 rounded-lg p-3 mb-4">
                    <p className="font-medium text-purple-800">
                      {pacienteSeleccionado?.primer_nombre} {pacienteSeleccionado?.primer_apellido}
                    </p>
                    <p className="text-sm text-purple-600">CC: {pacienteSeleccionado?.cedula}</p>
                  </div>

                  {/* Leyenda */}
                  <div className="flex gap-4 mb-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
                      <span className="text-gray-600">Aprobado (no editable)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-blue-600">TT</span>
                      <span className="text-gray-600">= Tratamiento Terminado</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-amber-600">EP</span>
                      <span className="text-gray-600">= En Proceso</span>
                    </div>
                  </div>

                  {/* Tratamientos por fase */}
                  <div className="space-y-4 max-h-80 overflow-y-auto">
                    {Object.entries(tratamientosPorFase).map(([fase, tratamientos]) => (
                      <div key={fase}>
                        <h4 className="font-semibold text-gray-700 mb-2 text-sm bg-gray-100 px-3 py-1 rounded">
                          {fase}
                        </h4>
                        <div className="space-y-2">
                          {tratamientos.map(t => {
                            const aprobado = estaAprobado(t);
                            const seleccion = selecciones[t.id];

                            return (
                              <div 
                                key={t.id} 
                                className={`flex items-center justify-between p-3 rounded-lg border ${
                                  aprobado 
                                    ? 'bg-green-50 border-green-200' 
                                    : 'bg-white border-gray-200 hover:bg-gray-50'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  {aprobado && <CheckCircle size={18} className="text-green-600" />}
                                  <span className={aprobado ? 'text-green-700' : 'text-gray-800'}>
                                    {t.tipo}
                                    {t.especificacion && <span className="text-gray-500 ml-1">- {t.especificacion}</span>}
                                  </span>
                                </div>

                                {aprobado ? (
                                  <span className="text-xs bg-green-600 text-white px-2 py-1 rounded">
                                    ✓ Aprobado
                                  </span>
                                ) : (
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleSeleccion(t.id, 'TT')}
                                      className={`px-3 py-1 rounded text-sm font-medium transition ${
                                        seleccion === 'TT'
                                          ? 'bg-blue-600 text-white'
                                          : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                      }`}
                                    >
                                      TT
                                    </button>
                                    <button
                                      onClick={() => handleSeleccion(t.id, 'EP')}
                                      className={`px-3 py-1 rounded text-sm font-medium transition ${
                                        seleccion === 'EP'
                                          ? 'bg-amber-600 text-white'
                                          : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                      }`}
                                    >
                                      EP
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Observaciones */}
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Observaciones (opcional)
                    </label>
                    <textarea
                      value={observacion}
                      onChange={(e) => setObservacion(e.target.value)}
                      placeholder="Agrega cualquier observación sobre los tratamientos realizados..."
                      className="w-full border rounded-lg p-3 h-20 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  {/* Resumen de selección */}
                  {Object.keys(selecciones).length > 0 && (
                    <div className="mt-4 p-3 bg-purple-50 rounded-lg">
                      <p className="text-sm text-purple-800">
                        <strong>{Object.keys(selecciones).length}</strong> tratamiento(s) seleccionado(s)
                      </p>
                    </div>
                  )}

                  {/* Botones */}
                  <div className="flex gap-2 mt-6">
                    <button
                      onClick={() => {
                        setPaso(1);
                        setPacienteSeleccionado(null);
                        setSelecciones({});
                        setObservacion('');
                      }}
                      className="flex-1 px-4 py-3 border rounded-lg hover:bg-gray-50 transition flex items-center justify-center gap-2"
                    >
                      <ChevronLeft size={18} />
                      Volver
                    </button>
                    <button
                      onClick={guardarReporte}
                      disabled={guardando || Object.keys(selecciones).length === 0}
                      className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                    >
                      {guardando ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          Guardando...
                        </>
                      ) : (
                        <>
                          <Save size={18} />
                          Guardar Reporte
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* PASO 3: Éxito */}
          {paso === 3 && (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="text-green-600" size={32} />
              </div>
              
              <h3 className="text-xl font-bold text-green-800 mb-2">¡Reporte Enviado!</h3>
              <p className="text-gray-600 mb-6">
                La Dra. Johana recibirá una notificación para aprobar los tratamientos reportados.
              </p>

              <button
                onClick={reiniciar}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
              >
                Reportar otro tratamiento
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportarTratamiento;
