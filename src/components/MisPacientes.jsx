// src/components/MisPacientes.jsx
import React, { useState, useEffect } from 'react';
import { Users, Edit, ChevronDown, ChevronUp, Loader2, AlertCircle, CheckCircle, X, Calendar, Clock, Check } from 'lucide-react';
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
  const [tratamientosAprobados, setTratamientosAprobados] = useState({});

  const usuario = JSON.parse(sessionStorage.getItem('usuario') || '{}');

  useEffect(() => {
    cargarPacientes();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const cargarPacientes = async () => {
    try {
      setCargando(true);
      
      const response = await fetch(
        `${SUPABASE_CONFIG.URL}/rest/v1/pacientes?estudiante_actual_id=eq.${usuario.id}&select=*,planes_tratamiento(*)&order=primer_apellido.asc,primer_nombre.asc`
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

      // Cargar tratamientos aprobados para todos los pacientes
      const pacienteIds = data.map(p => p.id);
      if (pacienteIds.length > 0) {
        await cargarTratamientosAprobados(pacienteIds);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  const cargarTratamientosAprobados = async (pacienteIds) => {
    try {
      const response = await fetch(
        `${SUPABASE_CONFIG.URL}/rest/v1/reporte_items?estado_aprobacion=eq.aprobado&select=*,reportes_tratamiento!inner(paciente_id)`,
        {
          headers: {
            'apikey': SUPABASE_CONFIG.ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_CONFIG.ANON_KEY}`
          }
        }
      );

      if (!response.ok) return;

      const data = await response.json();
      
      // Agrupar por paciente_id
      const agrupados = {};
      (data || []).forEach(item => {
        const pacienteId = item.reportes_tratamiento?.paciente_id;
        if (pacienteId && pacienteIds.includes(pacienteId)) {
          if (!agrupados[pacienteId]) agrupados[pacienteId] = [];
          agrupados[pacienteId].push({
            tipo: item.tipo_tratamiento,
            especificacion: item.especificacion || '',
            estado: item.estado_reportado // 'completo' o 'en_proceso'
          });
        }
      });

      setTratamientosAprobados(agrupados);
    } catch (err) {
      console.error('Error cargando tratamientos aprobados:', err);
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

  // Verificar si un tratamiento está completado (TT aprobado)
  const estaCompletado = (pacienteId, tipo, especificacion = '') => {
    const aprobados = tratamientosAprobados[pacienteId] || [];
    return aprobados.some(a => 
      a.tipo === tipo && 
      a.especificacion === especificacion && 
      a.estado === 'completo'
    );
  };

  // Verificar si está en proceso (EP aprobado)
  const estaEnProceso = (pacienteId, tipo, especificacion = '') => {
    const aprobados = tratamientosAprobados[pacienteId] || [];
    return aprobados.some(a => 
      a.tipo === tipo && 
      a.especificacion === especificacion && 
      a.estado === 'en_proceso'
    );
  };

  // Renderizar item con check/estado
  const renderItem = (pacienteId, tipo, especificacion, texto, key) => {
    const completado = estaCompletado(pacienteId, tipo, especificacion);
    const enProceso = estaEnProceso(pacienteId, tipo, especificacion);

    return (
      <li key={key} className={`flex items-center gap-2 ${completado ? 'text-green-700' : enProceso ? 'text-amber-700' : 'text-gray-700'}`}>
        {completado ? (
          <Check size={16} className="text-green-600 flex-shrink-0" />
        ) : enProceso ? (
          <span className="w-4 h-4 border-2 border-amber-500 rounded-full flex-shrink-0"></span>
        ) : (
          <span className="w-4 h-4 border border-gray-300 rounded-full flex-shrink-0"></span>
        )}
        <span className={completado ? 'line-through' : ''}>{texto}</span>
        {completado && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">TT</span>}
        {enProceso && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">EP</span>}
      </li>
    );
  };

  // Formatear diente con superficie
  const formatearDienteConSuperficie = (item) => {
    if (typeof item === 'object' && item !== null) {
      if (item.superficies) {
        return `${item.diente} (${item.superficies})`;
      }
      if (item.superficie) {
        return `${item.diente} (${item.superficie})`;
      }
      return item.diente;
    }
    return item;
  };

  // Formatear corona con tipo
  const formatearCorona = (item) => {
    if (typeof item === 'object' && item !== null) {
      return `${item.diente}${item.tipo ? ` (${item.tipo})` : ''}`;
    }
    return item;
  };

  // Formatear incrustación con tipo_pieza y material
  const formatearIncrustacion = (item) => {
    if (typeof item === 'object' && item !== null) {
      let texto = `${item.diente}`;
      const detalles = [];
      if (item.tipo_pieza) detalles.push(item.tipo_pieza);
      if (item.material) detalles.push(item.material);
      if (detalles.length > 0) texto += ` (${detalles.join(', ')})`;
      return texto;
    }
    return item;
  };

  // Formatear prótesis fija
  const formatearProtesisFija = (item) => {
    if (typeof item === 'object' && item !== null) {
      return `Tramo ${item.tramo}${item.tipo ? ` (${item.tipo})` : ''}`;
    }
    return item;
  };

  const renderPlan = (plan, pacienteId) => {
    if (!plan) return <p className="text-gray-500">Sin plan de tratamiento</p>;

    return (
      <div className="space-y-4 text-sm">
        {/* Leyenda */}
        <div className="flex gap-4 text-xs text-gray-500 border-b pb-2">
          <span className="flex items-center gap-1"><Check size={12} className="text-green-600" /> TT = Terminado</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 border-2 border-amber-500 rounded-full"></span> EP = En Proceso</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 border border-gray-300 rounded-full"></span> Pendiente</span>
        </div>

        {/* FASE HIGIÉNICA PERIODONTAL */}
        {plan.fase_higienica_periodontal && (
          <div>
            <h5 className="font-semibold text-blue-800 mb-2">Fase Higiénica Periodontal</h5>
            <ul className="space-y-1">
              {plan.fase_higienica_periodontal.profilaxis && 
                renderItem(pacienteId, 'Profilaxis', '', 'Profilaxis', 'profilaxis')}
              
              {plan.fase_higienica_periodontal.detartraje?.generalizado && 
                renderItem(pacienteId, 'Detartraje', 'Generalizado', 'Detartraje generalizado', 'detartraje-gen')}
              
              {plan.fase_higienica_periodontal.detartraje?.dientes?.map((d, idx) => {
                const diente = formatearDienteConSuperficie(d);
                const especificacion = typeof d === 'object' ? `Diente ${d.diente}` : `Diente ${d}`;
                return renderItem(pacienteId, 'Detartraje', especificacion, `Detartraje: ${diente}`, `detartraje-${idx}`);
              })}
              
              {/* Aplicación de Flúor */}
              {plan.fase_higienica_periodontal.aplicacion_fluor?.map((d, idx) => {
                const diente = formatearDienteConSuperficie(d);
                const especificacion = typeof d === 'object' ? `Diente ${d.diente}` : `Diente ${d}`;
                return renderItem(pacienteId, 'Aplicación Flúor', especificacion, `Aplicación flúor: ${diente}`, `fluor-${idx}`);
              })}
              
              {/* Pulido - CORREGIDO: es array directo, no .dientes */}
              {plan.fase_higienica_periodontal.pulido?.map((d, idx) => {
                const diente = formatearDienteConSuperficie(d);
                const especificacion = typeof d === 'object' ? `Diente ${d.diente}` : `Diente ${d}`;
                return renderItem(pacienteId, 'Pulido', especificacion, `Pulido: ${diente}`, `pulido-${idx}`);
              })}
              
              {/* Raspaje y Alisado - CORREGIDO: es array directo, no .dientes */}
              {plan.fase_higienica_periodontal.raspaje_alisado_radicular?.map((d, idx) => {
                const diente = formatearDienteConSuperficie(d);
                const especificacion = typeof d === 'object' ? `Diente ${d.diente}` : `Diente ${d}`;
                return renderItem(pacienteId, 'Raspaje y Alisado', especificacion, `Raspaje y alisado radicular: ${diente}`, `raspaje-${idx}`);
              })}
            </ul>
          </div>
        )}

        {/* FASE HIGIÉNICA DENTAL */}
        {plan.fase_higienica_dental && (
          <div>
            <h5 className="font-semibold text-blue-800 mb-2">Fase Higiénica Dental</h5>
            <ul className="space-y-1">
              {/* Operatoria/Resinas - CORREGIDO: es array directo */}
              {plan.fase_higienica_dental.operatoria?.map((d, idx) => {
                const diente = formatearDienteConSuperficie(d);
                const especificacion = typeof d === 'object' ? `Diente ${d.diente}` : `Diente ${d}`;
                return renderItem(pacienteId, 'Operatoria', especificacion, `Operatoria/Resina: ${diente}`, `operatoria-${idx}`);
              })}
              
              {/* Exodoncias */}
              {plan.fase_higienica_dental.exodoncias?.map((d, idx) => {
                const diente = formatearDienteConSuperficie(d);
                const especificacion = typeof d === 'object' ? `Diente ${d.diente}` : `Diente ${d}`;
                return renderItem(pacienteId, 'Exodoncia', especificacion, `Exodoncia: ${diente}`, `exodoncia-${idx}`);
              })}
              
              {/* Retiro de Coronas - NUEVO */}
              {plan.fase_higienica_dental.retiro_coronas?.map((d, idx) => {
                const diente = formatearDienteConSuperficie(d);
                const especificacion = typeof d === 'object' ? `Diente ${d.diente}` : `Diente ${d}`;
                return renderItem(pacienteId, 'Retiro Corona', especificacion, `Retiro corona: ${diente}`, `retiro-corona-${idx}`);
              })}
              
              {/* Provisionales - CORREGIDO: es array directo */}
              {plan.fase_higienica_dental.provisionales?.map((d, idx) => {
                const diente = formatearDienteConSuperficie(d);
                const especificacion = typeof d === 'object' ? `Diente ${d.diente}` : `Diente ${d}`;
                return renderItem(pacienteId, 'Provisional', especificacion, `Provisional: ${diente}`, `provisional-${idx}`);
              })}
              
              {/* Rebase de Provisionales - NUEVO */}
              {plan.fase_higienica_dental.rebase_provisionales?.map((d, idx) => {
                const diente = formatearDienteConSuperficie(d);
                const especificacion = typeof d === 'object' ? `Diente ${d.diente}` : `Diente ${d}`;
                return renderItem(pacienteId, 'Rebase Provisional', especificacion, `Rebase provisional: ${diente}`, `rebase-prov-${idx}`);
              })}
              
              {/* Prótesis Transicional - NUEVO */}
              {plan.fase_higienica_dental.protesis_transicional?.superior && 
                renderItem(pacienteId, 'Prótesis Transicional', 'Superior', 
                  `Prótesis transicional superior${plan.fase_higienica_dental.protesis_transicional.dientes_reemplazar?.length > 0 ? ` (reemplaza: ${plan.fase_higienica_dental.protesis_transicional.dientes_reemplazar.join(', ')})` : ''}`, 
                  'pt-superior')}
              {plan.fase_higienica_dental.protesis_transicional?.inferior && 
                renderItem(pacienteId, 'Prótesis Transicional', 'Inferior', 
                  `Prótesis transicional inferior`, 
                  'pt-inferior')}
              
              {/* Rebase de Prótesis Transicional - NUEVO */}
              {plan.fase_higienica_dental.rebase_protesis_transicional?.superior && 
                renderItem(pacienteId, 'Rebase Prótesis Transicional', 'Superior', 'Rebase prótesis transicional superior', 'rebase-pt-sup')}
              {plan.fase_higienica_dental.rebase_protesis_transicional?.inferior && 
                renderItem(pacienteId, 'Rebase Prótesis Transicional', 'Inferior', 'Rebase prótesis transicional inferior', 'rebase-pt-inf')}
            </ul>
          </div>
        )}

        {/* FASE REEVALUATIVA */}
        {plan.fase_reevaluativa && (
          <div>
            <h5 className="font-semibold text-blue-800 mb-2">Fase Reevaluativa</h5>
            <ul className="space-y-1">
              {renderItem(pacienteId, 'Reevaluación', '', 'Reevaluación', 'reevaluacion')}
            </ul>
          </div>
        )}

        {/* FASE CORRECTIVA INICIAL */}
        {plan.fase_correctiva_inicial && (
          <div>
            <h5 className="font-semibold text-blue-800 mb-2">Fase Correctiva Inicial</h5>
            <ul className="space-y-1">
              {plan.fase_correctiva_inicial.endodoncia?.map((d, idx) => {
                const diente = formatearDienteConSuperficie(d);
                const especificacion = typeof d === 'object' ? `Diente ${d.diente}` : `Diente ${d}`;
                return renderItem(pacienteId, 'Endodoncia', especificacion, `Endodoncia: ${diente}`, `endodoncia-${idx}`);
              })}
              
              {plan.fase_correctiva_inicial.postes?.map((d, idx) => {
                const diente = formatearDienteConSuperficie(d);
                const especificacion = typeof d === 'object' ? `Diente ${d.diente}` : `Diente ${d}`;
                return renderItem(pacienteId, 'Poste', especificacion, `Poste: ${diente}`, `poste-${idx}`);
              })}
              
              {plan.fase_correctiva_inicial.nucleos?.map((d, idx) => {
                const diente = formatearDienteConSuperficie(d);
                const especificacion = typeof d === 'object' ? `Diente ${d.diente}` : `Diente ${d}`;
                return renderItem(pacienteId, 'Núcleo', especificacion, `Núcleo: ${diente}`, `nucleo-${idx}`);
              })}
              
              {plan.fase_correctiva_inicial.reconstruccion_munon?.map((d, idx) => {
                const diente = formatearDienteConSuperficie(d);
                const especificacion = typeof d === 'object' ? `Diente ${d.diente}` : `Diente ${d}`;
                return renderItem(pacienteId, 'Reconstrucción Muñón', especificacion, `Reconstrucción muñón: ${diente}`, `munon-${idx}`);
              })}
              
              {/* Implantes Observación - NUEVO */}
              {plan.fase_correctiva_inicial.implantes_observacion?.map((d, idx) => {
                const diente = formatearDienteConSuperficie(d);
                const especificacion = typeof d === 'object' ? `Diente ${d.diente}` : `Diente ${d}`;
                return renderItem(pacienteId, 'Implante (Obs)', especificacion, `Implante (observación): ${diente}`, `implante-${idx}`);
              })}
              
              {/* Cirugía Oral - NUEVO */}
              {plan.fase_correctiva_inicial.cirugia_oral && 
                renderItem(pacienteId, 'Cirugía Oral', '', `Cirugía oral: ${plan.fase_correctiva_inicial.cirugia_oral}`, 'cirugia-oral')}
              
              {/* Ajuste Oclusal - NUEVO */}
              {plan.fase_correctiva_inicial.ajuste_oclusal?.completo && 
                renderItem(pacienteId, 'Ajuste Oclusal', 'Completo', 'Ajuste oclusal completo', 'ajuste-completo')}
              {plan.fase_correctiva_inicial.ajuste_oclusal?.cuadrantes?.map((c, idx) => 
                renderItem(pacienteId, 'Ajuste Oclusal', `Cuadrante ${c}`, `Ajuste oclusal cuadrante ${c}`, `ajuste-q${idx}`)
              )}
            </ul>
          </div>
        )}

        {/* FASE CORRECTIVA FINAL */}
        {plan.fase_correctiva_final && (
          <div>
            <h5 className="font-semibold text-blue-800 mb-2">Fase Correctiva Final</h5>
            <ul className="space-y-1">
              {plan.fase_correctiva_final.coronas?.map((c, idx) => {
                const texto = formatearCorona(c);
                const especificacion = typeof c === 'object' ? `Diente ${c.diente}` : `Diente ${c}`;
                return renderItem(pacienteId, 'Corona', especificacion, `Corona: ${texto}`, `corona-${idx}`);
              })}
              
              {/* Incrustaciones - CORREGIDO para usar tipo_pieza y material */}
              {plan.fase_correctiva_final.incrustaciones?.map((i, idx) => {
                const texto = formatearIncrustacion(i);
                const especificacion = typeof i === 'object' ? `Diente ${i.diente}` : `Diente ${i}`;
                return renderItem(pacienteId, 'Incrustación', especificacion, `Incrustación: ${texto}`, `incrustacion-${idx}`);
              })}
              
              {/* Prótesis Removible - CORREGIDO: ahora es objeto {superior, inferior} */}
              {plan.fase_correctiva_final.protesis_removible?.superior && 
                renderItem(pacienteId, 'Prótesis Removible', 'Superior', 'Prótesis removible superior', 'ppr-superior')}
              {plan.fase_correctiva_final.protesis_removible?.inferior && 
                renderItem(pacienteId, 'Prótesis Removible', 'Inferior', 'Prótesis removible inferior', 'ppr-inferior')}
              
              {/* Prótesis Total - CORREGIDO: ahora es objeto {superior, inferior} */}
              {plan.fase_correctiva_final.protesis_total?.superior && 
                renderItem(pacienteId, 'Prótesis Total', 'Superior', 'Prótesis total superior', 'pt-superior')}
              {plan.fase_correctiva_final.protesis_total?.inferior && 
                renderItem(pacienteId, 'Prótesis Total', 'Inferior', 'Prótesis total inferior', 'pt-inferior')}
              
              {/* Prótesis Fija - NUEVO */}
              {plan.fase_correctiva_final.protesis_fija?.map((p, idx) => {
                const texto = formatearProtesisFija(p);
                const especificacion = typeof p === 'object' ? `Tramo ${p.tramo}` : p;
                return renderItem(pacienteId, 'Prótesis Fija', especificacion, `Prótesis fija: ${texto}`, `ppf-${idx}`);
              })}
              
              {/* Carillas - NUEVO */}
              {plan.fase_correctiva_final.carillas?.map((d, idx) => {
                const diente = formatearDienteConSuperficie(d);
                const especificacion = typeof d === 'object' ? `Diente ${d.diente}` : `Diente ${d}`;
                return renderItem(pacienteId, 'Carilla', especificacion, `Carilla: ${diente}`, `carilla-${idx}`);
              })}
            </ul>
          </div>
        )}

        {/* FASE DE MANTENIMIENTO */}
        {plan.fase_mantenimiento && (
          <div>
            <h5 className="font-semibold text-blue-800 mb-2">Fase de Mantenimiento</h5>
            <ul className="space-y-1">
              {renderItem(pacienteId, 'Mantenimiento', '', 'Mantenimiento', 'mantenimiento')}
            </ul>
          </div>
        )}
      </div>
    );
  };

  if (cargando) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-2" />
          <p className="text-gray-600">Cargando pacientes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Users className="text-blue-600" size={28} />
          <h1 className="text-2xl font-bold text-gray-800">Mis Pacientes</h1>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle size={20} />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto">
              <X size={16} />
            </button>
          </div>
        )}

        {mensajeExito && !modalEditar && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
            <CheckCircle size={20} />
            <span>{mensajeExito}</span>
            <button onClick={() => setMensajeExito(null)} className="ml-auto">
              <X size={16} />
            </button>
          </div>
        )}

        {pacientes.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-600">No tienes pacientes asignados aún.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pacientes.map((paciente) => {
              const esPacienteExpandido = pacienteExpandido === paciente.id;
              const planes = paciente.planes_tratamiento || [];
              const tienePlanes = planes.length > 0;
              
              return (
                <div key={paciente.id} className="bg-white rounded-lg shadow overflow-hidden">
                  <div
                    onClick={() => togglePaciente(paciente.id)}
                    className="p-4 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
                  >
                    <div>
                      <h3 className="font-semibold text-gray-800">
                        {paciente.primer_nombre} {paciente.segundo_nombre || ''} {paciente.primer_apellido} {paciente.segundo_apellido || ''}
                      </h3>
                      <p className="text-sm text-gray-500">CC: {paciente.cedula}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {!tienePlanes && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setModalNuevoPlan(paciente); }}
                          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition"
                        >
                          Cargar Plan
                        </button>
                      )}
                      {tienePlanes && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                          {planes.length} plan{planes.length > 1 ? 'es' : ''}
                        </span>
                      )}
                      {esPacienteExpandido ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>

                  {esPacienteExpandido && (
                    <div className="border-t px-4 py-3 bg-gray-50">
                      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                        <div>
                          <span className="text-gray-500">Teléfono:</span>
                          <span className="ml-2 font-medium">{paciente.celular || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Registrado:</span>
                          <span className="ml-2 font-medium">{formatearFecha(paciente.created_at)}</span>
                        </div>
                      </div>

                      {!tienePlanes ? (
                        <p className="text-gray-500 text-sm italic">Este paciente aún no tiene plan de tratamiento.</p>
                      ) : (
                        <div className="space-y-3">
                          <h4 className="font-medium text-gray-700">Planes de Tratamiento:</h4>
                          {planes.map((plan) => {
                            const esPlanExpandido = planExpandido === plan.id;
                            const planFormateado = formatearPlan(plan.plan_completo);
                            const esActivo = plan.estado === 'aprobado' && !plan.fecha_finalizacion;

                            return (
                              <div key={plan.id} className="border rounded-lg overflow-hidden">
                                <div
                                  onClick={() => togglePlan(plan.id)}
                                  className={`p-3 cursor-pointer flex items-center justify-between ${esPlanExpandido ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'}`}
                                >
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className={`text-xs px-2 py-0.5 rounded ${
                                        plan.estado === 'aprobado' ? 'bg-green-100 text-green-700' :
                                        plan.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-700' :
                                        'bg-red-100 text-red-700'
                                      }`}>
                                        {plan.estado}
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
                                    {renderPlan(planFormateado, paciente.id)}
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
