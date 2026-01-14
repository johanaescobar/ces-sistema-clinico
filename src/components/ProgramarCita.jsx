// src/components/ProgramarCita.jsx
import React, { useState } from 'react';
import { Send, Loader2, CheckCircle, AlertCircle, Calendar } from 'lucide-react';
import { API_ENDPOINTS } from '../config/api';

const ProgramarCita = () => {
  const [mensaje, setMensaje] = useState('');
  const [conversacion, setConversacion] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [citaCreada, setCitaCreada] = useState(null);

  const enviarMensaje = async () => {
    if (!mensaje.trim() || cargando) return;

    const mensajeUsuario = mensaje.trim();
    setMensaje('');
    setCargando(true);

    setConversacion(prev => [...prev, { tipo: 'usuario', texto: mensajeUsuario }]);

    try {
      const token = localStorage.getItem('token');
      const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');

      const response = await fetch(API_ENDPOINTS.PROGRAMAR_CITA, {
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
          texto: data.mensaje || 'Cita programada exitosamente',
          exito: true
        }]);
        if (data.cita) {
          setCitaCreada(data.cita);
        }
      } else {
        setConversacion(prev => [...prev, { 
          tipo: 'sistema', 
          texto: data.error || data.mensaje || 'Error al procesar la solicitud',
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
    "Cita para María García el miércoles 15 de enero a las 2pm para profilaxis",
    "Programar a Juan Pérez el viernes 17 para continuar con las restauraciones",
    "Agendar cita de Ana López para el próximo miércoles, fase correctiva inicial"
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-green-600 text-white px-6 py-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Calendar size={24} />
            Programar Cita
          </h2>
          <p className="text-green-100 text-sm mt-1">
            Indica paciente, fecha, hora y tratamiento a realizar
          </p>
        </div>

        {/* Info horarios */}
        <div className="px-6 py-3 bg-yellow-50 border-b text-sm">
          <p className="text-yellow-800">
            <strong>📅 Horarios de clínica:</strong> Miércoles 1PM-7PM | Viernes 8AM-2PM
          </p>
        </div>

        {/* Ejemplos */}
        {conversacion.length === 0 && (
          <div className="px-6 py-4 bg-green-50 border-b">
            <p className="text-sm text-gray-600 mb-2 font-medium">Ejemplos:</p>
            <div className="space-y-2">
              {ejemplos.map((ejemplo, idx) => (
                <button
                  key={idx}
                  onClick={() => setMensaje(ejemplo)}
                  className="block w-full text-left text-sm text-green-700 hover:bg-green-100 p-2 rounded transition"
                >
                  "{ejemplo}"
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Conversación */}
        <div className="h-72 overflow-y-auto p-6 space-y-4">
          {conversacion.length === 0 ? (
            <div className="text-center text-gray-400 mt-12">
              <Calendar size={48} className="mx-auto mb-4 opacity-50" />
              <p>Escribe los detalles de la cita a programar</p>
            </div>
          ) : (
            conversacion.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.tipo === 'usuario' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  msg.tipo === 'usuario' 
                    ? 'bg-green-600 text-white' 
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

        {/* Cita creada */}
        {citaCreada && (
          <div className="px-6 py-4 bg-green-50 border-t">
            <h3 className="font-bold text-green-800 mb-2">✅ Cita Programada</h3>
            <p className="text-sm text-green-700">
              <strong>Paciente:</strong> {citaCreada.paciente}<br/>
              <strong>Fecha:</strong> {citaCreada.fecha}<br/>
              <strong>Tratamiento:</strong> {citaCreada.tratamiento}
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
              placeholder="Ej: Cita para María García el miércoles 15 a las 3pm para profilaxis..."
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
              rows={2}
              disabled={cargando}
            />
            <button
              onClick={enviarMensaje}
              disabled={cargando || !mensaje.trim()}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
            >
              {cargando ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgramarCita;