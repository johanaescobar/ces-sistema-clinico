// src/components/Layout.jsx
import React, { useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { Menu, X, Home, UserPlus, Calendar, FileText, LayoutDashboard, LogOut, Settings } from 'lucide-react';

const Layout = ({ usuario }) => {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    navigate('/');
  };

  const esDocente = usuario?.rol === 'docente';

  const menuItems = [
    { path: '/inicio', icon: Home, label: 'Inicio', roles: ['docente', 'estudiante'] },
    { path: '/nuevo-paciente', icon: UserPlus, label: 'Nuevo Paciente', roles: ['estudiante'] },
    { path: '/programar-cita', icon: Calendar, label: 'Programar Cita', roles: ['estudiante'] },
    { path: '/reportar', icon: FileText, label: 'Reportar Tratamiento', roles: ['estudiante'] },
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['docente'] },
    { path: '/admin', icon: Settings, label: 'Administración', roles: ['docente'] },
  ];

  const menuFiltrado = menuItems.filter(item => 
    item.roles.includes(usuario?.rol)
  );

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