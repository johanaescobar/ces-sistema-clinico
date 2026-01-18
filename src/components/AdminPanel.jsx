// src/components/AdminPanel.jsx
import React, { useState, useEffect } from 'react';
import { 
  Users, Clock, Calendar, AlertTriangle, BarChart3, 
  Plus, Trash2, Edit2, Save, X, RefreshCw, Loader2,
  CheckCircle, XCircle, UserPlus, Settings, FileText,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { SUPABASE_CONFIG } from '../config/api';

// Tabs del panel
const TABS = [
  { id: 'estudiantes', label: 'Estudiantes', icon: Users },
  { id: 'pacientes', label: 'Pacientes', icon: UserPlus },
  { id: 'planes', label: 'Planes', icon: FileText },
  { id: 'citas', label: 'Citas', icon: Calendar },
  { id: 'horarios', label: 'Horarios', icon: Clock },
  { id: 'festivos', label: 'Festivos', icon: Calendar },
  { id: 'logs', label: 'Logs', icon: AlertTriangle },
  { id: 'config', label: 'Config', icon: Settings },
  { id: 'estadisticas', label: 'Estadísticas', icon: BarChart3 },
];

// Helper para llamadas a Supabase
const supabaseFetch = async (endpoint, options = {}) => {
  const response = await fetch(`${SUPABASE_CONFIG.URL}/rest/v1/${endpoint}`, {
    headers: {
      'apikey': SUPABASE_CONFIG.ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_CONFIG.ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': options.method === 'POST' ? 'return=representation' : undefined,
      ...options.headers
    },
    ...options
  });
  if (!response.ok) throw new Error('Error en la solicitud');
  const text = await response.text();
  return text ? JSON.parse(text) : null;
};

// =============================================
// COMPONENTE: GESTIÓN DE ESTUDIANTES
// =============================================
const GestionEstudiantes = () => {
  const [estudiantes, setEstudiantes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState(null);
  const [nuevo, setNuevo] = useState(false);
  const [form, setForm] = useState({ nombre_completo: '', correo: '', celular: '' });
  const [error, setError] = useState('');
  const [seleccionados, setSeleccionados] = useState([]);
  const [eliminando, setEliminando] = useState(false);

  const cargar = async () => {
    setCargando(true);
    try {
      const data = await supabaseFetch('usuarios?rol=eq.estudiante&order=nombre_completo');
      setEstudiantes(data || []);
    } catch (err) {
      setError('Error al cargar estudiantes');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const guardar = async () => {
    if (!form.nombre_completo || !form.correo || !form.celular) {
      setError('Todos los campos son requeridos');
      return;
    }
    if (!form.correo.endsWith('@uces.edu.co')) {
      setError('El correo debe ser @uces.edu.co');
      return;
    }

    try {
      if (editando) {
        await supabaseFetch(`usuarios?id=eq.${editando}`, {
          method: 'PATCH',
          body: JSON.stringify(form)
        });
      } else {
        await supabaseFetch('usuarios', {
          method: 'POST',
          body: JSON.stringify({ ...form, rol: 'estudiante', activo: true })
        });
      }
      setEditando(null);
      setNuevo(false);
      setForm({ nombre_completo: '', correo: '', celular: '' });
      setError('');
      cargar();
    } catch (err) {
      setError('Error al guardar');
    }
  };

  const toggleActivo = async (id, activo) => {
    try {
      await supabaseFetch(`usuarios?id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ activo: !activo })
      });
      cargar();
    } catch (err) {
      setError('Error al actualizar');
    }
  };

  const eliminar = async (id) => {
    if (!window.confirm('¿Eliminar este estudiante? Sus pacientes quedarán sin asignar.')) return;
    try {
      await supabaseFetch(`pacientes?estudiante_actual_id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ estudiante_actual_id: null })
      });
      const hoy = new Date().toISOString().split('T')[0];
      await supabaseFetch(`citas?estudiante_id=eq.${id}&fecha_cita=gte.${hoy}`, {
        method: 'PATCH',
        body: JSON.stringify({ estudiante_id: null })
      });
      await supabaseFetch(`usuarios?id=eq.${id}`, { method: 'DELETE' });
      cargar();
    } catch (err) {
      setError('Error al eliminar');
    }
  };

  const eliminarSeleccionados = async () => {
    if (seleccionados.length === 0) return;
    if (!window.confirm(`¿Eliminar ${seleccionados.length} estudiantes? Sus pacientes quedarán sin asignar.`)) return;
    
    setEliminando(true);
    try {
      const hoy = new Date().toISOString().split('T')[0];
      for (const id of seleccionados) {
        await supabaseFetch(`pacientes?estudiante_actual_id=eq.${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ estudiante_actual_id: null })
        });
        await supabaseFetch(`citas?estudiante_id=eq.${id}&fecha_cita=gte.${hoy}`, {
          method: 'PATCH',
          body: JSON.stringify({ estudiante_id: null })
        });
        await supabaseFetch(`usuarios?id=eq.${id}`, { method: 'DELETE' });
      }
      setSeleccionados([]);
      cargar();
    } catch (err) {
      setError('Error al eliminar estudiantes');
    } finally {
      setEliminando(false);
    }
  };

  const toggleSeleccion = (id) => {
    setSeleccionados(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleTodos = () => {
    if (seleccionados.length === estudiantes.length) {
      setSeleccionados([]);
    } else {
      setSeleccionados(estudiantes.map(e => e.id));
    }
  };

  if (cargando) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" size={32} /></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-bold">Estudiantes ({estudiantes.length})</h3>
          {seleccionados.length > 0 && (
            <button
              onClick={eliminarSeleccionados}
              disabled={eliminando}
              className="flex items-center gap-1 bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-sm disabled:bg-gray-400"
            >
              {eliminando ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              Eliminar ({seleccionados.length})
            </button>
          )}
        </div>
        <button
          onClick={() => { setNuevo(true); setForm({ nombre_completo: '', correo: '', celular: '' }); }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <UserPlus size={20} /> Agregar
        </button>
      </div>

      {error && (
        <div className="bg-red-100 text-red-700 px-4 py-2 rounded-lg mb-4">{error}</div>
      )}

      {(nuevo || editando) && (
        <div className="bg-gray-50 p-4 rounded-lg mb-4 border">
          <h4 className="font-bold mb-3">{editando ? 'Editar' : 'Nuevo'} Estudiante</h4>
          <div className="grid gap-3 md:grid-cols-3">
            <input
              placeholder="Nombre completo"
              value={form.nombre_completo}
              onChange={(e) => setForm({ ...form, nombre_completo: e.target.value })}
              className="border rounded-lg px-3 py-2"
            />
            <input
              placeholder="correo@uces.edu.co"
              value={form.correo}
              onChange={(e) => setForm({ ...form, correo: e.target.value })}
              className="border rounded-lg px-3 py-2"
            />
            <input
              placeholder="Celular"
              value={form.celular}
              onChange={(e) => setForm({ ...form, celular: e.target.value })}
              className="border rounded-lg px-3 py-2"
            />
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={guardar} className="flex items-center gap-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
              <Save size={18} /> Guardar
            </button>
            <button onClick={() => { setNuevo(false); setEditando(null); setError(''); }} className="flex items-center gap-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600">
              <X size={18} /> Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-3 w-10">
                <input
                  type="checkbox"
                  checked={seleccionados.length === estudiantes.length && estudiantes.length > 0}
                  onChange={toggleTodos}
                  className="w-4 h-4 cursor-pointer"
                />
              </th>
              <th className="text-left p-3 font-semibold">Nombre</th>
              <th className="text-left p-3 font-semibold">Correo</th>
              <th className="text-left p-3 font-semibold">Celular</th>
              <th className="text-center p-3 font-semibold">Estado</th>
              <th className="text-center p-3 font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {estudiantes.map((e) => (
              <tr key={e.id} className={`border-b hover:bg-gray-50 ${seleccionados.includes(e.id) ? 'bg-red-50' : ''}`}>
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={seleccionados.includes(e.id)}
                    onChange={() => toggleSeleccion(e.id)}
                    className="w-4 h-4 cursor-pointer"
                  />
                </td>
                <td className="p-3">{e.nombre_completo}</td>
                <td className="p-3 text-sm">{e.correo}</td>
                <td className="p-3">{e.celular}</td>
                <td className="p-3 text-center">
                  <button
                    onClick={() => toggleActivo(e.id, e.activo)}
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      e.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {e.activo ? 'Activo' : 'Inactivo'}
                  </button>
                </td>
                <td className="p-3 text-center">
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={() => { setEditando(e.id); setForm({ nombre_completo: e.nombre_completo, correo: e.correo, celular: e.celular }); }}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => eliminar(e.id)} className="text-red-600 hover:text-red-800">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// =============================================
// COMPONENTE: GESTIÓN DE PACIENTES
// =============================================
const GestionPacientes = () => {
  const [pacientes, setPacientes] = useState([]);
  const [estudiantes, setEstudiantes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [error, setError] = useState('');
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [nuevo, setNuevo] = useState({
    primer_nombre: '',
    segundo_nombre: '',
    primer_apellido: '',
    segundo_apellido: '',
    cedula: '',
    celular: '',
    estudiante_actual_id: ''
  });
  const [seleccionados, setSeleccionados] = useState([]);
  const [eliminando, setEliminando] = useState(false);
  const [pacienteExpandido, setPacienteExpandido] = useState(null);

  const usuarioActual = JSON.parse(sessionStorage.getItem('usuario') || '{}');

  const formatearTelefono = (tel) => {
    if (!tel) return '';
    const digitos = tel.replace(/\D/g, '');
    if (digitos.length === 10) {
      return `${digitos.slice(0,3)} · ${digitos.slice(3,6)} · ${digitos.slice(6,8)} · ${digitos.slice(8,10)}`;
    } else if (digitos.length === 7) {
      return `${digitos.slice(0,3)} · ${digitos.slice(3,5)} · ${digitos.slice(5,7)}`;
    }
    return tel;
  };

  const validarTelefono = (tel) => {
    const digitos = tel.replace(/\D/g, '');
    if (digitos.length === 10 && digitos.startsWith('3')) {
      return { valido: true, tipo: 'celular' };
    } else if (digitos.length === 7) {
      return { valido: true, tipo: 'fijo' };
    }
    return { valido: false, tipo: null };
  };

  const cargar = async () => {
    setCargando(true);
    try {
      const [pacData, estData] = await Promise.all([
        supabaseFetch('pacientes?select=*,usuarios!pacientes_estudiante_actual_id_fkey(nombre_completo),planes_tratamiento(*)&order=primer_nombre.asc,primer_apellido.asc'),
        supabaseFetch('usuarios?rol=eq.estudiante&activo=eq.true&select=id,nombre_completo&order=nombre_completo.asc')
      ]);
      setPacientes(pacData || []);
      setEstudiantes(estData || []);
    } catch (err) {
      setError('Error al cargar pacientes');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const crearPaciente = async () => {
    if (!nuevo.primer_nombre || !nuevo.primer_apellido || !nuevo.cedula) {
      setError('Nombre, apellido y cédula son obligatorios');
      return;
    }
    if (!nuevo.celular) {
      setError('El teléfono es obligatorio');
      return;
    }
    const telValidacion = validarTelefono(nuevo.celular);
    if (!telValidacion.valido) {
      setError('Teléfono inválido. Celular: 10 dígitos empezando con 3. Fijo: 7 dígitos.');
      return;
    }
    if (!nuevo.estudiante_actual_id) {
      setError('Debe asignar un estudiante');
      return;
    }

    try {
      await supabaseFetch('pacientes', {
        method: 'POST',
        body: JSON.stringify({
          primer_nombre: nuevo.primer_nombre,
          segundo_nombre: nuevo.segundo_nombre || null,
          primer_apellido: nuevo.primer_apellido,
          segundo_apellido: nuevo.segundo_apellido || null,
          cedula: nuevo.cedula,
          celular: nuevo.celular.replace(/\D/g, ''),
          estudiante_actual_id: nuevo.estudiante_actual_id,
          registrado_por: usuarioActual.id
        })
      });
      setMostrarFormulario(false);
      setNuevo({
        primer_nombre: '',
        segundo_nombre: '',
        primer_apellido: '',
        segundo_apellido: '',
        cedula: '',
        celular: '',
        estudiante_actual_id: ''
      });
      setError('');
      cargar();
    } catch (err) {
      setError('Error al crear paciente');
    }
  };

  const cambiarEstudiante = async (pacienteId, nuevoEstudianteId) => {
    try {
      if (!nuevoEstudianteId) {
        await supabaseFetch(`pacientes?id=eq.${pacienteId}`, {
          method: 'PATCH',
          body: JSON.stringify({ estudiante_actual_id: null })
        });
        cargar();
        return;
      }

      const citasPaciente = await supabaseFetch(
        `citas?paciente_id=eq.${pacienteId}&estado=eq.programada&select=id,fecha_cita,hora`
      );

      if (citasPaciente && citasPaciente.length > 0) {
        const conflictos = [];
        for (const cita of citasPaciente) {
          const citasNuevoEst = await supabaseFetch(
            `citas?estudiante_id=eq.${nuevoEstudianteId}&fecha_cita=eq.${cita.fecha_cita}&estado=eq.programada&select=id`
          );
          if (citasNuevoEst && citasNuevoEst.length >= 2) {
            conflictos.push(`${cita.fecha_cita}: ya tiene 2 citas`);
          }
        }

        if (conflictos.length > 0) {
          const nuevoEst = estudiantes.find(e => e.id === nuevoEstudianteId);
          const confirmar = window.confirm(
            `⚠️ ${nuevoEst?.nombre_completo || 'El estudiante'} tiene conflictos:\n\n` +
            conflictos.join('\n') + 
            `\n\n¿Reasignar de todas formas?`
          );
          if (!confirmar) return;
        }
      }

      await supabaseFetch(`pacientes?id=eq.${pacienteId}`, {
        method: 'PATCH',
        body: JSON.stringify({ estudiante_actual_id: nuevoEstudianteId })
      });

      if (citasPaciente && citasPaciente.length > 0) {
        await supabaseFetch(`citas?paciente_id=eq.${pacienteId}&estado=eq.programada`, {
          method: 'PATCH',
          body: JSON.stringify({ estudiante_id: nuevoEstudianteId })
        });
      }

      cargar();
    } catch (err) {
      setError('Error al asignar estudiante');
    }
  };

  const eliminarPaciente = async (id) => {
    if (!window.confirm('¿Eliminar este paciente? Todos sus datos (citas, planes, reportes) se eliminarán.')) return;
    try {
      const reportes = await supabaseFetch(`reportes_tratamiento?paciente_id=eq.${id}&select=id`);
      if (reportes && reportes.length > 0) {
        const reporteIds = reportes.map(r => r.id);
        for (const rid of reporteIds) {
          await supabaseFetch(`reporte_items?reporte_id=eq.${rid}`, { method: 'DELETE' });
        }
      }
      await supabaseFetch(`reportes_tratamiento?paciente_id=eq.${id}`, { method: 'DELETE' });
      await supabaseFetch(`planes_tratamiento?paciente_id=eq.${id}`, { method: 'DELETE' });
      const hoy = new Date().toISOString().split('T')[0];
      await supabaseFetch(`citas?paciente_id=eq.${id}&fecha_cita=gte.${hoy}`, { method: 'DELETE' });
      await supabaseFetch(`pacientes?id=eq.${id}`, { method: 'DELETE' });
      cargar();
    } catch (err) {
      setError('Error al eliminar paciente');
    }
  };

  const eliminarSeleccionados = async () => {
    if (seleccionados.length === 0) return;
    if (!window.confirm(`¿Eliminar ${seleccionados.length} pacientes? Todos sus datos se eliminarán.`)) return;
    
    setEliminando(true);
    try {
      for (const id of seleccionados) {
        const reportes = await supabaseFetch(`reportes_tratamiento?paciente_id=eq.${id}&select=id`);
        if (reportes && reportes.length > 0) {
          for (const r of reportes) {
            await supabaseFetch(`reporte_items?reporte_id=eq.${r.id}`, { method: 'DELETE' });
          }
        }
        await supabaseFetch(`reportes_tratamiento?paciente_id=eq.${id}`, { method: 'DELETE' });
        await supabaseFetch(`planes_tratamiento?paciente_id=eq.${id}`, { method: 'DELETE' });
        const hoy = new Date().toISOString().split('T')[0];
        await supabaseFetch(`citas?paciente_id=eq.${id}&fecha_cita=gte.${hoy}`, { method: 'DELETE' });
        await supabaseFetch(`pacientes?id=eq.${id}`, { method: 'DELETE' });
      }
      setSeleccionados([]);
      cargar();
    } catch (err) {
      setError('Error al eliminar pacientes');
    } finally {
      setEliminando(false);
    }
  };

  const toggleSeleccion = (id) => {
    setSeleccionados(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  //const toggleTodos = () => {
  //  if (seleccionados.length === pacientesFiltrados.length) {
 //     setSeleccionados([]);
 //   } else {
  //    setSeleccionados(pacientesFiltrados.map(p => p.id));
 //   }
 // };

  const pacientesFiltrados = pacientes.filter(p => {
    const nombre = `${p.primer_nombre} ${p.segundo_nombre || ''} ${p.primer_apellido} ${p.segundo_apellido || ''}`.toLowerCase();
    const cedula = p.cedula || '';
    return nombre.includes(filtro.toLowerCase()) || cedula.includes(filtro);
  });

  // Funciones para renderizar plan
  const formatearPlan = (planCompleto) => {
    if (!planCompleto) return null;
    try {
      return typeof planCompleto === 'string' ? JSON.parse(planCompleto) : planCompleto;
    } catch {
      return null;
    }
  };

  const formatearDienteConSuperficie = (item) => {
    if (typeof item === 'object' && item !== null) {
      if (item.superficies) return `${item.diente} (${item.superficies})`;
      if (item.superficie) return `${item.diente} (${item.superficie})`;
      return item.diente;
    }
    return item;
  };

  const formatearCorona = (item) => {
    if (typeof item === 'object' && item !== null) {
      return `${item.diente}${item.tipo ? ` (${item.tipo})` : ''}`;
    }
    return item;
  };

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

  const formatearProtesisFija = (item) => {
    if (typeof item === 'object' && item !== null) {
      return `Tramo ${item.tramo}${item.tipo ? ` (${item.tipo})` : ''}`;
    }
    return item;
  };

  const renderPlanItem = (texto, key) => (
    <li key={key} className="flex items-center gap-2 text-gray-700">
      <span className="w-4 h-4 border border-gray-300 rounded-full flex-shrink-0"></span>
      <span>{texto}</span>
    </li>
  );

  const renderPlan = (plan) => {
    if (!plan) return <p className="text-gray-500 text-sm">Sin plan de tratamiento</p>;

    return (
      <div className="space-y-4 text-sm">
        {plan.fase_higienica_periodontal && (
          <div>
            <h5 className="font-semibold text-blue-800 mb-2">Fase Higiénica Periodontal</h5>
            <ul className="space-y-1">
              {plan.fase_higienica_periodontal.profilaxis && renderPlanItem('Profilaxis', 'profilaxis')}
              {plan.fase_higienica_periodontal.detartraje?.generalizado && renderPlanItem('Detartraje generalizado', 'detartraje-gen')}
              {plan.fase_higienica_periodontal.detartraje?.dientes?.map((d, idx) => renderPlanItem(`Detartraje: ${formatearDienteConSuperficie(d)}`, `detartraje-${idx}`))}
              {plan.fase_higienica_periodontal.aplicacion_fluor?.map((d, idx) => renderPlanItem(`Aplicación flúor: ${formatearDienteConSuperficie(d)}`, `fluor-${idx}`))}
              {plan.fase_higienica_periodontal.pulido?.map((d, idx) => renderPlanItem(`Pulido: ${formatearDienteConSuperficie(d)}`, `pulido-${idx}`))}
              {plan.fase_higienica_periodontal.raspaje_alisado_radicular?.map((d, idx) => renderPlanItem(`Raspaje y alisado radicular: ${formatearDienteConSuperficie(d)}`, `raspaje-${idx}`))}
            </ul>
          </div>
        )}

        {plan.fase_higienica_dental && (
          <div>
            <h5 className="font-semibold text-blue-800 mb-2">Fase Higiénica Dental</h5>
            <ul className="space-y-1">
              {plan.fase_higienica_dental.operatoria?.map((d, idx) => renderPlanItem(`Operatoria/Resina: ${formatearDienteConSuperficie(d)}`, `operatoria-${idx}`))}
              {plan.fase_higienica_dental.exodoncias?.map((d, idx) => renderPlanItem(`Exodoncia: ${formatearDienteConSuperficie(d)}`, `exodoncia-${idx}`))}
              {plan.fase_higienica_dental.retiro_coronas?.map((d, idx) => renderPlanItem(`Retiro corona: ${formatearDienteConSuperficie(d)}`, `retiro-corona-${idx}`))}
              {plan.fase_higienica_dental.provisionales?.map((d, idx) => renderPlanItem(`Provisional: ${formatearDienteConSuperficie(d)}`, `provisional-${idx}`))}
              {plan.fase_higienica_dental.rebase_provisionales?.map((d, idx) => renderPlanItem(`Rebase provisional: ${formatearDienteConSuperficie(d)}`, `rebase-prov-${idx}`))}
              {plan.fase_higienica_dental.protesis_transicional?.superior && renderPlanItem(`Prótesis transicional superior${plan.fase_higienica_dental.protesis_transicional.dientes_reemplazar?.length > 0 ? ` (reemplaza: ${plan.fase_higienica_dental.protesis_transicional.dientes_reemplazar.join(', ')})` : ''}`, 'pt-superior')}
              {plan.fase_higienica_dental.protesis_transicional?.inferior && renderPlanItem('Prótesis transicional inferior', 'pt-inferior')}
              {plan.fase_higienica_dental.rebase_protesis_transicional?.superior && renderPlanItem('Rebase prótesis transicional superior', 'rebase-pt-sup')}
              {plan.fase_higienica_dental.rebase_protesis_transicional?.inferior && renderPlanItem('Rebase prótesis transicional inferior', 'rebase-pt-inf')}
            </ul>
          </div>
        )}

        {plan.fase_reevaluativa && (
          <div>
            <h5 className="font-semibold text-blue-800 mb-2">Fase Reevaluativa</h5>
            <ul className="space-y-1">{renderPlanItem('Reevaluación', 'reevaluacion')}</ul>
          </div>
        )}

        {plan.fase_correctiva_inicial && (
          <div>
            <h5 className="font-semibold text-blue-800 mb-2">Fase Correctiva Inicial</h5>
            <ul className="space-y-1">
              {plan.fase_correctiva_inicial.endodoncia?.map((d, idx) => renderPlanItem(`Endodoncia: ${formatearDienteConSuperficie(d)}`, `endodoncia-${idx}`))}
              {plan.fase_correctiva_inicial.postes?.map((d, idx) => renderPlanItem(`Poste: ${formatearDienteConSuperficie(d)}`, `poste-${idx}`))}
              {plan.fase_correctiva_inicial.nucleos?.map((d, idx) => renderPlanItem(`Núcleo: ${formatearDienteConSuperficie(d)}`, `nucleo-${idx}`))}
              {plan.fase_correctiva_inicial.reconstruccion_munon?.map((d, idx) => renderPlanItem(`Reconstrucción muñón: ${formatearDienteConSuperficie(d)}`, `munon-${idx}`))}
              {plan.fase_correctiva_inicial.implantes_observacion?.map((d, idx) => renderPlanItem(`Implante (observación): ${formatearDienteConSuperficie(d)}`, `implante-${idx}`))}
              {plan.fase_correctiva_inicial.cirugia_oral && renderPlanItem(`Cirugía oral: ${plan.fase_correctiva_inicial.cirugia_oral}`, 'cirugia-oral')}
              {plan.fase_correctiva_inicial.ajuste_oclusal?.completo && renderPlanItem('Ajuste oclusal completo', 'ajuste-completo')}
              {plan.fase_correctiva_inicial.ajuste_oclusal?.cuadrantes?.map((c, idx) => renderPlanItem(`Ajuste oclusal cuadrante ${c}`, `ajuste-q${idx}`))}
            </ul>
          </div>
        )}

        {plan.fase_correctiva_final && (
          <div>
            <h5 className="font-semibold text-blue-800 mb-2">Fase Correctiva Final</h5>
            <ul className="space-y-1">
              {plan.fase_correctiva_final.coronas?.map((c, idx) => renderPlanItem(`Corona: ${formatearCorona(c)}`, `corona-${idx}`))}
              {plan.fase_correctiva_final.incrustaciones?.map((i, idx) => renderPlanItem(`Incrustación: ${formatearIncrustacion(i)}`, `incrustacion-${idx}`))}
              {plan.fase_correctiva_final.protesis_removible?.superior && renderPlanItem('Prótesis removible superior', 'ppr-superior')}
              {plan.fase_correctiva_final.protesis_removible?.inferior && renderPlanItem('Prótesis removible inferior', 'ppr-inferior')}
              {plan.fase_correctiva_final.protesis_total?.superior && renderPlanItem('Prótesis total superior', 'pt-superior')}
              {plan.fase_correctiva_final.protesis_total?.inferior && renderPlanItem('Prótesis total inferior', 'pt-inferior')}
              {plan.fase_correctiva_final.protesis_fija?.map((p, idx) => renderPlanItem(`Prótesis fija: ${formatearProtesisFija(p)}`, `ppf-${idx}`))}
              {plan.fase_correctiva_final.carillas?.map((d, idx) => renderPlanItem(`Carilla: ${formatearDienteConSuperficie(d)}`, `carilla-${idx}`))}
            </ul>
          </div>
        )}

        {plan.fase_mantenimiento && (
          <div>
            <h5 className="font-semibold text-blue-800 mb-2">Fase de Mantenimiento</h5>
            <ul className="space-y-1">{renderPlanItem('Mantenimiento', 'mantenimiento')}</ul>
          </div>
        )}
      </div>
    );
  };

  if (cargando) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" size={32} /></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-bold">Pacientes ({pacientes.length})</h3>
          {seleccionados.length > 0 && (
            <button
              onClick={eliminarSeleccionados}
              disabled={eliminando}
              className="flex items-center gap-1 bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-sm disabled:bg-gray-400"
            >
              {eliminando ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              Eliminar ({seleccionados.length})
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={cargar} className="flex items-center gap-2 text-gray-600 hover:text-gray-800">
            <RefreshCw size={20} />
          </button>
          <button
            onClick={() => setMostrarFormulario(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Plus size={20} /> Nuevo
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 text-red-700 px-4 py-2 rounded-lg mb-4 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')}><X size={16} /></button>
        </div>
      )}

      {mostrarFormulario && (
        <div className="bg-gray-50 p-4 rounded-lg mb-4 border">
          <h4 className="font-bold mb-3">Nuevo Paciente</h4>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <input placeholder="Primer nombre *" value={nuevo.primer_nombre} onChange={(e) => setNuevo({...nuevo, primer_nombre: e.target.value})} className="border rounded-lg px-3 py-2" />
            <input placeholder="Segundo nombre" value={nuevo.segundo_nombre} onChange={(e) => setNuevo({...nuevo, segundo_nombre: e.target.value})} className="border rounded-lg px-3 py-2" />
            <input placeholder="Primer apellido *" value={nuevo.primer_apellido} onChange={(e) => setNuevo({...nuevo, primer_apellido: e.target.value})} className="border rounded-lg px-3 py-2" />
            <input placeholder="Segundo apellido" value={nuevo.segundo_apellido} onChange={(e) => setNuevo({...nuevo, segundo_apellido: e.target.value})} className="border rounded-lg px-3 py-2" />
            <input placeholder="Cédula *" value={nuevo.cedula} onChange={(e) => setNuevo({...nuevo, cedula: e.target.value})} className="border rounded-lg px-3 py-2" />
            <input placeholder="Teléfono *" value={nuevo.celular} onChange={(e) => setNuevo({...nuevo, celular: e.target.value})} className="border rounded-lg px-3 py-2" />
            <select value={nuevo.estudiante_actual_id} onChange={(e) => setNuevo({...nuevo, estudiante_actual_id: e.target.value})} className="border rounded-lg px-3 py-2">
              <option value="">Asignar estudiante *</option>
              {estudiantes.map(e => (<option key={e.id} value={e.id}>{e.nombre_completo}</option>))}
            </select>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={crearPaciente} className="flex items-center gap-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
              <Save size={18} /> Guardar
            </button>
            <button onClick={() => { setMostrarFormulario(false); setError(''); }} className="flex items-center gap-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600">
              <X size={18} /> Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="mb-4">
        <input type="text" placeholder="Buscar por nombre o cédula..." value={filtro} onChange={(e) => setFiltro(e.target.value)} className="w-full md:w-96 border rounded-lg px-4 py-2" />
      </div>

      <div className="space-y-2">
        {pacientesFiltrados.map((p) => {
          const isExpanded = pacienteExpandido === p.id;
          const planes = p.planes_tratamiento || [];
          const planActivo = planes.find(pl => pl.estado === 'aprobado' && !pl.fecha_finalizacion);
          const planFormateado = planActivo ? formatearPlan(planActivo.plan_completo) : null;

          return (
            <div key={p.id} className="border rounded-lg overflow-hidden bg-white">
              <div
                onClick={() => setPacienteExpandido(isExpanded ? null : p.id)}
                className={`p-4 cursor-pointer hover:bg-gray-50 flex items-center justify-between ${seleccionados.includes(p.id) ? 'bg-red-50' : ''}`}
              >
                <div className="flex items-center gap-4">
                  <input
                    type="checkbox"
                    checked={seleccionados.includes(p.id)}
                    onChange={(e) => { e.stopPropagation(); toggleSeleccion(p.id); }}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <div className="font-medium">
                      {p.primer_nombre} {p.segundo_nombre || ''} {p.primer_apellido} {p.segundo_apellido || ''}
                    </div>
                    <div className="text-sm text-gray-500">CC: {p.cedula} · Tel: {formatearTelefono(p.celular)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-sm text-right">
                    <div className="text-gray-600">{p.usuarios?.nombre_completo || 'Sin asignar'}</div>
                    {planes.length > 0 && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">{planes.length} plan{planes.length > 1 ? 'es' : ''}</span>
                    )}
                  </div>
                  {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </div>

              {isExpanded && (
                <div className="border-t px-4 py-3 bg-gray-50">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="text-sm text-gray-500">Estudiante asignado:</label>
                      <select
                        value={p.estudiante_actual_id || ''}
                        onChange={(e) => cambiarEstudiante(p.id, e.target.value)}
                        className="w-full border rounded px-2 py-1 text-sm mt-1"
                      >
                        <option value="">Sin asignar</option>
                        {estudiantes.map(e => (<option key={e.id} value={e.id}>{e.nombre_completo}</option>))}
                      </select>
                    </div>
                    <div className="flex items-end justify-end">
                      <button onClick={() => eliminarPaciente(p.id)} className="text-red-600 hover:text-red-800 flex items-center gap-1 text-sm">
                        <Trash2 size={16} /> Eliminar paciente
                      </button>
                    </div>
                  </div>

                  {planes.length === 0 ? (
                    <p className="text-gray-500 text-sm italic">Este paciente no tiene plan de tratamiento.</p>
                  ) : (
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">Plan de Tratamiento Activo:</h4>
                      {planFormateado ? renderPlan(planFormateado) : <p className="text-gray-500 text-sm italic">No hay plan activo.</p>}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {pacientesFiltrados.length === 0 && (
        <div className="text-center py-8 text-gray-500">No se encontraron pacientes</div>
      )}
    </div>
  );
};

// =============================================
// COMPONENTE: GESTIÓN DE CITAS
// =============================================
const GestionCitas = () => {
  const [citas, setCitas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtroEstudiante, setFiltroEstudiante] = useState('');
  const [filtroFecha, setFiltroFecha] = useState('');
  const [estudiantes, setEstudiantes] = useState([]);
  const [sincronizando, setSincronizando] = useState(null);
  const [seleccionados, setSeleccionados] = useState([]);
  const [eliminando, setEliminando] = useState(false);

  const SHEETS_API_URL = 'https://script.google.com/macros/s/AKfycbwRWN7ZrF_oJ1PL8plzYoWSQ-S0jiJ-BNWEyVO7JVlxM4DAMy5JLWZIrWKGYku88A8r_A/exec';

  const formatearHora = (hora24) => {
    if (!hora24) return '';
    const [h, m] = hora24.split(':').map(Number);
    const periodo = h >= 12 ? 'PM' : 'AM';
    const hora12 = h > 12 ? h - 12 : (h === 0 ? 12 : h);
    return `${hora12}:${m.toString().padStart(2, '0')} ${periodo}`;
  };

  const convertirHoraParaSheets = (hora24) => {
    const [h, m] = hora24.split(':').map(Number);
    const periodo = h >= 12 ? 'p.m.' : 'a.m.';
    const hora12 = h > 12 ? h - 12 : (h === 0 ? 12 : h);
    return `${hora12}:${m.toString().padStart(2, '0')} ${periodo}`;
  };

  const convertirMesParaSheets = (mesNum) => {
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return meses[mesNum - 1];
  };

  const cargar = async () => {
    setCargando(true);
    try {
      const [citasData, estData] = await Promise.all([
        supabaseFetch('citas?select=*,pacientes(primer_nombre,primer_apellido,segundo_nombre,segundo_apellido,cedula,celular),usuarios!citas_estudiante_id_fkey(nombre_completo,correo)&order=fecha_cita.desc,hora'),
        supabaseFetch('usuarios?rol=eq.estudiante&activo=eq.true&select=id,nombre_completo')
      ]);
      setCitas(citasData || []);
      setEstudiantes(estData || []);
    } catch (err) {
      console.error('Error cargando citas:', err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const citasFiltradas = citas.filter(c => {
    const cumpleFecha = !filtroFecha || c.fecha_cita === filtroFecha;
    const cumpleEstudiante = !filtroEstudiante || c.estudiante_id === filtroEstudiante;
    return cumpleFecha && cumpleEstudiante;
  });

  const cancelarCita = async (id) => {
    if (!window.confirm('¿Cancelar esta cita?')) return;
    try {
      await supabaseFetch(`citas?id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ estado: 'cancelada' })
      });
      cargar();
    } catch (err) {
      console.error('Error cancelando cita:', err);
    }
  };

  const eliminarCita = async (id) => {
    if (!window.confirm('¿Eliminar esta cita permanentemente?')) return;
    try {
      await supabaseFetch(`citas?id=eq.${id}`, { method: 'DELETE' });
      cargar();
    } catch (err) {
      console.error('Error eliminando cita:', err);
    }
  };

  const eliminarTodasCanceladas = async () => {
    const canceladas = citas.filter(c => c.estado === 'cancelada');
    if (canceladas.length === 0) {
      alert('No hay citas canceladas para eliminar');
      return;
    }
    if (!window.confirm(`¿Eliminar ${canceladas.length} citas canceladas permanentemente?`)) return;
    try {
      await supabaseFetch(`citas?estado=eq.cancelada`, { method: 'DELETE' });
      cargar();
    } catch (err) {
      console.error('Error eliminando citas:', err);
    }
  };

  const eliminarSeleccionados = async () => {
    if (seleccionados.length === 0) return;
    if (!window.confirm(`¿Eliminar ${seleccionados.length} citas permanentemente?`)) return;
    setEliminando(true);
    try {
      for (const id of seleccionados) {
        await supabaseFetch(`citas?id=eq.${id}`, { method: 'DELETE' });
      }
      setSeleccionados([]);
      cargar();
    } catch (err) {
      console.error('Error eliminando citas:', err);
    } finally {
      setEliminando(false);
    }
  };

  const toggleSeleccion = (id) => {
    setSeleccionados(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleTodos = () => {
    if (seleccionados.length === citasFiltradas.length) {
      setSeleccionados([]);
    } else {
      setSeleccionados(citasFiltradas.map(c => c.id));
    }
  };

  const sincronizarCita = async (cita) => {
    setSincronizando(cita.id);
    try {
      const [year, month, day] = cita.fecha_cita.split('-');
      const payload = {
        action: 'agregarCita',
        mes: convertirMesParaSheets(parseInt(month)),
        datos: {
          fecha: `${day}/${month}/${year}`,
          hora: convertirHoraParaSheets(cita.hora),
          estudiante: cita.usuarios?.nombre_completo || '',
          correo: cita.usuarios?.correo || '',
          paciente: `${cita.pacientes?.primer_nombre || ''} ${cita.pacientes?.primer_apellido || ''}`.trim(),
          cedula: cita.pacientes?.cedula || '',
          celular: cita.pacientes?.celular || ''
        }
      };

      const response = await fetch(SHEETS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (result.success) {
        await supabaseFetch(`citas?id=eq.${cita.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ sincronizado_sheets: true })
        });
        cargar();
      } else {
        alert('Error al sincronizar: ' + (result.error || 'Error desconocido'));
      }
    } catch (err) {
      console.error('Error sincronizando:', err);
      alert('Error de conexión al sincronizar');
    } finally {
      setSincronizando(null);
    }
  };

  if (cargando) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" size={32} /></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-bold">Citas ({citas.length})</h3>
          {seleccionados.length > 0 && (
            <button onClick={eliminarSeleccionados} disabled={eliminando} className="flex items-center gap-1 bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-sm disabled:bg-gray-400">
              {eliminando ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              Eliminar ({seleccionados.length})
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={eliminarTodasCanceladas} className="flex items-center gap-2 text-red-600 hover:text-red-800 text-sm">
            <Trash2 size={16} /> Limpiar canceladas
          </button>
          <button onClick={cargar} className="flex items-center gap-2 text-gray-600 hover:text-gray-800">
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      <div className="flex gap-4 mb-4">
        <input type="date" value={filtroFecha} onChange={(e) => setFiltroFecha(e.target.value)} className="border rounded-lg px-4 py-2" />
        <select value={filtroEstudiante} onChange={(e) => setFiltroEstudiante(e.target.value)} className="border rounded-lg px-4 py-2">
          <option value="">Todos los estudiantes</option>
          {estudiantes.map(e => (<option key={e.id} value={e.id}>{e.nombre_completo}</option>))}
        </select>
        {(filtroFecha || filtroEstudiante) && (
          <button onClick={() => { setFiltroFecha(''); setFiltroEstudiante(''); }} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-3 w-10">
                <input type="checkbox" checked={seleccionados.length === citasFiltradas.length && citasFiltradas.length > 0} onChange={toggleTodos} className="w-4 h-4 cursor-pointer" />
              </th>
              <th className="text-left p-3 font-semibold">Fecha</th>
              <th className="text-left p-3 font-semibold">Hora</th>
              <th className="text-left p-3 font-semibold">Paciente</th>
              <th className="text-left p-3 font-semibold">Estudiante</th>
              <th className="text-center p-3 font-semibold">Estado</th>
              <th className="text-center p-3 font-semibold">Sheets</th>
              <th className="text-center p-3 font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {citasFiltradas.map((c) => (
              <tr key={c.id} className={`border-b hover:bg-gray-50 ${seleccionados.includes(c.id) ? 'bg-red-50' : ''}`}>
                <td className="p-3">
                  <input type="checkbox" checked={seleccionados.includes(c.id)} onChange={() => toggleSeleccion(c.id)} className="w-4 h-4 cursor-pointer" />
                </td>
                <td className="p-3">{new Date(c.fecha_cita + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'short', day: '2-digit', month: 'short' })}</td>
                <td className="p-3">{formatearHora(c.hora)}</td>
                <td className="p-3">
                  <div>{c.pacientes?.primer_nombre} {c.pacientes?.primer_apellido}</div>
                  <div className="text-xs text-gray-500">{c.pacientes?.cedula}</div>
                </td>
                <td className="p-3 text-sm">{c.usuarios?.nombre_completo || 'Sin asignar'}</td>
                <td className="p-3 text-center">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    c.estado === 'programada' ? 'bg-blue-100 text-blue-700' :
                    c.estado === 'completada' ? 'bg-green-100 text-green-700' :
                    c.estado === 'cancelada' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {c.estado}
                  </span>
                </td>
                <td className="p-3 text-center">
                  {c.sincronizado_sheets ? (
                    <CheckCircle size={18} className="text-green-600 mx-auto" />
                  ) : (
                    <button onClick={() => sincronizarCita(c)} disabled={sincronizando === c.id} className="text-yellow-600 hover:text-yellow-800" title="Sincronizar con Sheets">
                      {sincronizando === c.id ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                    </button>
                  )}
                </td>
                <td className="p-3 text-center">
                  <div className="flex justify-center gap-2">
                    {c.estado === 'programada' && (
                      <button onClick={() => cancelarCita(c.id)} className="text-yellow-600 hover:text-yellow-800" title="Cancelar">
                        <XCircle size={18} />
                      </button>
                    )}
                    {c.estado === 'cancelada' && (
                      <button onClick={() => eliminarCita(c.id)} className="text-red-600 hover:text-red-800" title="Eliminar">
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {citasFiltradas.length === 0 && (
        <div className="text-center py-8 text-gray-500">No se encontraron citas</div>
      )}
    </div>
  );
};

// =============================================
// COMPONENTE: GESTIÓN DE PLANES DE TRATAMIENTO
// =============================================
const GestionPlanes = () => {
  const [planes, setPlanes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [seleccionados, setSeleccionados] = useState([]);
  const [eliminando, setEliminando] = useState(false);
  const [planExpandido, setPlanExpandido] = useState(null);

  const cargar = async () => {
    setCargando(true);
    try {
      const data = await supabaseFetch(
        'planes_tratamiento?select=*,pacientes(primer_nombre,primer_apellido,segundo_nombre,segundo_apellido,cedula),usuarios!planes_tratamiento_estudiante_id_fkey(nombre_completo)&order=created_at.desc'
      );
      setPlanes(data || []);
    } catch (err) {
      console.error('Error cargando planes:', err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const planesFiltrados = planes.filter(p => {
    const nombrePaciente = `${p.pacientes?.primer_nombre || ''} ${p.pacientes?.primer_apellido || ''}`.toLowerCase();
    const cedula = p.pacientes?.cedula || '';
    return nombrePaciente.includes(filtro.toLowerCase()) || cedula.includes(filtro);
  });

  const eliminarPlan = async (id) => {
    if (!window.confirm('¿Eliminar este plan de tratamiento?')) return;
    try {
      await supabaseFetch(`planes_tratamiento?id=eq.${id}`, { method: 'DELETE' });
      cargar();
    } catch (err) {
      console.error('Error eliminando plan:', err);
    }
  };

  const eliminarSeleccionados = async () => {
    if (seleccionados.length === 0) return;
    if (!window.confirm(`¿Eliminar ${seleccionados.length} planes de tratamiento?`)) return;
    setEliminando(true);
    try {
      for (const id of seleccionados) {
        await supabaseFetch(`planes_tratamiento?id=eq.${id}`, { method: 'DELETE' });
      }
      setSeleccionados([]);
      cargar();
    } catch (err) {
      console.error('Error eliminando planes:', err);
    } finally {
      setEliminando(false);
    }
  };

  const toggleSeleccion = (id) => {
    setSeleccionados(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  //const toggleTodos = () => {
  //  if (seleccionados.length === planesFiltrados.length) {
  //    setSeleccionados([]);
  //  } else {
  //    setSeleccionados(planesFiltrados.map(p => p.id));
  //  }
 // };

  // Funciones para renderizar plan
  const formatearPlan = (planCompleto) => {
    if (!planCompleto) return null;
    try {
      return typeof planCompleto === 'string' ? JSON.parse(planCompleto) : planCompleto;
    } catch {
      return null;
    }
  };

  const formatearDienteConSuperficie = (item) => {
    if (typeof item === 'object' && item !== null) {
      if (item.superficies) return `${item.diente} (${item.superficies})`;
      if (item.superficie) return `${item.diente} (${item.superficie})`;
      return item.diente;
    }
    return item;
  };

  const formatearCorona = (item) => {
    if (typeof item === 'object' && item !== null) {
      return `${item.diente}${item.tipo ? ` (${item.tipo})` : ''}`;
    }
    return item;
  };

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

  const formatearProtesisFija = (item) => {
    if (typeof item === 'object' && item !== null) {
      return `Tramo ${item.tramo}${item.tipo ? ` (${item.tipo})` : ''}`;
    }
    return item;
  };

  const renderPlanItem = (texto, key) => (
    <li key={key} className="flex items-center gap-2 text-gray-700">
      <span className="w-4 h-4 border border-gray-300 rounded-full flex-shrink-0"></span>
      <span>{texto}</span>
    </li>
  );

  const renderPlan = (plan) => {
    if (!plan) return <p className="text-gray-500 text-sm">Sin detalle de plan</p>;

    return (
      <div className="space-y-4 text-sm">
        {plan.fase_higienica_periodontal && (
          <div>
            <h5 className="font-semibold text-blue-800 mb-2">Fase Higiénica Periodontal</h5>
            <ul className="space-y-1">
              {plan.fase_higienica_periodontal.profilaxis && renderPlanItem('Profilaxis', 'profilaxis')}
              {plan.fase_higienica_periodontal.detartraje?.generalizado && renderPlanItem('Detartraje generalizado', 'detartraje-gen')}
              {plan.fase_higienica_periodontal.detartraje?.dientes?.map((d, idx) => renderPlanItem(`Detartraje: ${formatearDienteConSuperficie(d)}`, `detartraje-${idx}`))}
              {plan.fase_higienica_periodontal.aplicacion_fluor?.map((d, idx) => renderPlanItem(`Aplicación flúor: ${formatearDienteConSuperficie(d)}`, `fluor-${idx}`))}
              {plan.fase_higienica_periodontal.pulido?.map((d, idx) => renderPlanItem(`Pulido: ${formatearDienteConSuperficie(d)}`, `pulido-${idx}`))}
              {plan.fase_higienica_periodontal.raspaje_alisado_radicular?.map((d, idx) => renderPlanItem(`Raspaje y alisado radicular: ${formatearDienteConSuperficie(d)}`, `raspaje-${idx}`))}
            </ul>
          </div>
        )}

        {plan.fase_higienica_dental && (
          <div>
            <h5 className="font-semibold text-blue-800 mb-2">Fase Higiénica Dental</h5>
            <ul className="space-y-1">
              {plan.fase_higienica_dental.operatoria?.map((d, idx) => renderPlanItem(`Operatoria/Resina: ${formatearDienteConSuperficie(d)}`, `operatoria-${idx}`))}
              {plan.fase_higienica_dental.exodoncias?.map((d, idx) => renderPlanItem(`Exodoncia: ${formatearDienteConSuperficie(d)}`, `exodoncia-${idx}`))}
              {plan.fase_higienica_dental.retiro_coronas?.map((d, idx) => renderPlanItem(`Retiro corona: ${formatearDienteConSuperficie(d)}`, `retiro-corona-${idx}`))}
              {plan.fase_higienica_dental.provisionales?.map((d, idx) => renderPlanItem(`Provisional: ${formatearDienteConSuperficie(d)}`, `provisional-${idx}`))}
              {plan.fase_higienica_dental.rebase_provisionales?.map((d, idx) => renderPlanItem(`Rebase provisional: ${formatearDienteConSuperficie(d)}`, `rebase-prov-${idx}`))}
              {plan.fase_higienica_dental.protesis_transicional?.superior && renderPlanItem(`Prótesis transicional superior${plan.fase_higienica_dental.protesis_transicional.dientes_reemplazar?.length > 0 ? ` (reemplaza: ${plan.fase_higienica_dental.protesis_transicional.dientes_reemplazar.join(', ')})` : ''}`, 'pt-superior')}
              {plan.fase_higienica_dental.protesis_transicional?.inferior && renderPlanItem('Prótesis transicional inferior', 'pt-inferior')}
              {plan.fase_higienica_dental.rebase_protesis_transicional?.superior && renderPlanItem('Rebase prótesis transicional superior', 'rebase-pt-sup')}
              {plan.fase_higienica_dental.rebase_protesis_transicional?.inferior && renderPlanItem('Rebase prótesis transicional inferior', 'rebase-pt-inf')}
            </ul>
          </div>
        )}

        {plan.fase_reevaluativa && (
          <div>
            <h5 className="font-semibold text-blue-800 mb-2">Fase Reevaluativa</h5>
            <ul className="space-y-1">{renderPlanItem('Reevaluación', 'reevaluacion')}</ul>
          </div>
        )}

        {plan.fase_correctiva_inicial && (
          <div>
            <h5 className="font-semibold text-blue-800 mb-2">Fase Correctiva Inicial</h5>
            <ul className="space-y-1">
              {plan.fase_correctiva_inicial.endodoncia?.map((d, idx) => renderPlanItem(`Endodoncia: ${formatearDienteConSuperficie(d)}`, `endodoncia-${idx}`))}
              {plan.fase_correctiva_inicial.postes?.map((d, idx) => renderPlanItem(`Poste: ${formatearDienteConSuperficie(d)}`, `poste-${idx}`))}
              {plan.fase_correctiva_inicial.nucleos?.map((d, idx) => renderPlanItem(`Núcleo: ${formatearDienteConSuperficie(d)}`, `nucleo-${idx}`))}
              {plan.fase_correctiva_inicial.reconstruccion_munon?.map((d, idx) => renderPlanItem(`Reconstrucción muñón: ${formatearDienteConSuperficie(d)}`, `munon-${idx}`))}
              {plan.fase_correctiva_inicial.implantes_observacion?.map((d, idx) => renderPlanItem(`Implante (observación): ${formatearDienteConSuperficie(d)}`, `implante-${idx}`))}
              {plan.fase_correctiva_inicial.cirugia_oral && renderPlanItem(`Cirugía oral: ${plan.fase_correctiva_inicial.cirugia_oral}`, 'cirugia-oral')}
              {plan.fase_correctiva_inicial.ajuste_oclusal?.completo && renderPlanItem('Ajuste oclusal completo', 'ajuste-completo')}
              {plan.fase_correctiva_inicial.ajuste_oclusal?.cuadrantes?.map((c, idx) => renderPlanItem(`Ajuste oclusal cuadrante ${c}`, `ajuste-q${idx}`))}
            </ul>
          </div>
        )}

        {plan.fase_correctiva_final && (
          <div>
            <h5 className="font-semibold text-blue-800 mb-2">Fase Correctiva Final</h5>
            <ul className="space-y-1">
              {plan.fase_correctiva_final.coronas?.map((c, idx) => renderPlanItem(`Corona: ${formatearCorona(c)}`, `corona-${idx}`))}
              {plan.fase_correctiva_final.incrustaciones?.map((i, idx) => renderPlanItem(`Incrustación: ${formatearIncrustacion(i)}`, `incrustacion-${idx}`))}
              {plan.fase_correctiva_final.protesis_removible?.superior && renderPlanItem('Prótesis removible superior', 'ppr-superior')}
              {plan.fase_correctiva_final.protesis_removible?.inferior && renderPlanItem('Prótesis removible inferior', 'ppr-inferior')}
              {plan.fase_correctiva_final.protesis_total?.superior && renderPlanItem('Prótesis total superior', 'pt-superior')}
              {plan.fase_correctiva_final.protesis_total?.inferior && renderPlanItem('Prótesis total inferior', 'pt-inferior')}
              {plan.fase_correctiva_final.protesis_fija?.map((p, idx) => renderPlanItem(`Prótesis fija: ${formatearProtesisFija(p)}`, `ppf-${idx}`))}
              {plan.fase_correctiva_final.carillas?.map((d, idx) => renderPlanItem(`Carilla: ${formatearDienteConSuperficie(d)}`, `carilla-${idx}`))}
            </ul>
          </div>
        )}

        {plan.fase_mantenimiento && (
          <div>
            <h5 className="font-semibold text-blue-800 mb-2">Fase de Mantenimiento</h5>
            <ul className="space-y-1">{renderPlanItem('Mantenimiento', 'mantenimiento')}</ul>
          </div>
        )}
      </div>
    );
  };

  if (cargando) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" size={32} /></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-bold">Planes de Tratamiento ({planes.length})</h3>
          {seleccionados.length > 0 && (
            <button onClick={eliminarSeleccionados} disabled={eliminando} className="flex items-center gap-1 bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-sm disabled:bg-gray-400">
              {eliminando ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              Eliminar ({seleccionados.length})
            </button>
          )}
        </div>
        <button onClick={cargar} className="flex items-center gap-2 text-gray-600 hover:text-gray-800">
          <RefreshCw size={20} /> Actualizar
        </button>
      </div>

      <div className="mb-4">
        <input type="text" placeholder="Buscar por paciente o cédula..." value={filtro} onChange={(e) => setFiltro(e.target.value)} className="w-full md:w-96 border rounded-lg px-4 py-2" />
      </div>

      <div className="space-y-2">
        {planesFiltrados.map((p) => {
          const isExpanded = planExpandido === p.id;
          const planFormateado = formatearPlan(p.plan_completo);

          return (
            <div key={p.id} className={`border rounded-lg overflow-hidden bg-white ${seleccionados.includes(p.id) ? 'bg-red-50' : ''}`}>
              <div
                onClick={() => setPlanExpandido(isExpanded ? null : p.id)}
                className="p-4 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <input
                    type="checkbox"
                    checked={seleccionados.includes(p.id)}
                    onChange={(e) => { e.stopPropagation(); toggleSeleccion(p.id); }}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <div className="font-medium">
                      {p.pacientes?.primer_nombre} {p.pacientes?.segundo_nombre || ''} {p.pacientes?.primer_apellido} {p.pacientes?.segundo_apellido || ''}
                    </div>
                    <div className="text-sm text-gray-500">CC: {p.pacientes?.cedula}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      p.estado === 'aprobado' ? 'bg-green-100 text-green-700' :
                      p.estado === 'pendiente_aprobacion' ? 'bg-yellow-100 text-yellow-700' :
                      p.estado === 'finalizado' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {p.estado}
                    </span>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(p.created_at).toLocaleDateString('es-CO')}
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); eliminarPlan(p.id); }} className="text-red-600 hover:text-red-800">
                    <Trash2 size={18} />
                  </button>
                  {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </div>

              {isExpanded && (
                <div className="border-t px-4 py-3 bg-gray-50">
                  {p.usuarios?.nombre_completo && (
                    <p className="text-sm text-gray-600 mb-3">Registrado por: <strong>{p.usuarios.nombre_completo}</strong></p>
                  )}
                  {renderPlan(planFormateado)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {planesFiltrados.length === 0 && (
        <div className="text-center py-8 text-gray-500">No se encontraron planes de tratamiento</div>
      )}
    </div>
  );
};

// =============================================
// COMPONENTE: GESTIÓN DE HORARIOS
// =============================================
const GestionHorarios = () => {
  const [horarios, setHorarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({});

  const cargar = async () => {
    setCargando(true);
    try {
      const data = await supabaseFetch('config_horarios?order=orden');
      setHorarios(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const guardar = async () => {
    try {
      await supabaseFetch(`config_horarios?id=eq.${editando}`, {
        method: 'PATCH',
        body: JSON.stringify(form)
      });
      setEditando(null);
      cargar();
    } catch (err) {
      alert('Error al guardar');
    }
  };

  const toggleActivo = async (id, activo) => {
    try {
      await supabaseFetch(`config_horarios?id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ activo: !activo })
      });
      cargar();
    } catch (err) {
      console.error(err);
    }
  };

  if (cargando) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" size={32} /></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold">Horarios de Clínica</h3>
        <button onClick={cargar} className="flex items-center gap-2 text-gray-600 hover:text-gray-800">
          <RefreshCw size={20} /> Actualizar
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {horarios.map((h) => (
          <div key={h.id} className={`p-4 border rounded-lg ${h.activo ? 'bg-white' : 'bg-gray-100 opacity-60'}`}>
            {editando === h.id ? (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input type="time" value={form.hora_inicio || ''} onChange={(e) => setForm({...form, hora_inicio: e.target.value})} className="border rounded px-2 py-1" />
                  <span className="self-center">a</span>
                  <input type="time" value={form.hora_fin || ''} onChange={(e) => setForm({...form, hora_fin: e.target.value})} className="border rounded px-2 py-1" />
                </div>
                <div className="flex gap-2">
                  <button onClick={guardar} className="bg-green-600 text-white px-3 py-1 rounded text-sm"><Save size={14} /></button>
                  <button onClick={() => setEditando(null)} className="bg-gray-500 text-white px-3 py-1 rounded text-sm"><X size={14} /></button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{h.dia_semana}</div>
                  <div className="text-sm text-gray-600">{h.hora_inicio} - {h.hora_fin}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setEditando(h.id); setForm({ hora_inicio: h.hora_inicio, hora_fin: h.hora_fin }); }} className="text-blue-600 hover:text-blue-800">
                    <Edit2 size={18} />
                  </button>
                  <button onClick={() => toggleActivo(h.id, h.activo)} className={`px-3 py-1 rounded-full text-xs font-medium ${h.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {h.activo ? 'Activo' : 'Inactivo'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// =============================================
// COMPONENTE: GESTIÓN DE FESTIVOS
// =============================================
const GestionFestivos = () => {
  const [festivos, setFestivos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [nuevo, setNuevo] = useState({ fecha: '', descripcion: '' });
  const [mostrarForm, setMostrarForm] = useState(false);

  const cargar = async () => {
    setCargando(true);
    try {
      const data = await supabaseFetch('dias_festivos?order=fecha.desc');
      setFestivos(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const agregar = async () => {
    if (!nuevo.fecha) return;
    try {
      await supabaseFetch('dias_festivos', {
        method: 'POST',
        body: JSON.stringify(nuevo)
      });
      setNuevo({ fecha: '', descripcion: '' });
      setMostrarForm(false);
      cargar();
    } catch (err) {
      alert('Error al agregar');
    }
  };

  const eliminar = async (id) => {
    if (!window.confirm('¿Eliminar este festivo?')) return;
    try {
      await supabaseFetch(`dias_festivos?id=eq.${id}`, { method: 'DELETE' });
      cargar();
    } catch (err) {
      console.error(err);
    }
  };

  if (cargando) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" size={32} /></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold">Días Festivos ({festivos.length})</h3>
        <button onClick={() => setMostrarForm(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          <Plus size={20} /> Agregar
        </button>
      </div>

      {mostrarForm && (
        <div className="bg-gray-50 p-4 rounded-lg mb-4 border">
          <div className="flex gap-3 items-end">
            <div>
              <label className="block text-sm font-medium mb-1">Fecha</label>
              <input type="date" value={nuevo.fecha} onChange={(e) => setNuevo({...nuevo, fecha: e.target.value})} className="border rounded-lg px-3 py-2" />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Descripción</label>
              <input type="text" placeholder="Ej: Día de la Independencia" value={nuevo.descripcion} onChange={(e) => setNuevo({...nuevo, descripcion: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <button onClick={agregar} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
              <Save size={18} />
            </button>
            <button onClick={() => { setMostrarForm(false); setNuevo({ fecha: '', descripcion: '' }); }} className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600">
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="text-left p-3 font-semibold">Fecha</th>
              <th className="text-left p-3 font-semibold">Descripción</th>
              <th className="text-center p-3 font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {festivos.map((f) => (
              <tr key={f.id} className="border-b hover:bg-gray-50">
                <td className="p-3">{new Date(f.fecha + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</td>
                <td className="p-3">{f.descripcion || '-'}</td>
                <td className="p-3 text-center">
                  <button onClick={() => eliminar(f.id)} className="text-red-600 hover:text-red-800">
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {festivos.length === 0 && (
        <div className="text-center py-8 text-gray-500">No hay días festivos registrados</div>
      )}
    </div>
  );
};

// =============================================
// COMPONENTE: LOGS DEL SISTEMA
// =============================================
const GestionLogs = () => {
  const [logs, setLogs] = useState([]);
  const [cargando, setCargando] = useState(true);

  const cargar = async () => {
    setCargando(true);
    try {
      const data = await supabaseFetch('logs_sistema?order=created_at.desc&limit=100');
      setLogs(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  if (cargando) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" size={32} /></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold">Logs del Sistema</h3>
        <button onClick={cargar} className="flex items-center gap-2 text-gray-600 hover:text-gray-800">
          <RefreshCw size={20} /> Actualizar
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="text-left p-3 font-semibold">Fecha</th>
              <th className="text-left p-3 font-semibold">Acción</th>
              <th className="text-left p-3 font-semibold">Usuario</th>
              <th className="text-left p-3 font-semibold">Detalles</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-b hover:bg-gray-50">
                <td className="p-3 whitespace-nowrap">{new Date(l.created_at).toLocaleString('es-CO')}</td>
                <td className="p-3">{l.accion}</td>
                <td className="p-3">{l.usuario_id || '-'}</td>
                <td className="p-3 max-w-xs truncate">{l.detalles || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {logs.length === 0 && (
        <div className="text-center py-8 text-gray-500">No hay logs registrados</div>
      )}
    </div>
  );
};

// =============================================
// COMPONENTE: ESTADÍSTICAS
// =============================================
const Estadisticas = ({ onNavigate }) => {
  const [stats, setStats] = useState({
    totalEstudiantes: 0,
    estudiantesActivos: 0,
    totalPacientes: 0,
    totalReportes: 0,
    reportesPendientes: 0,
    reportesAprobados: 0,
    reportesRechazados: 0,
    citasProgramadas: 0
  });
  const [cargando, setCargando] = useState(true);

  const cargar = async () => {
    setCargando(true);
    try {
      let estudiantes = [];
      let pacientes = [];
      let reporteItems = [];
      let citas = [];

      try {
        estudiantes = await supabaseFetch('usuarios?rol=eq.estudiante&select=id,activo') || [];
      } catch (e) { console.error('Error estudiantes:', e); }

      try {
        pacientes = await supabaseFetch('pacientes?select=id') || [];
      } catch (e) { console.error('Error pacientes:', e); }

      try {
        reporteItems = await supabaseFetch('reporte_items?select=id,estado_aprobacion') || [];
      } catch (e) { console.error('Error reportes:', e); }

      try {
        citas = await supabaseFetch('citas?select=id') || [];
      } catch (e) { console.error('Error citas:', e); }

      setStats({
        totalEstudiantes: estudiantes.length || 0,
        estudiantesActivos: estudiantes.filter(e => e.activo).length || 0,
        totalPacientes: pacientes.length || 0,
        totalReportes: reporteItems.length || 0,
        reportesPendientes: reporteItems.filter(r => r.estado_aprobacion === 'pendiente').length || 0,
        reportesAprobados: reporteItems.filter(r => r.estado_aprobacion === 'aprobado').length || 0,
        reportesRechazados: reporteItems.filter(r => r.estado_aprobacion === 'rechazado').length || 0,
        citasProgramadas: citas.length || 0
      });
    } catch (err) {
      console.error('Error general:', err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  if (cargando) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" size={32} /></div>;

  const cards = [
    { label: 'Estudiantes Activos', value: `${stats.estudiantesActivos}/${stats.totalEstudiantes}`, color: 'blue', icon: Users, tab: 'estudiantes' },
    { label: 'Pacientes Registrados', value: stats.totalPacientes, color: 'green', icon: Users, tab: 'pacientes' },
    { label: 'Citas Programadas', value: stats.citasProgramadas, color: 'purple', icon: Calendar, tab: 'citas' },
    { label: 'Reportes Pendientes', value: stats.reportesPendientes, color: 'yellow', icon: Clock, tab: 'planes' },
    { label: 'Reportes Aprobados', value: stats.reportesAprobados, color: 'green', icon: CheckCircle, tab: 'planes' },
    { label: 'Reportes Rechazados', value: stats.reportesRechazados, color: 'red', icon: XCircle, tab: 'planes' },
  ];

  const colorClasses = {
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
    green: 'bg-green-100 text-green-800 border-green-200',
    purple: 'bg-purple-100 text-purple-800 border-purple-200',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    red: 'bg-red-100 text-red-800 border-red-200'
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold">Estadísticas del Sistema</h3>
        <button onClick={cargar} className="flex items-center gap-2 text-gray-600 hover:text-gray-800">
          <RefreshCw size={20} /> Actualizar
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card, idx) => (
          <div 
            key={idx} 
            onClick={() => onNavigate(card.tab)}
            className={`p-6 rounded-lg border-2 ${colorClasses[card.color]} cursor-pointer hover:shadow-lg transition-shadow`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium opacity-80">{card.label}</p>
                <p className="text-3xl font-bold mt-1">{card.value}</p>
              </div>
              <card.icon size={32} className="opacity-50" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// =============================================
// COMPONENTE: CONFIGURACIÓN
// =============================================
const GestionConfig = () => {
  const [config, setConfig] = useState({ max_citas_por_dia: 2 });
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const cargar = async () => {
    setCargando(true);
    try {
      const data = await supabaseFetch('config_sistema?select=*');
      if (data && data.length > 0) {
        setConfig(data[0]);
      }
    } catch (err) {
      console.error('Error cargando config:', err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const guardar = async () => {
    setGuardando(true);
    setMensaje('');
    try {
      const existe = await supabaseFetch('config_sistema?select=id');
      
      if (existe && existe.length > 0) {
        await supabaseFetch(`config_sistema?id=eq.${existe[0].id}`, {
          method: 'PATCH',
          body: JSON.stringify({ max_citas_por_dia: config.max_citas_por_dia })
        });
      } else {
        await supabaseFetch('config_sistema', {
          method: 'POST',
          body: JSON.stringify({ max_citas_por_dia: config.max_citas_por_dia })
        });
      }
      setMensaje('✅ Configuración guardada');
    } catch (err) {
      setMensaje('❌ Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" size={32} /></div>;

  return (
    <div>
      <h3 className="text-lg font-bold mb-6">Configuración del Sistema</h3>

      <div className="bg-gray-50 p-6 rounded-lg border max-w-md">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Máximo de citas por día por estudiante
        </label>
        <input
          type="number"
          min="1"
          max="10"
          value={config.max_citas_por_dia}
          onChange={(e) => setConfig({ ...config, max_citas_por_dia: parseInt(e.target.value) || 1 })}
          className="w-full border rounded-lg px-4 py-2 text-lg"
        />
        <p className="text-sm text-gray-500 mt-2">
          Número máximo de pacientes que un estudiante puede agendar en un mismo día.
        </p>

        <button
          onClick={guardar}
          disabled={guardando}
          className="mt-4 flex items-center gap-2 bg-amber-600 text-white px-6 py-2 rounded-lg hover:bg-amber-700 disabled:bg-gray-400"
        >
          {guardando ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          Guardar
        </button>

        {mensaje && (
          <p className={`mt-3 text-sm ${mensaje.includes('✅') ? 'text-green-600' : 'text-red-600'}`}>
            {mensaje}
          </p>
        )}
      </div>
    </div>
  );
};

// =============================================
// COMPONENTE PRINCIPAL: ADMIN PANEL
// =============================================
const AdminPanel = () => {
  const [tabActivo, setTabActivo] = useState('estudiantes');

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-amber-600 text-white px-6 py-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Settings size={24} />
            Panel de Administración
          </h2>
          <p className="text-amber-100 text-sm mt-1">Gestión del sistema clínico</p>
        </div>

        {/* Tabs */}
        <div className="border-b bg-gray-50">
          <div className="flex overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTabActivo(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 font-medium whitespace-nowrap transition ${
                  tabActivo === tab.id
                    ? 'bg-white border-b-2 border-amber-600 text-amber-600'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Contenido */}
        <div className="p-6">
          {tabActivo === 'estudiantes' && <GestionEstudiantes />}
          {tabActivo === 'pacientes' && <GestionPacientes />}
          {tabActivo === 'citas' && <GestionCitas />}
          {tabActivo === 'planes' && <GestionPlanes />}
          {tabActivo === 'horarios' && <GestionHorarios />}
          {tabActivo === 'festivos' && <GestionFestivos />}
          {tabActivo === 'logs' && <GestionLogs />}
          {tabActivo === 'config' && <GestionConfig />}
          {tabActivo === 'estadisticas' && <Estadisticas onNavigate={setTabActivo} />}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
