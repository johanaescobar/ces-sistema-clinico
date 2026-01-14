// src/components/NuevoPaciente.jsx
import React, { useState } from 'react';
import { Send, Loader2, CheckCircle, AlertCircle, User } from 'lucide-react';
import { API_ENDPOINTS } from '../config/api';

const NuevoPaciente = () => {
  const [mensaje, setMensaje] = useState('');
  const [conversacion, setConversacion] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [pacienteCreado, setPacienteCreado] = useState(null);

  const enviarMensaje = async () => {
    if (!mensaje.trim() || cargando) return;

    const mensajeUsuario = mensaje.trim();
    setMensaje('');
    setCargando(true);

    // Agregar mensaje del usuario a la conversación
    setConversacion(prev => [...prev, { tipo: 'usuario', texto: mensajeUsuario }]);

    try {
      const token = localStorage.getItem('token');
      const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');

      const response = await fetch(API_ENDPOINTS.NUEVO_PACIENTE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          correo: usuario.correo,
          token: token,
          texto: mensajeUsuario
        })
      });

      const data = await response.json();

      if (data.ok) {
        setConversacion(prev => [...prev, { 
          tipo: 'sistema', 
          texto: data.mensaje || 'Paciente registrado exitosamente',
          exito: true
        }]);
        if (data.paciente) {
          setPacienteCreado(data.paciente);
        }
      } else {
        setConversacion(prev => [...prev, { 
          tipo: 'sistema', 
          texto: data.error || 'Error al procesar la solicitud',
          exito: false
        }]);
      }
    } catch (error) {
      setConversacion(prev => [...prev, { 
        tipo: 'sistema', 
        texto: 'Error de conexión con el servidor',
        exito: false
      }]);
    } finally {
      setCargando(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviarMensaje();
    }
  };

  const ejemplos = [
    "María García, cédula 1017234567, celular 3001234567. Plan: profilaxis, detartraje, y restauraciones en dientes 16, 26, 36 y 46",
    "Juan Pérez, CC 98765432, tel 3109876543. Necesita fase higiénica completa, reevaluación y coronas en 14 y 24",
    "Ana López, 1234567890, 3205551234. Plan de tratamiento: raspaje y alisado radicular, luego prótesis parcial superior"
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 text-white px-6 py-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <User size={24} />
            Registrar Nuevo Paciente
          </h2>
          <p className="text-blue-100 text-sm mt-1">
            Describe el paciente y su plan de tratamiento en lenguaje natural
          </p>
        </div>

        {/* Ejemplos */}
        {conversacion.length === 0 && (
          <div className="px-6 py-4 bg-blue-50 border-b">
            <p className="text-sm text-gray-600 mb-2 font-medium">Ejemplos de cómo escribir:</p>
            <div className="space-y-2">
              {ejemplos.map((ejemplo, idx) => (
                <button
                  key={idx}
                  onClick={() => setMensaje(ejemplo)}
                  className="block w-full text-left text-sm text-blue-700 hover:bg-blue-100 p-2 rounded transition"
                >
                  "{ejemplo.substring(0, 80)}..."
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Conversación */}
        <div className="h-80 overflow-y-auto p-6 space-y-4">
          {conversacion.length === 0 ? (
            <div className="text-center text-gray-400 mt-16">
              <User size={48} className="mx-auto mb-4 opacity-50" />
              <p>Escribe los datos del paciente y su plan de tratamiento</p>
            </div>
          ) : (
            conversacion.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.tipo === 'usuario' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  msg.tipo === 'usuario' 
                    ? 'bg-blue-600 text-white' 
                    : msg.exito 
                      ? 'bg-green-100 text-green-800 border border-green-200'
                      : 'bg-red-100 text-red-800 border border-red-200'
                }`}>
                  {msg.tipo === 'sistema' && (
                    <span className="mr-2">
                      {msg.exito ? <CheckCircle size={16} className="inline" /> : <AlertCircle size={16} className="inline" />}
                    </span>
                  )}
                  {msg.texto}
                </div>
              </div>
            ))
          )}
          {cargando && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg px-4 py-2 flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                Procesando...
              </div>
            </div>
          )}
        </div>

        {/* Paciente creado */}
        {pacienteCreado && (
          <div className="px-6 py-4 bg-green-50 border-t">
            <h3 className="font-bold text-green-800 mb-2">✅ Paciente Registrado</h3>
            <p className="text-sm text-green-700">
              <strong>Nombre:</strong> {pacienteCreado.nombre}<br/>
              <strong>Cédula:</strong> {pacienteCreado.cedula}<br/>
              <strong>Celular:</strong> {pacienteCreado.celular}
            </p>
          </div>
        )}

        {/* Input */}
        <div className="px-6 py-4 border-t bg-gray-50">
          <div className="flex gap-2">
            <textarea
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Escribe los datos del paciente y su plan de tratamiento..."
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              disabled={cargando}
            />
            <button
              onClick={enviarMensaje}
              disabled={cargando || !mensaje.trim()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
            >
              {cargando ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NuevoPaciente;