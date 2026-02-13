export default function CalendarSection() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left - Calendar Preview */}
          <div className="bg-white rounded-3xl shadow-2xl border-4 border-blue-400 p-8">
            {/* Browser Bar */}
            <div className="flex gap-2 mb-6">
              <div className="w-3 h-3 rounded-full bg-red-400"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
              <div className="w-3 h-3 rounded-full bg-green-400"></div>
            </div>

            {/* Calendar Header */}
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">janeiro 2026</h3>
              <div className="flex gap-4">
                <button className="text-gray-400 hover:text-gray-600">←</button>
                <button className="text-gray-400 hover:text-gray-600">→</button>
              </div>
            </div>

            {/* Week Days */}
            <div className="grid grid-cols-7 gap-2 mb-4">
              {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(day => (
                <div key={day} className="text-center text-sm text-gray-500">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-2 mb-6">
              {[16, 17, 18, 19, 20, 21, 22].map(day => (
                <div 
                  key={day}
                  className={`
                    text-center p-3 rounded-lg cursor-pointer
                    ${day === 19 ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}
                  `}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Time Indicator */}
            <div className="relative border-l-2 border-red-400 pl-4 mb-4">
              <span className="text-sm text-gray-500">08:43</span>
              <div className="absolute left-0 top-2 w-3 h-3 bg-red-400 rounded-full -ml-1.5"></div>
            </div>

            {/* Bookings */}
            <div className="space-y-4">
              <div className="bg-blue-100 border-l-4 border-blue-500 p-4 rounded-lg">
                <p className="font-semibold text-sm text-blue-900">Professora Claudia - 2 ano A</p>
                <p className="text-xs text-blue-700">09:00 - 10:00</p>
              </div>
              
              <div className="bg-blue-50 border-l-4 border-blue-300 p-4 rounded-lg">
                <p className="font-semibold text-sm text-blue-900">Professora Vanessa - 5 ano C</p>
                <p className="text-xs text-blue-700">09:00 - 10:00</p>
              </div>

              <div className="bg-pink-100 border-l-4 border-pink-500 p-4 rounded-lg">
                <p className="font-semibold text-sm text-pink-900">Professora Rita - 7 ano B</p>
                <p className="text-xs text-pink-700">11:00 - 12:00</p>
              </div>
            </div>
          </div>

          {/* Right - Description */}
          <div>
           <h2 className="text-4xl font-black text-gray-900 mb-6 tracking-tight leading-tight">
              Controle total dos seus agendamentos
            </h2>
            
            <p className="text-lg text-gray-700 leading-relaxed">
              Nossa interface permite que você visualize todos os horários ocupados 
              e disponíveis de forma clara. Veja rapidamente quais colegas já reservaram 
              os Chromebooks, o horário exato e para qual turma, evitando conflitos de 
              agenda e facilitando o planejamento da sua semana.
            </p>
            <div className="flex gap-4 items-center">
                <div className="flex -space-x-3">
                    {[
                    { inicial: "AC", cor: "bg-blue-500" },
                    { inicial: "JV", cor: "bg-green-500" },
                    { inicial: "MS", cor: "bg-purple-500" },
                    { inicial: "RP", cor: "bg-orange-500" },
                    ].map((prof, i) => (
                    <div 
                        key={i} 
                        className={`w-10 h-10 rounded-full border-2 border-white ${prof.cor} flex items-center justify-center shadow-sm`}
                        title="Professor Ativo"
                    >
                        <span className="text-[10px] font-bold text-white uppercase">
                        {prof.inicial}
                        </span>
                    </div>
                    ))}
                    {/* Círculo de "+ Mais" */}
                    <div className="w-10 h-10 rounded-full border-2 border-white bg-gray-800 flex items-center justify-center shadow-sm">
                    <span className="text-[10px] font-bold text-white">+15</span>
                    </div>
                </div>
                
                <p className="text-sm text-gray-600 font-medium">
                    Professores da rede já <br />
                    <span className="text-blue-600 font-bold">estão agendando.</span>
                </p>
                </div>
          </div>
        </div>
      </div>
    </section>
  );
}