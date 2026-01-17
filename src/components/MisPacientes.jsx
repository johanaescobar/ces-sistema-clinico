// src/components/MisPacientes.jsx
import React, { useState, useEffect } from 'react';
import { Users, Edit, ChevronDown, ChevronUp, Loader2, AlertCircle, CheckCircle, X, Calendar, Clock } from 'lucide-react';
import { SUPABASE_CONFIG } from '../config/api';

const MisPacientes = () => {
  const [pacientes, setPacientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [pacienteExpandido, setPacienteExpandido] = useState(null);
  const [planExpandido, setPlanExpandido] = useState(null);
  const [modalEditar, setModalEditar] = useState(null);
  const [descripcionCambio, setDescripcionCambio] = useState('');
  const [enviandoCambio, setEnviandoCambio] = useState(false);
  const [mensajeExito, setMensajeExito] = useState(null);
  const [modalNuevoPlan, setModalNuevoPlan] = useState(null);
  const [textoPlan, setTextoPlan] = useState('');
  const [enviandoPlan, setEnviandoPlan] = useState(false);

  const usuario = JSON.parse(sessionStorage.getItem('usuario') || '{}');

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
      setPacientes(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  const togglePaciente = (pacienteId) => {
    setPacienteExpandido(pacienteExpandido === pacienteId ? null : pacienteId);
    setPlanExpandido(null);
  };

  const togglePlan = (planId) => {
    setPlanExpandido(planExpandido === planId ? null : planId);
  };

  const abrirModalEditar = (paciente, plan) => {
    setModalEditar({ paciente, plan });
    setDescripcionCambio('');
    setMensajeExito(null);
  };

  const cerrarModal = () => {
    setModalEditar(null);
    setDescripcionCambio('');
  };

  const enviarCambio = async () => {
    if (!descripcionCambio.trim()) return;
    
    setEnviandoCambio(true);
    try {
      const response = await fetch(
        `${SUPABASE_CONFIG.URL}/rest/v1/modificaciones_plan`,
        {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_CONFIG.ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_CONFIG.ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            plan_id: modalEditar.plan.id,
            paciente_id: modalEditar.paciente.id,
            estudiante_id: usuario.id,
            tipo_modificacion: 'modificar',
            descripcion_cambio: descripcionCambio,
            estado: 'pendiente'
          })
        }
      );

      if (!response.ok) throw new Error('Error al enviar cambio');
      
      setMensajeExito('Cambio enviado. La Dra. Johana recibirá una notificación para aprobarlo.');
      setDescripcionCambio('');
      
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviandoCambio(false);
    }
  };

  const enviarNuevoPlan = async () => {
    if (!textoPlan.trim() || !modalNuevoPlan) return;
    
    setEnviandoPlan(true);
    try {
      const paciente = modalNuevoPlan;
      // Construir texto con datos del paciente + plan
      const textoCompleto = `${paciente.primer_nombre} ${paciente.segundo_nombre || ''} ${paciente.primer_apellido} ${paciente.segundo_apellido || ''}. cc ${paciente.cedula}. cel. ${paciente.celular}. plan de tratamiento: ${textoPlan}`;
      
      const response = await fetch('https://brainlogic.ddnsfree.com/webhook/ces-nuevo-paciente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          correo: usuario.correo,
          texto: textoCompleto
        })
      });

      const data = await response.json();

      if (data.ok) {
        setMensajeExito('Plan de tratamiento registrado exitosamente');
        setTextoPlan('');
        setModalNuevoPlan(null);
        cargarPacientes();
      } else {
        setError(data.error || 'Error al registrar el plan');
      }
    } catch (err) {
      setError('Error de conexión con el servidor');
    } finally {
      setEnviandoPlan(false);
    }
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return 'N/A';
    return new Date(fecha).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatearPlan = (planCompleto) => {
    if (!planCompleto) return null;
    try {
      return typeof planCompleto === 'string' ? JSON.parse(planCompleto) : planCompleto;
    } catch {
      return null;
    }
  };

  const renderPlan = (plan) => {
    if (!plan) return <p className="text-gray-500">Sin plan de tratamiento</p>;

    return (
      <div className="space-y-4 text-sm">
        {plan.fase_higienica_periodontal && (
          <div>
            <h5 className="font-semibold text-blue-800 mb-2">Fase Higiénica Periodontal</h5>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              {plan.fase_higienica_periodontal.profilaxis && <li>Profilaxis</li>}
              {plan.fase_higienica_periodontal.detartraje?.generalizado && <li>Detartraje generalizado</li>}
              {plan.fase_higienica_periodontal.pulido_coronal?.dientes?.length > 0 && (
                <li>Pulido coronal: {plan.fase_higienica_periodontal.pulido_coronal.dientes.join(', ')}</li>
              )}
              {plan.fase_higienica_periodontal.raspaje_alisado_radicular?.dientes?.length > 0 && (
                <li>Raspaje y alisado radicular: {plan.fase_higienica_periodontal.raspaje_alisado_radicular.dientes.join(', ')}</li>
              )}
            </ul>
          </div>
        )}

        {plan.fase_higienica_dental && (
          <div>
            <h5 className="font-semibold text-blue-800 mb-2">Fase Higiénica Dental</h5>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              {plan.fase_higienica_dental.operatoria?.dientes?.length > 0 && (
                <li>Operatoria: {plan.fase_higienica_dental.operatoria.dientes.join(', ')}</li>
              )}
              {plan.fase_higienica_dental.exodoncias?.length > 0 && (
                <li>Exodoncias: {plan.fase_higienica_dental.exodoncias.join(', ')}</li>
              )}
              {plan.fase_higienica_dental.provisionales?.dientes?.length > 0 && (
                <li>Provisionales: {plan.fase_higienica_dental.provisionales.dientes.join(', ')}</li>
              )}
            </ul>
          </div>
        )}

        {plan.fase_reevaluativa && (
          <div>
            <h5 className="font-semibold text-blue-800 mb-2">Fase Reevaluativa</h5>
            <p className="text-gray-700">✓ Incluida en el plan</p>
          </div>
        )}

        {plan.fase_correctiva_inicial && (
          <div>
            <h5 className="font-semibold text-blue-800 mb-2">Fase Correctiva Inicial</h5>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              {plan.fase_correctiva_inicial.endodoncia?.length > 0 && (
                <li>Endodoncia: {plan.fase_correctiva_inicial.endodoncia.join(', ')}</li>
              )}
              {plan.fase_correctiva_inicial.postes?.length > 0 && (
                <li>Postes: {plan.fase_correctiva_inicial.postes.join(', ')}</li>
              )}
              {plan.fase_correctiva_inicial.nucleos?.length > 0 && (
                <li>Núcleos: {plan.fase_correctiva_inicial.nucleos.join(', ')}</li>
              )}
              {plan.fase_correctiva_inicial.reconstruccion_munon?.length > 0 && (
                <li>Reconstrucción muñón: {plan.fase_correctiva_inicial.reconstruccion_munon.join(', ')}</li>
              )}
            </ul>
          </div>
        )}

        {plan.fase_correctiva_final && (
          <div>
            <h5 className="font-semibold text-blue-800 mb-2">Fase Correctiva Final</h5>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              {plan.fase_correctiva_final.coronas?.length > 0 && (
                <li>Coronas: {plan.fase_correctiva_final.coronas.join(', ')}</li>
              )}
              {plan.fase_correctiva_final.incrustaciones?.length > 0 && (
                <li>Incrustaciones: {plan.fase_correctiva_final.incrustaciones.map(i => 
                  typeof i === 'object' ? `${i.diente}${i.tipo ? ` (${i.tipo})` : ''}` : i
                ).join(', ')}</li>
              )}
              {plan.fase_correctiva_final.protesis_removible && <li>Prótesis removible</li>}
              {plan.fase_correctiva_final.protesis_total && <li>Prótesis total</li>}
            </ul>
          </div>
        )}

        {plan.fase_mantenimiento && (
          <div>
            <h5 className="font-semibold text-blue-800 mb-2">Fase de Mantenimiento</h5>
            <p className="text-gray-700">✓ Incluida en el plan</p>
          </div>
        )}
      </div>
    );
  };

  if (cargando) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <Loader2 className="animate-spin mx-auto text-teal-600 mb-4" size={48} />
          <p className="text-gray-600">Cargando pacientes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center gap-2 text-red-600 mb-4">
            <AlertCircle size={24} />
            <span className="font-medium">Error al cargar pacientes</span>
          </div>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={cargarPacientes}
            className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="bg-teal-600 text-white px-6 py-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Users size={24} />
            Mis Pacientes
          </h2>
          <p className="text-teal-100 text-sm mt-1">
            Pacientes asignados. Puedes ver el historial de planes y proponer cambios.
          </p>
        </div>

        <div className="p-6">
          {pacientes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users size={48} className="mx-auto mb-4 opacity-50" />
              <p>No tienes pacientes asignados aún.</p>
              <p className="text-sm mt-2">Registra un nuevo paciente para comenzar.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {[...pacientes]
                .sort((a, b) => {
                  const nombreA = `${a.primer_nombre} ${a.primer_apellido}`.toLowerCase();
                  const nombreB = `${b.primer_nombre} ${b.primer_apellido}`.toLowerCase();
                  return nombreA.localeCompare(nombreB);
                })
                .map(paciente => {
                const planes = paciente.planes_tratamiento || [];
                const planesOrdenados = [...planes].sort((a, b) => 
                  new Date(b.created_at) - new Date(a.created_at)
                );
                const estaExpandido = pacienteExpandido === paciente.id;

                return (
                  <div key={paciente.id} className="border rounded-lg overflow-hidden">
                    <div 
                      className="bg-gray-50 px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition"
                      onClick={() => togglePaciente(paciente.id)}
                    >
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {paciente.primer_nombre} {paciente.segundo_nombre || ''} {paciente.primer_apellido} {paciente.segundo_apellido || ''}
                        </h3>
                        <p className="text-sm text-gray-600">
                          CC: {paciente.cedula} | Tel: {paciente.celular}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {planesOrdenados.length} plan(es) de tratamiento
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {estaExpandido ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                    </div>

                    {estaExpandido && (
                      <div className="px-4 py-4 bg-white border-t">
                        <h4 className="font-semibold text-gray-800 mb-3">Historial de Planes de Tratamiento</h4>
                        
                        {planesOrdenados.length === 0 ? (
                          <div className="text-center py-4">
                            <p className="text-gray-500 mb-3">Sin planes registrados</p>
                            <button
                              onClick={() => setModalNuevoPlan(paciente)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                            >
                              + Cargar Plan de Tratamiento
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {planesOrdenados.map((plan, index) => {
                              const planFormateado = formatearPlan(plan.plan_completo);
                              const esPlanExpandido = planExpandido === plan.id;
                              const esActivo = !plan.fecha_finalizacion;

                              return (
                                <div key={plan.id} className={`border rounded-lg ${esActivo ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}>
                                  <div 
                                    className="px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition"
                                    onClick={() => togglePlan(plan.id)}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className={`w-2 h-2 rounded-full ${esActivo ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium text-sm">
                                            Plan #{planesOrdenados.length - index}
                                          </span>
                                          {esActivo && (
                                            <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded">Activo</span>
                                          )}
                                          {plan.fecha_finalizacion && (
                                            <span className="text-xs bg-gray-500 text-white px-2 py-0.5 rounded">Finalizado</span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                                          <span className="flex items-center gap-1">
                                            <Calendar size={12} />
                                            Inicio: {formatearFecha(plan.created_at)}
                                          </span>
                                          {plan.fecha_finalizacion && (
                                            <span className="flex items-center gap-1">
                                              <Clock size={12} />
                                              Fin: {formatearFecha(plan.fecha_finalizacion)}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {esActivo && (
                                        <button
                                          onClick={(e) => { e.stopPropagation(); abrirModalEditar(paciente, plan); }}
                                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition"
                                          title="Proponer cambio"
                                        >
                                          <Edit size={16} />
                                        </button>
                                      )}
                                      {esPlanExpandido ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                    </div>
                                  </div>

                                  {esPlanExpandido && (
                                    <div className="px-4 py-3 border-t bg-white">
                                      {renderPlan(planFormateado)}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal Editar Plan */}
      {modalEditar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                Proponer cambio - {modalEditar.paciente.primer_nombre} {modalEditar.paciente.primer_apellido}
              </h3>
              <button onClick={cerrarModal} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              {mensajeExito ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2">
                  <CheckCircle className="text-green-600" size={20} />
                  <span className="text-green-800">{mensajeExito}</span>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-600 mb-4">
                    Describe el cambio o adición que necesitas hacer al plan de tratamiento. 
                    La Dra. Johana recibirá una notificación para aprobarlo.
                  </p>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Descripción del cambio
                    </label>
                    <textarea
                      value={descripcionCambio}
                      onChange={(e) => setDescripcionCambio(e.target.value)}
                      placeholder="Ej: Agregar endodoncia en diente 36 debido a caries profunda detectada en radiografía..."
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 h-32 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={cerrarModal}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={enviarCambio}
                      disabled={!descripcionCambio.trim() || enviandoCambio}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                    >
                      {enviandoCambio ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        'Enviar para aprobación'
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Nuevo Plan */}
      {modalNuevoPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                Cargar Plan - {modalNuevoPlan.primer_nombre} {modalNuevoPlan.primer_apellido}
              </h3>
              <button onClick={() => { setModalNuevoPlan(null); setTextoPlan(''); }} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm">
                <p><strong>Paciente:</strong> {modalNuevoPlan.primer_nombre} {modalNuevoPlan.segundo_nombre || ''} {modalNuevoPlan.primer_apellido} {modalNuevoPlan.segundo_apellido || ''}</p>
                <p><strong>Cédula:</strong> {modalNuevoPlan.cedula}</p>
                <p><strong>Teléfono:</strong> {modalNuevoPlan.celular}</p>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                Escribe solo el plan de tratamiento. Los datos del paciente ya están registrados.
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Plan de tratamiento
                </label>
                <textarea
                  value={textoPlan}
                  onChange={(e) => setTextoPlan(e.target.value)}
                  placeholder="Ej: fase higiénica: profilaxis, detartraje. Operatoria: resina del 24. Incrustación del 25..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 h-32 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => { setModalNuevoPlan(null); setTextoPlan(''); }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={enviarNuevoPlan}
                  disabled={!textoPlan.trim() || enviandoPlan}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                >
                  {enviandoPlan ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    'Guardar Plan'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MisPacientes;
