// src/components/AdminPanel.jsx
import React, { useState, useEffect } from 'react';
import { 
  Users, Clock, Calendar, AlertTriangle, BarChart3, 
  Plus, Trash2, Edit2, Save, X, RefreshCw, Loader2,
  CheckCircle, XCircle, UserPlus, Settings
} from 'lucide-react';
import { SUPABASE_CONFIG } from '../config/api';

// Tabs del panel
const TABS = [
  { id: 'estudiantes', label: 'Estudiantes', icon: Users },
  { id: 'pacientes', label: 'Pacientes', icon: UserPlus },
  { id: 'citas', label: 'Citas', icon: Calendar },
  { id: 'horarios', label: 'Horarios', icon: Clock },
  { id: 'festivos', label: 'Festivos', icon: Calendar },
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

  // =============================================
// COMPONENTE: GESTIÓN DE PACIENTES
// =============================================
const GestionPacientes = () => {
  const [pacientes, setPacientes] = useState([]);
  const [estudiantes, setEstudiantes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [error, setError] = useState('');

  const cargar = async () => {
    setCargando(true);
    try {
      const [pacData, estData] = await Promise.all([
        supabaseFetch('pacientes?select=*,usuarios!pacientes_estudiante_actual_id_fkey(nombre_completo)&order=created_at.desc'),
        supabaseFetch('usuarios?rol=eq.estudiante&activo=eq.true&select=id,nombre_completo')
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

  const cambiarEstudiante = async (pacienteId, nuevoEstudianteId) => {
    try {
      await supabaseFetch(`pacientes?id=eq.${pacienteId}`, {
        method: 'PATCH',
        body: JSON.stringify({ estudiante_actual_id: nuevoEstudianteId || null })
      });
      cargar();
    } catch (err) {
      setError('Error al asignar estudiante');
    }
  };

  const pacientesFiltrados = pacientes.filter(p => {
    const nombre = `${p.primer_nombre} ${p.segundo_nombre || ''} ${p.primer_apellido} ${p.segundo_apellido || ''}`.toLowerCase();
    return nombre.includes(filtro.toLowerCase()) || p.cedula.includes(filtro);
  });

  if (cargando) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" size={32} /></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold">Pacientes ({pacientes.length})</h3>
        <button onClick={cargar} className="flex items-center gap-2 text-gray-600 hover:text-gray-800">
          <RefreshCw size={20} /> Actualizar
        </button>
      </div>

      {error && <div className="bg-red-100 text-red-700 px-4 py-2 rounded-lg mb-4">{error}</div>}

      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar por nombre o cédula..."
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          className="w-full md:w-96 border rounded-lg px-4 py-2"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="text-left p-3 font-semibold">Paciente</th>
              <th className="text-left p-3 font-semibold">Cédula</th>
              <th className="text-left p-3 font-semibold">Celular</th>
              <th className="text-left p-3 font-semibold">Estudiante Asignado</th>
              <th className="text-left p-3 font-semibold">Registrado</th>
            </tr>
          </thead>
          <tbody>
            {pacientesFiltrados.map((p) => (
              <tr key={p.id} className="border-b hover:bg-gray-50">
                <td className="p-3">
                  {p.primer_nombre} {p.segundo_nombre || ''} {p.primer_apellido} {p.segundo_apellido || ''}
                </td>
                <td className="p-3">{p.cedula}</td>
                <td className="p-3">{p.celular}</td>
                <td className="p-3">
                  <select
                    value={p.estudiante_actual_id || ''}
                    onChange={(e) => cambiarEstudiante(p.id, e.target.value)}
                    className="border rounded px-2 py-1 text-sm w-full"
                  >
                    <option value="">Sin asignar</option>
                    {estudiantes.map(e => (
                      <option key={e.id} value={e.id}>{e.nombre_completo}</option>
                    ))}
                  </select>
                </td>
                <td className="p-3 text-sm text-gray-500">
                  {new Date(p.created_at).toLocaleDateString('es-CO')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pacientesFiltrados.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No se encontraron pacientes
        </div>
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

  const formatearHora = (hora24) => {
    if (!hora24) return '';
    const [h, m] = hora24.split(':').map(Number);
    const periodo = h >= 12 ? 'PM' : 'AM';
    const hora12 = h > 12 ? h - 12 : (h === 0 ? 12 : h);
    return `${hora12}:${m.toString().padStart(2, '0')} ${periodo}`;
  };

  const cargar = async () => {
    setCargando(true);
    try {
      const [citasData, estData] = await Promise.all([
        supabaseFetch('citas?select=*,pacientes(primer_nombre,primer_apellido,cedula),usuarios!citas_estudiante_id_fkey(nombre_completo)&order=fecha_cita.desc,hora'),
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

  if (cargando) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" size={32} /></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold">Citas Programadas ({citas.length})</h3>
        <button onClick={cargar} className="flex items-center gap-2 text-gray-600 hover:text-gray-800">
          <RefreshCw size={20} /> Actualizar
        </button>
      </div>

      <div className="flex gap-4 mb-4 flex-wrap">
        <select
          value={filtroEstudiante}
          onChange={(e) => setFiltroEstudiante(e.target.value)}
          className="border rounded-lg px-4 py-2"
        >
          <option value="">Todos los estudiantes</option>
          {estudiantes.map(e => (
            <option key={e.id} value={e.id}>{e.nombre_completo}</option>
          ))}
        </select>
        <input
          type="date"
          value={filtroFecha}
          onChange={(e) => setFiltroFecha(e.target.value)}
          className="border rounded-lg px-4 py-2"
        />
        {(filtroEstudiante || filtroFecha) && (
          <button
            onClick={() => { setFiltroEstudiante(''); setFiltroFecha(''); }}
            className="text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <X size={16} /> Limpiar filtros
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="text-left p-3 font-semibold">Fecha</th>
              <th className="text-left p-3 font-semibold">Hora</th>
              <th className="text-left p-3 font-semibold">Paciente</th>
              <th className="text-left p-3 font-semibold">Estudiante</th>
              <th className="text-left p-3 font-semibold">Tratamiento</th>
              <th className="text-center p-3 font-semibold">Estado</th>
              <th className="text-center p-3 font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {citasFiltradas.map((c) => (
              <tr key={c.id} className="border-b hover:bg-gray-50">
                <td className="p-3">
                  {new Date(c.fecha_cita + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })}
                </td>
                <td className="p-3">{formatearHora(c.hora)}</td>
                <td className="p-3">
                  {c.pacientes?.primer_nombre} {c.pacientes?.primer_apellido}
                  <span className="text-xs text-gray-500 block">CC: {c.pacientes?.cedula}</span>
                </td>
                <td className="p-3 text-sm">{c.usuarios?.nombre_completo}</td>
                <td className="p-3 text-sm">{c.tratamiento_programado}</td>
                <td className="p-3 text-center">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    c.estado === 'programada' ? 'bg-blue-100 text-blue-700' :
                    c.estado === 'completada' ? 'bg-green-100 text-green-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {c.estado}
                  </span>
                </td>
                <td className="p-3 text-center">
                  {c.estado === 'programada' && (
                    <button
                      onClick={() => cancelarCita(c.id)}
                      className="text-red-600 hover:text-red-800"
                      title="Cancelar cita"
                    >
                      <XCircle size={18} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {citasFiltradas.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No se encontraron citas
        </div>
      )}
    </div>
  );
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
    if (!window.confirm('¿Eliminar este estudiante?')) return;
    try {
      await supabaseFetch(`usuarios?id=eq.${id}`, { method: 'DELETE' });
      cargar();
    } catch (err) {
      setError('Error al eliminar');
    }
  };

  if (cargando) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" size={32} /></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold">Estudiantes ({estudiantes.length})</h3>
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
              disabled={!!editando}
            />
            <input
              placeholder="Celular (3001234567)"
              value={form.celular}
              onChange={(e) => setForm({ ...form, celular: e.target.value.replace(/\D/g, '') })}
              className="border rounded-lg px-3 py-2"
            />
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={guardar} className="flex items-center gap-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
              <Save size={16} /> Guardar
            </button>
            <button onClick={() => { setNuevo(false); setEditando(null); setError(''); }} className="flex items-center gap-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600">
              <X size={16} /> Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="text-left p-3 font-semibold">Nombre</th>
              <th className="text-left p-3 font-semibold">Correo</th>
              <th className="text-left p-3 font-semibold">Celular</th>
              <th className="text-center p-3 font-semibold">Estado</th>
              <th className="text-center p-3 font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {estudiantes.map((e) => (
              <tr key={e.id} className="border-b hover:bg-gray-50">
                <td className="p-3">{e.nombre_completo}</td>
                <td className="p-3 text-sm text-gray-600">{e.correo}</td>
                <td className="p-3">{e.celular}</td>
                <td className="p-3 text-center">
                  <button
                    onClick={() => toggleActivo(e.id, e.activo)}
                    className={`px-2 py-1 rounded text-xs font-medium ${e.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                  >
                    {e.activo ? 'Activo' : 'Inactivo'}
                  </button>
                </td>
                <td className="p-3 text-center">
                  <button
                    onClick={() => { setEditando(e.id); setForm({ nombre_completo: e.nombre_completo, correo: e.correo, celular: e.celular }); }}
                    className="text-blue-600 hover:text-blue-800 mx-1"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button onClick={() => eliminar(e.id)} className="text-red-600 hover:text-red-800 mx-1">
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {estudiantes.length === 0 && (
          <p className="text-center text-gray-500 py-8">No hay estudiantes registrados</p>
        )}
      </div>
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
  const [nuevo, setNuevo] = useState(false);
  const [form, setForm] = useState({ dia_semana: 'miercoles', hora_inicio: '13:00', hora_fin: '19:00' });

  const cargar = async () => {
    setCargando(true);
    try {
      const data = await supabaseFetch('config_horarios?order=dia_semana');
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
      if (editando) {
        await supabaseFetch(`config_horarios?id=eq.${editando}`, {
          method: 'PATCH',
          body: JSON.stringify(form)
        });
      } else {
        await supabaseFetch('config_horarios', {
          method: 'POST',
          body: JSON.stringify({ ...form, activo: true })
        });
      }
      setEditando(null);
      setNuevo(false);
      cargar();
    } catch (err) {
      alert('Error al guardar');
    }
  };

  const eliminar = async (id) => {
    if (!window.confirm('¿Eliminar este horario?')) return;
    try {
      await supabaseFetch(`config_horarios?id=eq.${id}`, { method: 'DELETE' });
      cargar();
    } catch (err) {
      alert('Error al eliminar');
    }
  };

  const diasMap = { miercoles: 'Miércoles', viernes: 'Viernes', lunes: 'Lunes', martes: 'Martes', jueves: 'Jueves', sabado: 'Sábado' };

  if (cargando) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" size={32} /></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold">Horarios de Clínica</h3>
        <button
          onClick={() => { setNuevo(true); setForm({ dia_semana: 'miercoles', hora_inicio: '13:00', hora_fin: '19:00' }); }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} /> Agregar
        </button>
      </div>

      {(nuevo || editando) && (
        <div className="bg-gray-50 p-4 rounded-lg mb-4 border">
          <h4 className="font-bold mb-3">{editando ? 'Editar' : 'Nuevo'} Horario</h4>
          <div className="grid gap-3 md:grid-cols-3">
            <select
              value={form.dia_semana}
              onChange={(e) => setForm({ ...form, dia_semana: e.target.value })}
              className="border rounded-lg px-3 py-2"
            >
              <option value="lunes">Lunes</option>
              <option value="martes">Martes</option>
              <option value="miercoles">Miércoles</option>
              <option value="jueves">Jueves</option>
              <option value="viernes">Viernes</option>
              <option value="sabado">Sábado</option>
            </select>
            <input
              type="time"
              value={form.hora_inicio}
              onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })}
              className="border rounded-lg px-3 py-2"
            />
            <input
              type="time"
              value={form.hora_fin}
              onChange={(e) => setForm({ ...form, hora_fin: e.target.value })}
              className="border rounded-lg px-3 py-2"
            />
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={guardar} className="flex items-center gap-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
              <Save size={16} /> Guardar
            </button>
            <button onClick={() => { setNuevo(false); setEditando(null); }} className="flex items-center gap-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600">
              <X size={16} /> Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {horarios.map((h) => (
          <div key={h.id} className={`p-4 rounded-lg border-2 ${h.activo ? 'border-green-300 bg-green-50' : 'border-gray-300 bg-gray-50'}`}>
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-bold text-lg">{diasMap[h.dia_semana] || h.dia_semana}</h4>
                <p className="text-2xl font-mono mt-1">
                  {h.hora_inicio?.slice(0, 5)} - {h.hora_fin?.slice(0, 5)}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setEditando(h.id); setForm({ dia_semana: h.dia_semana, hora_inicio: h.hora_inicio?.slice(0, 5), hora_fin: h.hora_fin?.slice(0, 5) }); }}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <Edit2 size={18} />
                </button>
                <button onClick={() => eliminar(h.id)} className="text-red-600 hover:text-red-800">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {horarios.length === 0 && (
        <p className="text-center text-gray-500 py-8">No hay horarios configurados</p>
      )}

      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-800">
          <strong>⚠️ Nota:</strong> Los cambios de horarios afectan el workflow de autenticación en n8n. 
          Si agregas nuevos días, debes actualizar también el código de validación en n8n.
        </p>
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
  const [nuevo, setNuevo] = useState(false);
  const [form, setForm] = useState({ fecha: '', nombre: '', anio: new Date().getFullYear() });
  const [filtroAnio, setFiltroAnio] = useState(new Date().getFullYear());

  const cargar = async () => {
    setCargando(true);
    try {
      const data = await supabaseFetch(`festivos_colombia?anio=eq.${filtroAnio}&order=fecha`);
      setFestivos(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, [filtroAnio]); // eslint-disable-line react-hooks/exhaustive-deps

  const guardar = async () => {
    if (!form.fecha || !form.nombre) {
      alert('Fecha y nombre son requeridos');
      return;
    }
    try {
      const anio = new Date(form.fecha).getFullYear();
      await supabaseFetch('festivos_colombia', {
        method: 'POST',
        body: JSON.stringify({ ...form, anio })
      });
      setNuevo(false);
      setForm({ fecha: '', nombre: '', anio: new Date().getFullYear() });
      cargar();
    } catch (err) {
      alert('Error al guardar (¿fecha duplicada?)');
    }
  };

  const eliminar = async (id) => {
    if (!window.confirm('¿Eliminar este festivo?')) return;
    try {
      await supabaseFetch(`festivos_colombia?id=eq.${id}`, { method: 'DELETE' });
      cargar();
    } catch (err) {
      alert('Error al eliminar');
    }
  };

  if (cargando) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" size={32} /></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-bold">Festivos Colombia</h3>
          <select
            value={filtroAnio}
            onChange={(e) => setFiltroAnio(Number(e.target.value))}
            className="border rounded-lg px-3 py-1"
          >
            <option value={2025}>2025</option>
            <option value={2026}>2026</option>
            <option value={2027}>2027</option>
          </select>
        </div>
        <button
          onClick={() => { setNuevo(true); setForm({ fecha: '', nombre: '', anio: filtroAnio }); }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} /> Agregar
        </button>
      </div>

      {nuevo && (
        <div className="bg-gray-50 p-4 rounded-lg mb-4 border">
          <h4 className="font-bold mb-3">Nuevo Festivo</h4>
          <div className="grid gap-3 md:grid-cols-2">
            <input
              type="date"
              value={form.fecha}
              onChange={(e) => setForm({ ...form, fecha: e.target.value })}
              className="border rounded-lg px-3 py-2"
            />
            <input
              placeholder="Nombre del festivo"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="border rounded-lg px-3 py-2"
            />
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={guardar} className="flex items-center gap-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
              <Save size={16} /> Guardar
            </button>
            <button onClick={() => setNuevo(false)} className="flex items-center gap-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600">
              <X size={16} /> Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-2">
        {festivos.map((f) => (
          <div key={f.id} className="flex items-center justify-between p-3 bg-white border rounded-lg hover:bg-gray-50">
            <div className="flex items-center gap-4">
              <div className="bg-red-100 text-red-700 px-3 py-1 rounded font-mono text-sm">
                {f.fecha}
              </div>
              <span>{f.nombre}</span>
            </div>
            <button onClick={() => eliminar(f.id)} className="text-red-600 hover:text-red-800">
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>
      {festivos.length === 0 && (
        <p className="text-center text-gray-500 py-8">No hay festivos para {filtroAnio}</p>
      )}
    </div>
  );
};

// =============================================
// COMPONENTE: LOGS DE ERRORES
// =============================================
const GestionLogs = () => {
  const [logs, setLogs] = useState([]);
  const [accesos, setAccesos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [tab, setTab] = useState('errores');

  const cargar = async () => {
    setCargando(true);
    try {
      const [logsData, accesosData] = await Promise.all([
        supabaseFetch('logs_errores?order=created_at.desc&limit=50'),
        supabaseFetch('sesiones?order=created_at.desc&limit=50&select=*,usuarios(nombre_completo,correo)')
      ]);
      setLogs(logsData || []);
      setAccesos(accesosData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const formatFecha = (fecha) => {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleString('es-CO');
  };

  if (cargando) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" size={32} /></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setTab('errores')}
            className={`px-4 py-2 rounded-lg ${tab === 'errores' ? 'bg-red-600 text-white' : 'bg-gray-200'}`}
          >
            Errores ({logs.length})
          </button>
          <button
            onClick={() => setTab('accesos')}
            className={`px-4 py-2 rounded-lg ${tab === 'accesos' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            Accesos ({accesos.length})
          </button>
        </div>
        <button onClick={cargar} className="flex items-center gap-2 text-gray-600 hover:text-gray-800">
          <RefreshCw size={20} /> Actualizar
        </button>
      </div>

      {tab === 'errores' && (
        <div className="space-y-2">
          {logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle size={48} className="mx-auto mb-2 text-green-500" />
              No hay errores registrados
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono text-sm bg-red-200 px-2 py-1 rounded">{log.workflow}</span>
                    <span className="text-sm text-gray-500 ml-2">{log.nodo}</span>
                  </div>
                  <span className="text-xs text-gray-500">{formatFecha(log.created_at)}</span>
                </div>
                <p className="text-red-700 mt-2 text-sm">{log.error_mensaje}</p>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'accesos' && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-left p-3">Usuario</th>
                <th className="text-left p-3">Correo</th>
                <th className="text-left p-3">Fecha</th>
                <th className="text-center p-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {accesos.map((a) => (
                <tr key={a.id} className="border-b">
                  <td className="p-3">{a.usuarios?.nombre_completo || '-'}</td>
                  <td className="p-3 text-sm text-gray-600">{a.usuarios?.correo || '-'}</td>
                  <td className="p-3 text-sm">{formatFecha(a.created_at)}</td>
                  <td className="p-3 text-center">
                    {new Date(a.expires_at) > new Date() ? (
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">Activa</span>
                    ) : (
                      <span className="bg-gray-100 text-gray-500 px-2 py-1 rounded text-xs">Expirada</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// =============================================
// COMPONENTE: ESTADÍSTICAS
// =============================================
const Estadisticas = () => {
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
      const [estudiantes, pacientes, reporteItems, citas] = await Promise.all([
        supabaseFetch('usuarios?rol=eq.estudiante&select=id,activo'),
        supabaseFetch('pacientes?select=id'),
        supabaseFetch('reporte_items?select=id,estado'),
        supabaseFetch('citas?select=id')
      ]);

      setStats({
        totalEstudiantes: estudiantes?.length || 0,
        estudiantesActivos: estudiantes?.filter(e => e.activo).length || 0,
        totalPacientes: pacientes?.length || 0,
        totalReportes: reporteItems?.length || 0,
        reportesPendientes: reporteItems?.filter(r => r.estado === 'pendiente').length || 0,
        reportesAprobados: reporteItems?.filter(r => r.estado === 'aprobado').length || 0,
        reportesRechazados: reporteItems?.filter(r => r.estado === 'rechazado').length || 0,
        citasProgramadas: citas?.length || 0
      });
    } catch (err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  if (cargando) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" size={32} /></div>;

  const cards = [
    { label: 'Estudiantes Activos', value: `${stats.estudiantesActivos}/${stats.totalEstudiantes}`, color: 'blue', icon: Users },
    { label: 'Pacientes Registrados', value: stats.totalPacientes, color: 'green', icon: Users },
    { label: 'Citas Programadas', value: stats.citasProgramadas, color: 'purple', icon: Calendar },
    { label: 'Reportes Pendientes', value: stats.reportesPendientes, color: 'yellow', icon: Clock },
    { label: 'Reportes Aprobados', value: stats.reportesAprobados, color: 'green', icon: CheckCircle },
    { label: 'Reportes Rechazados', value: stats.reportesRechazados, color: 'red', icon: XCircle },
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
          <div key={idx} className={`p-6 rounded-lg border-2 ${colorClasses[card.color]}`}>
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
      // Verificar si existe registro
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
          {tabActivo === 'horarios' && <GestionHorarios />}
          {tabActivo === 'festivos' && <GestionFestivos />}
          {tabActivo === 'config' && <GestionConfig />}
          {tabActivo === 'estadisticas' && <Estadisticas />}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;