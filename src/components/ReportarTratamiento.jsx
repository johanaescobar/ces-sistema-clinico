// src/components/ReportarTratamiento.jsx
import React, { useState } from 'react';
import { Send, Loader2, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { API_ENDPOINTS } from '../config/api';

const ReportarTratamiento = () => {
  const [mensaje, setMensaje] = useState('');
  const [conversacion, setConversacion] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [reporteEnviado, setReporteEnviado] = useState(null);

  const enviarMensaje = async () => {
    if (!mensaje.trim() || cargando) return;

    const mensajeUsuario = mensaje.trim();
    setMensaje('');
    setCargando(true);

    setConversacion(prev => [...prev, { tipo: 'usuario', texto: mensajeUsuario }]);

    try {
      const token = localStorage.getItem('token');
      const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');

      const response = await fetch(API_ENDPOINTS.REPORTAR_TRATAMIENTO, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          correo: usuario.correo,
          token: token,
          mensaje: mensajeUsuario
        })
      });

      const data = await response.json();

      if (data.ok) {
        setConversacion(prev => [...prev, { 
          tipo: 'sistema', 
          texto: data.mensaje || 'Reporte enviado. La Dra. Johana recibirá una notificación para revisarlo.',
          exito: true
        }]);
        if (data.reporte) {
          setReporteEnviado(data.reporte);
        }
      } else {
        setConversacion(prev => [...prev, { 
          tipo: 'sistema', 
          texto: data.error || data.mensaje || 'Error al procesar el reporte',
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
    "Hoy con María García hice profilaxis completa y detartraje. También restauración en el 16.",
    "A Juan Pérez le terminé la fase higiénica: raspaje y alisado en los 4 cuadrantes.",
    "Con Ana López completé las restauraciones de 14 y 24, quedó lista para la corona."
  ];

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
            Describe SOLO lo que hiciste hoy (no lo pendiente)
          </p>
        </div>

        {/* Recordatorio */}
        <div className="px-6 py-3 bg-purple-50 border-b text-sm">
          <p className="text-purple-800">
            <strong>💡 Recuerda:</strong> Reporta únicamente los procedimientos COMPLETADOS. 
            El sistema calculará automáticamente lo que queda pendiente.
          </p>
        </div>

        {/* Ejemplos */}
        {conversacion.length === 0 && (
          <div className="px-6 py-4 bg-gray-50 border-b">
            <p className="text-sm text-gray-600 mb-2 font-medium">Ejemplos de reporte:</p>
            <div className="space-y-2">
              {ejemplos.map((ejemplo, idx) => (
                <button
                  key={idx}
                  onClick={() => setMensaje(ejemplo)}
                  className="block w-full text-left text-sm text-purple-700 hover:bg-purple-100 p-2 rounded transition"
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
              <FileText size={48} className="mx-auto mb-4 opacity-50" />
              <p>Describe los tratamientos que realizaste hoy</p>
            </div>
          ) : (
            conversacion.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.tipo === 'usuario' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  msg.tipo === 'usuario' 
                    ? 'bg-purple-600 text-white' 
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
                Procesando reporte...
              </div>
            </div>
          )}
        </div>

        {/* Reporte enviado */}
        {reporteEnviado && (
          <div className="px-6 py-4 bg-green-50 border-t">
            <h3 className="font-bold text-green-800 mb-2">✅ Reporte Enviado</h3>
            <p className="text-sm text-green-700">
              <strong>Pacientes:</strong> {reporteEnviado.cantidad_pacientes || 1}<br/>
              <strong>Estado:</strong> Pendiente de aprobación<br/>
              <strong>Notificación:</strong> La Dra. Johana ha sido notificada por WhatsApp
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
              placeholder="Ej: Hoy con María García hice profilaxis y restauración en el 16..."
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
              rows={3}
              disabled={cargando}
            />
            <button
              onClick={enviarMensaje}
              disabled={cargando || !mensaje.trim()}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
            >
              {cargando ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportarTratamiento;