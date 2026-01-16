// src/components/Login.jsx
import React, { useState, useEffect } from 'react';
import { Mail } from 'lucide-react';
import { API_ENDPOINTS } from '../config/api';

// ============================================================
// MODO DESARROLLO: true = sin WAHA, false = producción con WAHA
// Cuando WAHA funcione, cambiar a false
const MODO_DEV = false;
const CODIGOS_DEV = {
  'jescobarp@ces.edu.co': '111111',  // Johana
  'jgaitan@uces.edu.co': '222222'    // Prueba
};
// ============================================================

const Login = ({ onLoginSuccess }) => {
  const [paso, setPaso] = useState(1); // 1: correo, 2: código
  const [correo, setCorreo] = useState('');
  const [codigo, setCodigo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tiempoRestante, setTiempoRestante] = useState(0);

  // Timer para código (60 segundos)
  useEffect(() => {
    if (tiempoRestante > 0) {
      const timer = setTimeout(() => setTiempoRestante(tiempoRestante - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [tiempoRestante]);

  const solicitarCodigo = async (e) => {
    e.preventDefault();
    setError('');

    // Aceptar @ces.edu.co (docentes) y @uces.edu.co (estudiantes)
    if (!correo.endsWith('@ces.edu.co') && !correo.endsWith('@uces.edu.co')) {
      setError('El correo debe ser @ces.edu.co o @uces.edu.co');
      return;
    }

    // === MODO DESARROLLO ===
    if (MODO_DEV && CODIGOS_DEV[correo.toLowerCase()]) {
      setPaso(2);
      setTiempoRestante(9999);
      return;
    }
    // === FIN MODO DESARROLLO ===

    setLoading(true);

    try {
      const response = await fetch(API_ENDPOINTS.AUTH_SOLICITAR_CODIGO, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'solicitar_codigo',
          correo: correo.toLowerCase()
        })
      });

      const data = await response.json();

      if (data.ok) {
        setPaso(2);
        setTiempoRestante(60);
      } else {
        setError(data.error || data.mensaje || 'Usuario no encontrado');
      }
    } catch (err) {
      setError('Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const validarCodigo = async (e) => {
    e.preventDefault();
    setError('');

    if (codigo.length !== 6) {
      setError('El código debe tener 6 dígitos');
      return;
    }

    // === MODO DESARROLLO ===
    if (MODO_DEV && CODIGOS_DEV[correo.toLowerCase()] === codigo) {
      const usuarioDev = {
        correo: correo.toLowerCase(),
        nombre_completo: correo.includes('jescobarp') ? 'Johana Escobar' : 'Usuario Prueba',
        rol: correo.includes('jescobarp') ? 'docente' : 'estudiante'
      };
      sessionStorage.setItem('token', 'dev-token-' + Date.now());
      sessionStorage.setItem('usuario', JSON.stringify(usuarioDev));
      sessionStorage.setItem('ultimaActividad', Date.now().toString());
      onLoginSuccess(usuarioDev);
      return;
    }
    if (MODO_DEV && CODIGOS_DEV[correo.toLowerCase()] && CODIGOS_DEV[correo.toLowerCase()] !== codigo) {
      setError('Código incorrecto. Usa: ' + CODIGOS_DEV[correo.toLowerCase()]);
      return;
    }
    // === FIN MODO DESARROLLO ===

    setLoading(true);

    try {
      const response = await fetch(API_ENDPOINTS.AUTH_VALIDAR_CODIGO, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'validar_codigo',
          correo: correo.toLowerCase(),
          codigo: codigo
        })
      });

      const data = await response.json();

      if (data.ok) {
        sessionStorage.setItem('token', data.token);
        sessionStorage.setItem('usuario', JSON.stringify(data.usuario || { correo }));
        sessionStorage.setItem('ultimaActividad', Date.now().toString());
        onLoginSuccess(data.usuario || { correo });
      } else {
        setError(data.error || 'Código inválido');
      }
    } catch (err) {
      setError('Error al validar código');
    } finally {
      setLoading(false);
    }
  };

  const reenviarCodigo = () => {
    setPaso(1);
    setCodigo('');
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <img src="/logo-pagina.png" alt="CES" className="w-16 h-16 mx-auto mb-4 rounded-full" />
          <h1 className="text-2xl font-bold text-gray-900">Sistema Clínico CES</h1>
          <p className="text-gray-600 mt-2">Dra. Johana Escobar</p>
        </div>

        {/* Banner modo desarrollo */}
        {MODO_DEV && (
          <div className="bg-yellow-50 border border-yellow-300 text-yellow-800 px-3 py-2 rounded-lg text-xs mb-4">
            ⚠️ MODO DESARROLLO - Códigos: Johana=111111, Prueba=222222
          </div>
        )}

        {/* Paso 1: Ingresar correo */}
        {paso === 1 && (
          <form onSubmit={solicitarCodigo} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Correo Institucional
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  placeholder="usuario@ces.edu.co"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Enviando...' : 'Enviar código por WhatsApp'}
            </button>
          </form>
        )}

        {/* Paso 2: Ingresar código */}
        {paso === 2 && (
          <form onSubmit={validarCodigo} className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800">
                {MODO_DEV ? '🔧 Modo desarrollo activo' : '📱 Se envió un código de 6 dígitos a tu WhatsApp'}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                {MODO_DEV ? 'Usa el código de prueba' : `Válido por ${tiempoRestante} segundos`}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Código de verificación
              </label>
              <input
                type="text"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-2xl font-mono tracking-widest focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={loading}
                autoFocus
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || codigo.length !== 6}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Verificando...' : 'Verificar código'}
            </button>

            <button
              type="button"
              onClick={reenviarCodigo}
              className="w-full text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Volver
            </button>
          </form>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-500">
          <p>Universidad CES - Facultad de Odontología</p>
          <p className="mt-1">Sistema seguro con autenticación 2FA</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
