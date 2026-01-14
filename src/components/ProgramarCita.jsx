// src/components/ProgramarCita.jsx
import React, { useState, useEffect } from 'react';
import { Calendar, ChevronRight, ChevronLeft, Loader2, CheckCircle, AlertCircle, Clock, User, FileText } from 'lucide-react';
import { SUPABASE_CONFIG } from '../config/api';

const ProgramarCita = () => {
  // Estados del wizard
  const [paso, setPaso] = useState(0); // 0 = verificando acceso
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [accesoPermitido, setAccesoPermitido] = useState(false);
  const [motivoBloqueo, setMotivoBloqueo] = useState('');

  // Datos
  const [pacientes, setPacientes] = useState([]);
  const [horariosConfig, setHorariosConfig] = useState([]);
  const [festivos, setFestivos] = useState([]);
  
  // Selecciones
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState(null);
  const [tratamientosPlan, setTratamientosPlan] = useState([]);
  const [tratamientoSeleccionado, setTratamientoSeleccionado] = useState('');
  const [diaClinica, setDiaClinica] = useState('');
  const [fechaSeleccionada, setFechaSeleccionada] = useState('');
  const [horaSeleccionada, setHoraSeleccionada] = useState('');
  const [observacion, setObservacion] = useState('');
  
  // Resultado
  const [citaCreada, setCitaCreada] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const esDocente = usuario.rol === 'docente';

  // Lista genérica de tratamientos
  const tratamientosGenericos = [
    'Historia Clínica',
    'Presentación de HC',
    'PyP',
    'Profilaxis',
    'Detartraje',
    'Pulido coronal',
    'Raspaje y alisado radicular',
    'Operatoria',
    'Exodoncia',
    'Endodoncia',
    'Poste',
    'Núcleo',
    'Reconstrucción muñón',
    'Corona',
    'Incrustación',
    'Prótesis removible',
    'Prótesis total',
    'Placa MNR',
    'Mantenimiento',
    'Reevaluación',
    'Otro'
  ];

  useEffect(() => {
    verificarAccesoYCargarDatos();
  }, []);

  const verificarAccesoYCargarDatos = async () => {
    try {
      setCargando(true);
      setError('');

      // 1. Cargar configuración de horarios
      const resHorarios = await fetch(
        `${SUPABASE_CONFIG.URL}/rest/v1/config_horarios?activo=eq.true`,
        {
          headers: {
            'apikey': SUPABASE_CONFIG.ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_CONFIG.ANON_KEY}`
          }
        }
      );
      const horarios = await resHorarios.json();
      setHorariosConfig(horarios);

      // 2. Verificar acceso (docentes siempre, estudiantes según horario)
      if (esDocente) {
        setAccesoPermitido(true);
      } else {
        const ahora = new Date();
        const opcionesColombia = { timeZone: 'America/Bogota' };
        const diaSemana = ahora.toLocaleDateString('es-CO', { ...opcionesColombia, weekday: 'long' }).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const horaActual = ahora.toLocaleTimeString('es-CO', { ...opcionesColombia, hour: '2-digit', minute: '2-digit', hour12: false });

        // Buscar si hay horario activo para hoy
        const horarioHoy = horarios.find(h => h.dia_semana === diaSemana);
        
        if (horarioHoy && horaActual >= horarioHoy.hora_inicio.slice(0, 5) && horaActual <= horarioHoy.hora_fin.slice(0, 5)) {
          setAccesoPermitido(true);
        } else {
          // Verificar permiso excepcional
          const resPermiso = await fetch(
            `${SUPABASE_CONFIG.URL}/rest/v1/permisos_excepcionales?estudiante_id=eq.${usuario.id}&fecha_fin=gte.${ahora.toISOString()}&select=*`,
            {
              headers: {
                'apikey': SUPABASE_CONFIG.ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_CONFIG.ANON_KEY}`
              }
            }
          );
          const permisos = await resPermiso.json();
          
          if (permisos && permisos.length > 0) {
            const permisoActivo = permisos.find(p => 
              new Date(p.fecha_inicio) <= ahora && new Date(p.fecha_fin) >= ahora
            );
            if (permisoActivo) {
              setAccesoPermitido(true);
            } else {
              setAccesoPermitido(false);
              setMotivoBloqueo(getMotivoBloqueio(horarios));
            }
          } else {
            setAccesoPermitido(false);
            setMotivoBloqueo(getMotivoBloqueio(horarios));
          }
        }
      }

      // 3. Cargar festivos
      const anioActual = new Date().getFullYear();
      const resFestivos = await fetch(
        `${SUPABASE_CONFIG.URL}/rest/v1/festivos_colombia?anio=in.(${anioActual},${anioActual + 1})`,
        {
          headers: {
            'apikey': SUPABASE_CONFIG.ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_CONFIG.ANON_KEY}`
          }
        }
      );
      const festivosData = await resFestivos.json();
      setFestivos(festivosData.map(f => f.fecha));

      // 4. Cargar pacientes del estudiante (o todos si es docente)
      let urlPacientes = `${SUPABASE_CONFIG.URL}/rest/v1/pacientes?select=*,planes_tratamiento(*)`;
      if (!esDocente) {
        urlPacientes += `&estudiante_actual_id=eq.${usuario.id}`;
      }
      
      const resPacientes = await fetch(urlPacientes, {
        headers: {
          'apikey': SUPABASE_CONFIG.ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_CONFIG.ANON_KEY}`
        }
      });
      const pacientesData = await resPacientes.json();
      setPacientes(pacientesData);

      setPaso(1);
    } catch (err) {
      setError('Error al cargar datos: ' + err.message);
    } finally {
      setCargando(false);
    }
  };

  const getMotivoBloqueio = (horarios) => {
    const horariosTexto = horarios.map(h => {
      const dia = h.dia_semana.charAt(0).toUpperCase() + h.dia_semana.slice(1);
      return `${dia}: ${h.hora_inicio.slice(0, 5)} - ${h.hora_fin.slice(0, 5)}`;
    }).join(' | ');
    return `Solo puedes agendar citas durante horarios de clínica: ${horariosTexto}`;
  };

  const seleccionarPaciente = (paciente) => {
    setPacienteSeleccionado(paciente);
    
    // Extraer tratamientos pendientes del plan activo
    const planActivo = paciente.planes_tratamiento?.find(p => !p.fecha_finalizacion);
    if (planActivo?.plan_completo) {
      const plan = typeof planActivo.plan_completo === 'string' 
        ? JSON.parse(planActivo.plan_completo) 
        : planActivo.plan_completo;
      
      const pendientes = extraerTratamientosPendientes(plan);
      setTratamientosPlan(pendientes);
    } else {
      setTratamientosPlan([]);
    }
    
    setPaso(2);
  };

  const extraerTratamientosPendientes = (plan) => {
    const pendientes = [];
    
    // Fase higiénica periodontal
    if (plan.fase_higienica_periodontal) {
      if (plan.fase_higienica_periodontal.profilaxis) pendientes.push('Profilaxis');
      if (plan.fase_higienica_periodontal.detartraje?.generalizado) pendientes.push('Detartraje');
      if (plan.fase_higienica_periodontal.pulido_coronal?.dientes?.length > 0) {
        pendientes.push(`Pulido coronal: ${plan.fase_higienica_periodontal.pulido_coronal.dientes.join(', ')}`);
      }
      if (plan.fase_higienica_periodontal.raspaje_alisado_radicular?.dientes?.length > 0) {
        pendientes.push(`Raspaje y alisado: ${plan.fase_higienica_periodontal.raspaje_alisado_radicular.dientes.join(', ')}`);
      }
    }

    // Fase higiénica dental
    if (plan.fase_higienica_dental) {
      if (plan.fase_higienica_dental.operatoria?.dientes?.length > 0) {
        plan.fase_higienica_dental.operatoria.dientes.forEach(d => {
          pendientes.push(`Operatoria: ${d}`);
        });
      }
      if (plan.fase_higienica_dental.exodoncias?.length > 0) {
        plan.fase_higienica_dental.exodoncias.forEach(d => {
          pendientes.push(`Exodoncia: ${d}`);
        });
      }
    }

    // Fase correctiva inicial
    if (plan.fase_correctiva_inicial) {
      if (plan.fase_correctiva_inicial.endodoncia?.length > 0) {
        plan.fase_correctiva_inicial.endodoncia.forEach(d => {
          pendientes.push(`Endodoncia: ${d}`);
        });
      }
      if (plan.fase_correctiva_inicial.postes?.length > 0) {
        plan.fase_correctiva_inicial.postes.forEach(d => {
          pendientes.push(`Poste: ${d}`);
        });
      }
      if (plan.fase_correctiva_inicial.nucleos?.length > 0) {
        plan.fase_correctiva_inicial.nucleos.forEach(d => {
          pendientes.push(`Núcleo: ${d}`);
        });
      }
    }

    // Fase correctiva final
    if (plan.fase_correctiva_final) {
      if (plan.fase_correctiva_final.coronas?.length > 0) {
        plan.fase_correctiva_final.coronas.forEach(d => {
          pendientes.push(`Corona: ${d}`);
        });
      }
      if (plan.fase_correctiva_final.incrustaciones?.length > 0) {
        plan.fase_correctiva_final.incrustaciones.forEach(i => {
          const texto = typeof i === 'object' ? `${i.diente} (${i.tipo})` : i;
          pendientes.push(`Incrustación: ${texto}`);
        });
      }
      if (plan.fase_correctiva_final.protesis_removible) pendientes.push('Prótesis removible');
      if (plan.fase_correctiva_final.protesis_total) pendientes.push('Prótesis total');
    }

    // Fases especiales
    if (plan.fase_reevaluativa) pendientes.push('Reevaluación');
    if (plan.fase_mantenimiento) pendientes.push('Mantenimiento');

    return pendientes;
  };

  const seleccionarTratamiento = (tratamiento) => {
    setTratamientoSeleccionado(tratamiento);
    setPaso(3);
  };

  const seleccionarDia = (dia) => {
    setDiaClinica(dia);
    setFechaSeleccionada('');
    setHoraSeleccionada('');
    setPaso(4);
  };

  const validarFecha = (fechaStr) => {
    setError('');
    const fecha = new Date(fechaStr + 'T12:00:00');
    const diaSemana = fecha.getDay(); // 0=dom, 3=mié, 5=vie

    // Validar día correcto
    if (diaClinica === 'miercoles' && diaSemana !== 3) {
      setError('La fecha seleccionada no es miércoles');
      return false;
    }
    if (diaClinica === 'viernes' && diaSemana !== 5) {
      setError('La fecha seleccionada no es viernes');
      return false;
    }

    // Validar no festivo
    if (festivos.includes(fechaStr)) {
      setError('La fecha seleccionada es festivo');
      return false;
    }

    // Validar no sea pasado
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    if (fecha < hoy) {
      setError('No puedes agendar en fechas pasadas');
      return false;
    }

    setFechaSeleccionada(fechaStr);
    setPaso(5);
    return true;
  };

  const getHorasDisponibles = () => {
    const config = horariosConfig.find(h => h.dia_semana === diaClinica);
    if (!config) return [];

    const horas = [];
    const [inicioH, inicioM] = config.hora_inicio.split(':').map(Number);
    const [finH, finM] = config.hora_fin.split(':').map(Number);
    
    let hora = inicioH;
    let minuto = inicioM;

    while (hora < finH || (hora === finH && minuto <= finM)) {
      const horaStr = `${hora.toString().padStart(2, '0')}:${minuto.toString().padStart(2, '0')}`;
      horas.push(horaStr);
      
      minuto += 30;
      if (minuto >= 60) {
        minuto = 0;
        hora++;
      }
    }

    return horas;
  };

  const seleccionarHora = (hora) => {
    setHoraSeleccionada(hora);
    setPaso(6);
  };

  const confirmarCita = async () => {
    if (!observacion.trim()) {
      setError('La observación es obligatoria');
      return;
    }

    setEnviando(true);
    setError('');

    try {
      const response = await fetch(
        `${SUPABASE_CONFIG.URL}/rest/v1/citas`,
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
            fecha_cita: fechaSeleccionada,
            dia_clinica: diaClinica,
            hora: horaSeleccionada,
            tratamiento_programado: tratamientoSeleccionado,
            observacion: observacion.trim(),
            estado: 'programada'
          })
        }
      );

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Error al crear cita');
      }

      const cita = await response.json();
      setCitaCreada(cita[0] || cita);
      setPaso(7);
    } catch (err) {
      setError('Error al crear la cita: ' + err.message);
    } finally {
      setEnviando(false);
    }
  };

  const reiniciar = () => {
    setPacienteSeleccionado(null);
    setTratamientosPlan([]);
    setTratamientoSeleccionado('');
    setDiaClinica('');
    setFechaSeleccionada('');
    setHoraSeleccionada('');
    setObservacion('');
    setCitaCreada(null);
    setError('');
    setPaso(1);
  };

  const formatearFecha = (fechaStr) => {
    const fecha = new Date(fechaStr + 'T12:00:00');
    return fecha.toLocaleDateString('es-CO', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long',
      year: 'numeric'
    });
  };

  // PANTALLA DE CARGA INICIAL
  if (cargando) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <Loader2 className="animate-spin mx-auto text-green-600 mb-4" size={48} />
          <p className="text-gray-600">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  // PANTALLA DE ACCESO DENEGADO
  if (!accesoPermitido) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="bg-red-600 text-white px-6 py-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <AlertCircle size={24} />
              Acceso Restringido
            </h2>
          </div>
          <div className="p-6">
            <p className="text-gray-700 mb-4">{motivoBloqueo}</p>
            <p className="text-sm text-gray-500">
              Si necesitas acceso fuera de horario, solicita autorización a la Dra. Escobar.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-green-600 text-white px-6 py-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Calendar size={24} />
            Programar Cita
          </h2>
          <p className="text-green-100 text-sm mt-1">
            {paso < 7 ? `Paso ${paso} de 6` : '¡Cita programada!'}
          </p>
        </div>

        {/* Progress bar */}
        {paso < 7 && (
          <div className="px-6 py-2 bg-green-50">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5, 6].map(p => (
                <div 
                  key={p} 
                  className={`h-2 flex-1 rounded ${p <= paso ? 'bg-green-500' : 'bg-gray-200'}`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {/* Contenido según paso */}
        <div className="p-6">
          {/* PASO 1: Seleccionar paciente */}
          {paso === 1 && (
            <div>
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <User size={20} />
                Selecciona el paciente
              </h3>
              
              {pacientes.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No tienes pacientes asignados aún.
                </p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {pacientes.map(p => (
                    <button
                      key={p.id}
                      onClick={() => seleccionarPaciente(p)}
                      className="w-full text-left p-4 border rounded-lg hover:bg-green-50 hover:border-green-300 transition"
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

          {/* PASO 2: Seleccionar tratamiento */}
          {paso === 2 && (
            <div>
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <FileText size={20} />
                Selecciona el tratamiento
              </h3>

              {tratamientosPlan.length > 0 && (
                <div className="mb-6">
                  <p className="text-sm text-green-700 font-medium mb-2">🟢 Pendientes del plan aprobado:</p>
                  <div className="space-y-2">
                    {tratamientosPlan.map((t, i) => (
                      <button
                        key={i}
                        onClick={() => seleccionarTratamiento(t)}
                        className="w-full text-left p-3 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition"
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-sm text-gray-500 font-medium mb-2">⚪ Otros tratamientos:</p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {tratamientosGenericos
                    .filter(t => !tratamientosPlan.some(tp => tp.startsWith(t)))
                    .map((t, i) => (
                      <button
                        key={i}
                        onClick={() => seleccionarTratamiento(t)}
                        className="w-full text-left p-3 border rounded-lg hover:bg-gray-50 transition"
                      >
                        {t}
                      </button>
                    ))}
                </div>
              </div>

              <button
                onClick={() => setPaso(1)}
                className="mt-4 text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <ChevronLeft size={16} /> Volver
              </button>
            </div>
          )}

          {/* PASO 3: Seleccionar día de clínica */}
          {paso === 3 && (
            <div>
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Calendar size={20} />
                ¿Qué día de clínica?
              </h3>

              <div className="space-y-3">
                {horariosConfig.map(h => (
                  <button
                    key={h.id}
                    onClick={() => seleccionarDia(h.dia_semana)}
                    className="w-full text-left p-4 border rounded-lg hover:bg-green-50 hover:border-green-300 transition"
                  >
                    <div className="font-medium capitalize">{h.dia_semana}</div>
                    <div className="text-sm text-gray-500">
                      {h.hora_inicio.slice(0, 5)} - {h.hora_fin.slice(0, 5)}
                    </div>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setPaso(2)}
                className="mt-4 text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <ChevronLeft size={16} /> Volver
              </button>
            </div>
          )}

          {/* PASO 4: Seleccionar fecha */}
          {paso === 4 && (
            <div>
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Calendar size={20} />
                Selecciona la fecha ({diaClinica})
              </h3>

              <input
                type="date"
                onChange={(e) => validarFecha(e.target.value)}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                min={new Date().toISOString().split('T')[0]}
              />

              <p className="text-sm text-gray-500 mt-2">
                Solo se permiten fechas en {diaClinica} que no sean festivos.
              </p>

              <button
                onClick={() => setPaso(3)}
                className="mt-4 text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <ChevronLeft size={16} /> Volver
              </button>
            </div>
          )}

          {/* PASO 5: Seleccionar hora */}
          {paso === 5 && (
            <div>
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Clock size={20} />
                Selecciona la hora
              </h3>

              <p className="text-sm text-gray-600 mb-3">
                {formatearFecha(fechaSeleccionada)}
              </p>

              <div className="grid grid-cols-3 gap-2">
                {getHorasDisponibles().map(hora => (
                  <button
                    key={hora}
                    onClick={() => seleccionarHora(hora)}
                    className="p-3 border rounded-lg hover:bg-green-50 hover:border-green-300 transition text-center"
                  >
                    {hora}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setPaso(4)}
                className="mt-4 text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <ChevronLeft size={16} /> Volver
              </button>
            </div>
          )}

          {/* PASO 6: Observación y confirmación */}
          {paso === 6 && (
            <div>
              <h3 className="font-semibold text-gray-800 mb-4">Confirma los datos</h3>

              <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-2 text-sm">
                <p><strong>Paciente:</strong> {pacienteSeleccionado?.primer_nombre} {pacienteSeleccionado?.primer_apellido}</p>
                <p><strong>Cédula:</strong> {pacienteSeleccionado?.cedula}</p>
                <p><strong>Tratamiento:</strong> {tratamientoSeleccionado}</p>
                <p><strong>Fecha:</strong> {formatearFecha(fechaSeleccionada)}</p>
                <p><strong>Hora:</strong> {horaSeleccionada}</p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observación <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={observacion}
                  onChange={(e) => setObservacion(e.target.value)}
                  placeholder="Describe brevemente el objetivo de la cita..."
                  className="w-full border rounded-lg p-3 h-24 resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setPaso(5)}
                  className="flex-1 px-4 py-3 border rounded-lg hover:bg-gray-50 transition"
                >
                  Volver
                </button>
                <button
                  onClick={confirmarCita}
                  disabled={enviando || !observacion.trim()}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                >
                  {enviando ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={18} />
                      Confirmar Cita
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* PASO 7: Éxito */}
          {paso === 7 && (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="text-green-600" size={32} />
              </div>
              
              <h3 className="text-xl font-bold text-green-800 mb-2">¡Cita Programada!</h3>
              
              <div className="bg-green-50 rounded-lg p-4 mb-6 text-sm text-left">
                <p><strong>Paciente:</strong> {pacienteSeleccionado?.primer_nombre} {pacienteSeleccionado?.primer_apellido}</p>
                <p><strong>Tratamiento:</strong> {tratamientoSeleccionado}</p>
                <p><strong>Fecha:</strong> {formatearFecha(fechaSeleccionada)}</p>
                <p><strong>Hora:</strong> {horaSeleccionada}</p>
              </div>

              <button
                onClick={reiniciar}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                Programar otra cita
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProgramarCita;
