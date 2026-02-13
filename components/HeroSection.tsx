import Link from 'next/link';

export default function HeroSection() {
  return (
    <section className="bg-gradient-to-b from-gray-50 to-white py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div>
            <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
              Sistema de agendamento<br />
              de <span className="text-blue-600">Chromebooks</span>
            </h1>
            
            <p className="text-lg text-gray-700 mb-8">
              Bem-vindo ao sistema de agendamento digital. Para garantir que todos 
              os alunos tenham acesso à tecnologia, pedimos que siga as diretrizes 
              abaixo:
            </p>

            <ul className="space-y-5 mb-10">
              <li className="flex items-start bg-white p-3 rounded-lg shadow-sm border-l-4 border-yellow-400">
                <span className="font-bold text-gray-900 mr-2">Antecedência:</span>
                <span className="text-gray-700 text-sm">Realize sua reserva com pelo menos 1 hora de antecedência.</span>
              </li>
              <li className="flex items-start bg-white p-3 rounded-lg shadow-sm border-l-4 border-blue-400">
                <span className="font-bold text-gray-900 mr-2">Conferência:</span>
                <span className="text-gray-700 text-sm">Verifique se todos os aparelhos foram conectados à energia ao final da aula.</span>
              </li>
              <li className="flex items-start bg-white p-3 rounded-lg shadow-sm border-l-4 border-red-400">
                <span className="font-bold text-gray-900 mr-2">Suporte:</span>
                <span className="text-gray-700 text-sm">Relate defeitos imediatamente no campo de observações.</span>
              </li>
            </ul>

            <Link 
              href="/login"
              className="inline-block bg-yellow-400 hover:bg-yellow-500 text-gray-900 px-8 py-3 rounded-lg font-bold text-lg transition"
            >
              Login
            </Link>
          </div>

         {/* Lado Direito: Imagem Única */}
          <div className="relative flex justify-center items-center">
            {/* Elementos Decorativos de fundo */}
            <div className="absolute -top-10 -right-10 w-64 h-64 bg-blue-500 rounded-full opacity-10 blur-3xl"></div>
            <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-yellow-400 rounded-full opacity-10 blur-3xl"></div>
            
            {/* A Imagem Única */}
            <div className="relative z-10 w-full max-w-lg">
              <img 
                src="/images/chromebook.png" 
                alt="Chromebook" 
                className="rounded-3xl shadow-2xl border-8 border-white object-cover w-full h-auto transform hover:rotate-1 transition duration-500"
              />
              
              {/* Badge Flutuante */}
              <div className="absolute -bottom-6 -right-6 bg-white p-4 rounded-2xl shadow-xl hidden md:block">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-bold text-gray-800">Sistema Online</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}