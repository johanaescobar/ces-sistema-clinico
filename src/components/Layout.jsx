// src/components/Layout.jsx
import React, { useState, useEffect } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Menu, X, Home, UserPlus, Calendar, FileText, LayoutDashboard, LogOut, Settings, CheckCircle, Users } from 'lucide-react';

const Layout = ({ usuario }) => {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);
  const [contador, setContador] = useState(5);

  const handleLogout = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('usuario');
    sessionStorage.removeItem('ultimaActividad');
    setCerrandoSesion(true);
  };

  useEffect(() => {
    if (cerrandoSesion && contador > 0) {
      const timer = setTimeout(() => setContador(contador - 1), 1000);
      return () => clearTimeout(timer);
    }
    if (cerrandoSesion && contador === 0) {
      window.location.href = 'https://www.google.com';
    }
  }, [cerrandoSesion, contador]);

  const esDocente = usuario?.rol === 'docente';

  const menuItems = [
    { path: '/inicio', icon: Home, label: 'Inicio', roles: ['docente', 'estudiante'] },
    { path: '/nuevo-paciente', icon: UserPlus, label: 'Nuevo Paciente', roles: ['estudiante'] },
    { path: '/programar-cita', icon: Calendar, label: 'Programar Cita', roles: ['estudiante'] },
    { path: '/reportar', icon: FileText, label: 'Reportar Tratamiento', roles: ['estudiante'] },
    { path: '/mis-pacientes', icon: Users, label: 'Mis Pacientes', roles: ['estudiante'] },
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['docente'] },
    { path: '/admin', icon: Settings, label: 'Administración', roles: ['docente'] },
  ];

  const menuFiltrado = menuItems.filter(item => 
    item.roles.includes(usuario?.rol)
  );

  // Pantalla de sesión cerrada
  if (cerrandoSesion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Sesión cerrada</h1>
          <p className="text-gray-600 mb-4">¡Hasta pronto, {usuario?.nombre_completo?.split(' ')[0] || 'Usuario'}!</p>
          <p className="text-sm text-gray-500">
            Redirigiendo en <span className="font-bold text-blue-600">{contador}</span> segundos...
          </p>
          <div className="mt-6">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-1000"
                style={{ width: `${(5 - contador) * 20}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo y título */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold text-xl">CES</span>
              </div>
              <div>
                <h1 className="text-xl font-bold">Sistema Clínico</h1>
                <p className="text-xs text-blue-100">Dra. Johana Escobar</p>
              </div>
            </div>

            {/* Usuario y menú móvil */}
            <div className="flex items-center space-x-4">
              <div className="hidden md:block text-right">
                <p className="text-sm font-medium">{usuario?.nombre_completo}</p>
                <p className="text-xs text-blue-100">{esDocente ? 'Docente' : 'Estudiante'}</p>
              </div>
              
              <button
                onClick={() => setMenuAbierto(!menuAbierto)}
                className="md:hidden p-2 hover:bg-blue-700 rounded-lg transition"
              >
                {menuAbierto ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar desktop */}
        <aside className="hidden md:flex md:flex-col md:w-64 bg-white shadow-lg min-h-screen">
          <nav className="flex-1 px-4 py-6 space-y-2">
            {menuFiltrado.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition"
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          <div className="px-4 py-4 border-t">
            <button
              onClick={handleLogout}
              className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-red-50 hover:text-red-600 transition w-full"
            >
              <LogOut size={20} />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </aside>

        {/* Menú móvil */}
        {menuAbierto && (
          <div className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-50">
            <div className="bg-white w-64 h-full shadow-lg">
              <div className="px-4 py-6">
                <div className="mb-6">
                  <p className="text-sm font-medium">{usuario?.nombre_completo}</p>
                  <p className="text-xs text-gray-500">{esDocente ? 'Docente' : 'Estudiante'}</p>
                </div>

                <nav className="space-y-2">
                  {menuFiltrado.map(item => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMenuAbierto(false)}
                      className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition"
                    >
                      <item.icon size={20} />
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </nav>

                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-red-50 hover:text-red-600 transition w-full mt-6"
                >
                  <LogOut size={20} />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Contenido principal */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
