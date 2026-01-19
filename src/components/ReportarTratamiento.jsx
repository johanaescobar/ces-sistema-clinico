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
  const [planActivoId, setPlanActivoId] = useState(null);
  const [tipoPlanActivo, setTipoPlanActivo] = useState('tratamiento');
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
      // Filtrar pacientes con plan aprobado (cualquier tipo)
      const pacientesConPlan = data.filter(p => {
        const planes = p.planes_tratamiento || [];
        return planes.some(plan => plan.estado === 'aprobado' && !plan.fecha_cierre);
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
      // Obtener plan activo (priorizar planes especiales primero, luego tratamiento)
      const planes = paciente.planes_tratamiento || [];
      
      // Buscar plan especial activo primero
      let planActivo = planes.find(p => 
        p.estado === 'aprobado' && 
        !p.fecha_cierre && 
        (p.tipo_plan === 'historia_clinica' || p.tipo_plan === 'reevaluacion_inicial')
      );
      
      // Si no hay especial, buscar plan de tratamiento
      if (!planActivo) {
        planActivo = planes.find(p => 
          p.estado === 'aprobado' && 
          !p.fecha_cierre && 
          p.tipo_plan === 'tratamiento'
        );
      }
      
      if (!planActivo) {
        setError('Este paciente no tiene un plan activo');
        setCargando(false);
        return;
      }

      setPlanActivoId(planActivo.id);
      setTipoPlanActivo(planActivo.tipo_plan || 'tratamiento');

      let tratamientos = [];

      // Si es plan especial, crear tratamiento virtual
      if (planActivo.tipo_plan === 'historia_clinica' || planActivo.tipo_plan === 'reevaluacion_inicial') {
        const nombreTratamiento = planActivo.tipo_plan === 'historia_clinica' 
          ? 'Historia Clínica' 
          : 'Reevaluación Inicial';
        
        tratamientos = [{
          id: 0,
          tipo: nombreTratamiento,
          especificacion: '',
          fase: 'Fase Inicial'
        }];
      } else {
        // Plan normal - extraer tratamientos del JSON
        const planData = typeof planActivo.plan_completo === 'string' 
          ? JSON.parse(planActivo.plan_completo) 
          : planActivo.plan_completo;
        
        tratamientos = extraerTratamientos(planData);
      }

      setPlanTratamiento(tratamientos);

      // Cargar reportes existentes aprobados para este plan
      const resReportes = await fetch(
        `${SUPABASE_CONFIG.URL}/rest/v1/reporte_items?select=*,reportes_tratamiento!inner(paciente_id,plan_id)&reportes_tratamiento.plan_id=eq.${planActivo.id}&estado_aprobacion=eq.aprobado`,
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
      const fhp = plan.fase_higienica_periodontal;
      
      if (fhp.profilaxis === true) {
        tratamientos.push({ id: id++, tipo: 'Profilaxis', especificacion: '', fase: 'Fase Higiénica Periodontal' });
      }
      
      if (fhp.detartraje?.generalizado === true) {
        tratamientos.push({ id: id++, tipo: 'Detartraje', especificacion: 'Generalizado', fase: 'Fase Higiénica Periodontal' });
      }
      if (fhp.detartraje?.dientes?.length > 0) {
        fhp.detartraje.dientes.forEach(d => {
          tratamientos.push({ id: id++, tipo: 'Detartraje', especificacion: `Diente ${d}`, fase: 'Fase Higiénica Periodontal' });
        });
      }
      
      // Aplicación flúor - array directo de números
      if (fhp.aplicacion_fluor?.length > 0) {
        fhp.aplicacion_fluor.forEach(d => {
          tratamientos.push({ id: id++, tipo: 'Aplicación Flúor', especificacion: `Diente ${d}`, fase: 'Fase Higiénica Periodontal' });
        });
      }
      
      // Pulido - array de objetos {diente, superficies}
      if (fhp.pulido?.length > 0) {
        fhp.pulido.forEach(p => {
          const diente = typeof p === 'object' ? p.diente : p;
          const sup = typeof p === 'object' && p.superficies ? ` (${p.superficies})` : '';
          tratamientos.push({ id: id++, tipo: 'Pulido', especificacion: `Diente ${diente}${sup}`, fase: 'Fase Higiénica Periodontal' });
        });
      }
      
      // Raspaje y alisado radicular - array directo de números
      if (fhp.raspaje_alisado_radicular?.length > 0) {
        fhp.raspaje_alisado_radicular.forEach(d => {
          tratamientos.push({ id: id++, tipo: 'Raspaje y Alisado', especificacion: `Diente ${d}`, fase: 'Fase Higiénica Periodontal' });
        });
      }
    }

    // Fase higiénica dental
    if (plan.fase_higienica_dental) {
      const fhd = plan.fase_higienica_dental;
      
      // Operatoria - array de objetos {diente, superficies}
      if (fhd.operatoria?.length > 0) {
        fhd.operatoria.forEach(o => {
          const diente = typeof o === 'object' ? o.diente : o;
          const sup = typeof o === 'object' && o.superficies ? ` (${o.superficies})` : '';
          tratamientos.push({ id: id++, tipo: 'Operatoria', especificacion: `Diente ${diente}${sup}`, fase: 'Fase Higiénica Dental' });
        });
      }
      
      // Exodoncias - array directo de números
      if (fhd.exodoncias?.length > 0) {
        fhd.exodoncias.forEach(d => {
          tratamientos.push({ id: id++, tipo: 'Exodoncia', especificacion: `Diente ${d}`, fase: 'Fase Higiénica Dental' });
        });
      }
      
      // Retiro coronas - array directo de números
      if (fhd.retiro_coronas?.length > 0) {
        fhd.retiro_coronas.forEach(d => {
          tratamientos.push({ id: id++, tipo: 'Retiro Corona', especificacion: `Diente ${d}`, fase: 'Fase Higiénica Dental' });
        });
      }
      
      // Provisionales - array directo de números
      if (fhd.provisionales?.length > 0) {
        fhd.provisionales.forEach(d => {
          tratamientos.push({ id: id++, tipo: 'Provisional', especificacion: `Diente ${d}`, fase: 'Fase Higiénica Dental' });
        });
      }
      
      // Rebase provisionales - array directo de números
      if (fhd.rebase_provisionales?.length > 0) {
        fhd.rebase_provisionales.forEach(d => {
          tratamientos.push({ id: id++, tipo: 'Rebase Provisional', especificacion: `Diente ${d}`, fase: 'Fase Higiénica Dental' });
        });
      }
      
      // Prótesis transicional - objeto {superior, inferior, dientes_reemplazar}
      if (fhd.protesis_transicional?.superior === true) {
        tratamientos.push({ id: id++, tipo: 'Prótesis Transicional', especificacion: 'Superior', fase: 'Fase Higiénica Dental' });
      }
      if (fhd.protesis_transicional?.inferior === true) {
        tratamientos.push({ id: id++, tipo: 'Prótesis Transicional', especificacion: 'Inferior', fase: 'Fase Higiénica Dental' });
      }
      
      // Rebase prótesis transicional - objeto {superior, inferior}
      if (fhd.rebase_protesis_transicional?.superior === true) {
        tratamientos.push({ id: id++, tipo: 'Rebase Prótesis Transicional', especificacion: 'Superior', fase: 'Fase Higiénica Dental' });
      }
      if (fhd.rebase_protesis_transicional?.inferior === true) {
        tratamientos.push({ id: id++, tipo: 'Rebase Prótesis Transicional', especificacion: 'Inferior', fase: 'Fase Higiénica Dental' });
      }
    }

    // Fase reevaluativa
    if (plan.fase_reevaluativa === true) {
      tratamientos.push({ id: id++, tipo: 'Reevaluación', especificacion: '', fase: 'Fase Reevaluativa' });
    }

    // Fase correctiva inicial
    if (plan.fase_correctiva_inicial) {
      const fci = plan.fase_correctiva_inicial;
      
      // Endodoncia - array directo de números
      if (fci.endodoncia?.length > 0) {
        fci.endodoncia.forEach(d => {
          tratamientos.push({ id: id++, tipo: 'Endodoncia', especificacion: `Diente ${d}`, fase: 'Fase Correctiva Inicial' });
        });
      }
      
      // Postes - array directo de números
      if (fci.postes?.length > 0) {
        fci.postes.forEach(d => {
          tratamientos.push({ id: id++, tipo: 'Poste', especificacion: `Diente ${d}`, fase: 'Fase Correctiva Inicial' });
        });
      }
      
      // Núcleos - array directo de números
      if (fci.nucleos?.length > 0) {
        fci.nucleos.forEach(d => {
          tratamientos.push({ id: id++, tipo: 'Núcleo', especificacion: `Diente ${d}`, fase: 'Fase Correctiva Inicial' });
        });
      }
      
      // Reconstrucción muñón - array directo de números
      if (fci.reconstruccion_munon?.length > 0) {
        fci.reconstruccion_munon.forEach(d => {
          tratamientos.push({ id: id++, tipo: 'Reconstrucción Muñón', especificacion: `Diente ${d}`, fase: 'Fase Correctiva Inicial' });
        });
      }
      
      // Implantes - array directo de números
      if (fci.implantes_observacion?.length > 0) {
        fci.implantes_observacion.forEach(d => {
          tratamientos.push({ id: id++, tipo: 'Implante', especificacion: `Diente ${d}`, fase: 'Fase Correctiva Inicial' });
        });
      }
      
      // Cirugía oral
      if (fci.cirugia_oral) {
        tratamientos.push({ id: id++, tipo: 'Cirugía Oral', especificacion: fci.cirugia_oral, fase: 'Fase Correctiva Inicial' });
      }
      
      // Ajuste oclusal
      if (fci.ajuste_oclusal?.completo === true) {
        tratamientos.push({ id: id++, tipo: 'Ajuste Oclusal', especificacion: 'Completo', fase: 'Fase Correctiva Inicial' });
      }
      if (fci.ajuste_oclusal?.cuadrantes?.length > 0) {
        fci.ajuste_oclusal.cuadrantes.forEach(c => {
          tratamientos.push({ id: id++, tipo: 'Ajuste Oclusal', especificacion: `Cuadrante ${c}`, fase: 'Fase Correctiva Inicial' });
        });
      }
    }

    // Fase correctiva final
    if (plan.fase_correctiva_final) {
      const fcf = plan.fase_correctiva_final;
      
      // Coronas - array de objetos {diente, tipo}
      if (fcf.coronas?.length > 0) {
        fcf.coronas.forEach(c => {
          const diente = typeof c === 'object' ? c.diente : c;
          const tipo = typeof c === 'object' && c.tipo ? ` (${c.tipo})` : '';
          tratamientos.push({ id: id++, tipo: 'Corona', especificacion: `Diente ${diente}${tipo}`, fase: 'Fase Correctiva Final' });
        });
      }
      
      // Incrustaciones - array de objetos {diente, tipo_pieza, material}
      if (fcf.incrustaciones?.length > 0) {
        fcf.incrustaciones.forEach(i => {
          const diente = typeof i === 'object' ? i.diente : i;
          const detalles = [];
          if (typeof i === 'object') {
            if (i.tipo_pieza) detalles.push(i.tipo_pieza);
            if (i.material) detalles.push(i.material);
          }
          const detalle = detalles.length > 0 ? ` (${detalles.join(', ')})` : '';
          tratamientos.push({ id: id++, tipo: 'Incrustación', especificacion: `Diente ${diente}${detalle}`, fase: 'Fase Correctiva Final' });
        });
      }
      
      // Prótesis Removible - objeto {superior, inferior}
      if (fcf.protesis_removible?.superior === true) {
        tratamientos.push({ id: id++, tipo: 'Prótesis Removible', especificacion: 'Superior', fase: 'Fase Correctiva Final' });
      }
      if (fcf.protesis_removible?.inferior === true) {
        tratamientos.push({ id: id++, tipo: 'Prótesis Removible', especificacion: 'Inferior', fase: 'Fase Correctiva Final' });
      }
      
      // Prótesis Total - objeto {superior, inferior}
      if (fcf.protesis_total?.superior === true) {
        tratamientos.push({ id: id++, tipo: 'Prótesis Total', especificacion: 'Superior', fase: 'Fase Correctiva Final' });
      }
      if (fcf.protesis_total?.inferior === true) {
        tratamientos.push({ id: id++, tipo: 'Prótesis Total', especificacion: 'Inferior', fase: 'Fase Correctiva Final' });
      }
      
      // Prótesis Fija - array de objetos
      if (fcf.protesis_fija?.length > 0) {
        fcf.protesis_fija.forEach(p => {
          const tramo = typeof p === 'object' ? p.tramo : p;
          const tipo = typeof p === 'object' && p.tipo ? ` (${p.tipo})` : '';
          tratamientos.push({ id: id++, tipo: 'Prótesis Fija', especificacion: `Tramo ${tramo}${tipo}`, fase: 'Fase Correctiva Final' });
        });
      }
      
      // Carillas - array de objetos o números
      if (fcf.carillas?.length > 0) {
        fcf.carillas.forEach(c => {
          const diente = typeof c === 'object' ? c.diente : c;
          tratamientos.push({ id: id++, tipo: 'Carilla', especificacion: `Diente ${diente}`, fase: 'Fase Correctiva Final' });
        });
      }
    }

    // Fase mantenimiento
    if (plan.fase_mantenimiento === true) {
      tratamientos.push({ id: id++, tipo: 'Mantenimiento', especificacion: '', fase: 'Fase de Mantenimiento' });
    }

    return tratamientos;
  };

  const estaAprobado = (tratamiento) => {
    // Solo está completamente aprobado si fue aprobado como "completo" (TT)
    return reportesExistentes.some(r => 
      r.tipo_tratamiento === tratamiento.tipo && 
      r.especificacion === tratamiento.especificacion &&
      r.estado_aprobacion === 'aprobado' &&
      r.estado_reportado === 'completo'
    );
  };

  const estaEnProceso = (tratamiento) => {
    // Está en proceso si fue aprobado como "en_proceso" (EP)
    return reportesExistentes.some(r => 
      r.tipo_tratamiento === tratamiento.tipo && 
      r.especificacion === tratamiento.especificacion &&
      r.estado_aprobacion === 'aprobado' &&
      r.estado_reportado === 'en_proceso'
    );
  };

  const estaPresentadaConCorrecciones = (tratamiento) => {
    return reportesExistentes.some(r => 
      r.tipo_tratamiento === tratamiento.tipo && 
      r.especificacion === tratamiento.especificacion &&
      r.estado_aprobacion === 'aprobado' &&
      r.estado_reportado === 'presentada_correcciones'
    );
  };

  const esPlanEspecial = tipoPlanActivo === 'historia_clinica' || tipoPlanActivo === 'reevaluacion_inicial';

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
            plan_id: planActivoId,
            fecha_reporte: new Date().toISOString(),
            reporte_texto: observacion || 'Reporte de tratamientos',
            estado: 'pendiente_aprobacion'
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
          especificacion: tratamiento.especificacion || '',
          descripcion: `${tratamiento.tipo} ${tratamiento.especificacion}`.trim(),
          estado_reportado: estado === 'TT' ? 'completo' : estado === 'PC' ? 'presentada_correcciones' : 'en_proceso',
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
    setPlanActivoId(null);
    setTipoPlanActivo('tratamiento');
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
                  <div className="flex flex-wrap gap-4 mb-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
                      <span className="text-gray-600">TT Aprobado (finalizado)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-amber-100 border border-amber-300 rounded"></div>
                      <span className="text-gray-600">EP Aprobado (puede continuar)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-blue-600">TT</span>
                      <span className="text-gray-600">= Terminado</span>
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
                            const enProceso = estaEnProceso(t);
                            const seleccion = selecciones[t.id];

                            return (
                              <div 
                                key={t.id} 
                                className={`flex items-center justify-between p-3 rounded-lg border ${
                                  aprobado 
                                    ? 'bg-green-50 border-green-200' 
                                    : enProceso
                                      ? 'bg-amber-50 border-amber-200'
                                      : 'bg-white border-gray-200 hover:bg-gray-50'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  {aprobado && <CheckCircle size={18} className="text-green-600" />}
                                  <span className={aprobado ? 'text-green-700' : enProceso ? 'text-amber-700' : 'text-gray-800'}>
                                    {t.tipo}
                                    {t.especificacion && <span className="text-gray-500 ml-1">- {t.especificacion}</span>}
                                  </span>
                                </div>

                                {aprobado ? (
                                  <span className="text-xs bg-green-600 text-white px-2 py-1 rounded">
                                    ✓ TT Aprobado
                                  </span>
                                ) : enProceso ? (
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs bg-amber-500 text-white px-2 py-1 rounded">
                                      EP Aprobado
                                    </span>
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
                                    {esPlanEspecial && (
                                      <button
                                        onClick={() => handleSeleccion(t.id, 'PC')}
                                        className={`px-3 py-1 rounded text-sm font-medium transition ${
                                          seleccion === 'PC'
                                            ? 'bg-orange-600 text-white'
                                            : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                                        }`}
                                      >
                                        PC
                                      </button>
                                    )}
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
