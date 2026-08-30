const fs = require('fs');
let code = fs.readFileSync('src/components/manager/DashboardScreen.tsx', 'utf-8');

const target = `              <Scissors className="w-4 h-4" />
              Atendimentos
            </button>
          </div>
        </div>
      )}
        
      {currentView === 'list' && (`;

const replacement = `              <Scissors className="w-4 h-4" />
              Atendimentos
            </button>
          </div>

          {/* Quick Horizontal Date Selector */}
          <div className="mt-5 flex gap-2 overflow-x-auto no-scrollbar pb-2 px-1 scroll-smooth" style={{ scrollSnapType: 'x mandatory' }}>
            {Array.from({ length: 15 }).map((_, i) => {
              const d = addDays(new Date(), i - 3);
              const isSelected = isSameDay(d, currentDate);
              const isTodayDate = isSameDay(d, new Date());
              return (
                <button
                  key={i}
                  onClick={() => setCurrentDate(d)}
                  style={{ scrollSnapAlign: 'center' }}
                  className={\`flex flex-col items-center justify-center min-w-[64px] h-[72px] rounded-2xl transition-all duration-300 border \${
                    isSelected
                      ? 'bg-amber-500 border-amber-500 text-black shadow-lg shadow-amber-500/20 scale-105'
                      : isTodayDate
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                      : 'bg-white/5 border-white/5 text-neutral-400 hover:text-white hover:bg-white/10'
                  }\`}
                >
                  <span className={\`text-[9px] font-black uppercase tracking-widest mb-1 \${isSelected ? 'text-black/70' : isTodayDate ? 'text-amber-500/70' : 'text-neutral-500'}\`}>
                    {format(d, 'eee', { locale: ptBR }).replace('.', '')}
                  </span>
                  <span className="text-lg font-black leading-none">{format(d, 'dd')}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
        
      {currentView === 'list' && (`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/components/manager/DashboardScreen.tsx', code);
  console.log('Success');
} else {
  console.log('Target not found');
}
