type CalendarContent = {
  month: string;
  weekDays: string[];
  bookings: Array<{
    teacher: string;
    classGroup: string;
    time: string;
    tone: 'blue-500' | 'blue-300' | 'pink-500';
  }>;
  title: string;
  description: string;
  activeTeachers: string;
  activeTeachersHighlight: string;
  activeTeacherTitle: string;
  previousMonthLabel: string;
  nextMonthLabel: string;
};

type CalendarSectionProps = {
  content: CalendarContent;
};

const toneMap = {
  'blue-500': {
    border: 'border-blue-500',
    background: 'bg-blue-100',
    title: 'text-blue-900',
    time: 'text-blue-700',
  },
  'blue-300': {
    border: 'border-blue-300',
    background: 'bg-blue-50',
    title: 'text-blue-900',
    time: 'text-blue-700',
  },
  'pink-500': {
    border: 'border-pink-500',
    background: 'bg-pink-100',
    title: 'text-pink-900',
    time: 'text-pink-700',
  },
} as const;

export default function CalendarSection({ content }: CalendarSectionProps) {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <div className="rounded-3xl border-4 border-blue-400 bg-white p-8 shadow-2xl">
            <div className="mb-6 flex gap-2">
              <div className="h-3 w-3 rounded-full bg-red-400"></div>
              <div className="h-3 w-3 rounded-full bg-yellow-400"></div>
              <div className="h-3 w-3 rounded-full bg-green-400"></div>
            </div>

            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-bold">{content.month}</h3>
              <div className="flex gap-4">
                <button type="button" className="text-gray-400 hover:text-gray-600" aria-label={content.previousMonthLabel}>
                  ←
                </button>
                <button type="button" className="text-gray-400 hover:text-gray-600" aria-label={content.nextMonthLabel}>
                  →
                </button>
              </div>
            </div>

            <div className="mb-4 grid grid-cols-7 gap-2">
              {content.weekDays.map((day) => (
                <div key={day} className="text-center text-sm text-gray-500">
                  {day}
                </div>
              ))}
            </div>

            <div className="mb-6 grid grid-cols-7 gap-2">
              {[16, 17, 18, 19, 20, 21, 22].map((day) => (
                <div
                  key={day}
                  className={`cursor-pointer rounded-lg p-3 text-center ${
                    day === 19 ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="relative mb-4 border-l-2 border-red-400 pl-4">
              <span className="text-sm text-gray-500">08:43</span>
              <div className="absolute top-2 left-0 -ml-1.5 h-3 w-3 rounded-full bg-red-400"></div>
            </div>

            <div className="space-y-4">
              {content.bookings.map((booking) => {
                const tone = toneMap[booking.tone];

                return (
                  <div
                    key={`${booking.teacher}-${booking.classGroup}`}
                    className={`rounded-lg border-l-4 p-4 ${tone.border} ${tone.background}`}
                  >
                    <p className={`text-sm font-semibold ${tone.title}`}>
                      {booking.teacher} - {booking.classGroup}
                    </p>
                    <p className={`text-xs ${tone.time}`}>{booking.time}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h2 className="mb-6 text-4xl leading-tight font-black tracking-tight text-gray-900">{content.title}</h2>

            <p className="text-lg leading-relaxed text-gray-700">{content.description}</p>

            <div className="mt-6 flex items-center gap-4">
              <div className="flex -space-x-3">
                {[
                  { inicial: 'AC', cor: 'bg-blue-500' },
                  { inicial: 'JV', cor: 'bg-green-500' },
                  { inicial: 'MS', cor: 'bg-purple-500' },
                  { inicial: 'RP', cor: 'bg-orange-500' },
                ].map((prof) => (
                  <div
                    key={prof.inicial}
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 border-white ${prof.cor} shadow-sm`}
                    title={content.activeTeacherTitle}
                  >
                    <span className="text-[10px] font-bold uppercase text-white">{prof.inicial}</span>
                  </div>
                ))}

                <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-gray-800 shadow-sm">
                  <span className="text-[10px] font-bold text-white">+15</span>
                </div>
              </div>

              <p className="text-sm font-medium text-gray-600">
                {content.activeTeachers}
                <br />
                <span className="font-bold text-blue-600">{content.activeTeachersHighlight}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
