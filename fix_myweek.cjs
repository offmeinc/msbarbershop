const fs = require('fs');

let code = fs.readFileSync('src/components/manager/MyWeekScreen.tsx', 'utf8');

code = code.replace(
  '          onSuccess={(app, status, data) => {\n            if (onUpdateStatus) onUpdateStatus(app, status, data);\n            setCheckoutAppointment(null);\n          }}',
  '          isOpen={true}\n          onSuccess={() => {\n            setCheckoutAppointment(null);\n          }}'
);

code = code.replace(
  '          onConfirm={(app, status, data) => {\n            if (onUpdateStatus) onUpdateStatus(app, status, data);\n            setNoShowAppointment(null);\n          }}',
  '          isOpen={true}\n          onSuccess={() => {\n            setNoShowAppointment(null);\n          }}'
);

fs.writeFileSync('src/components/manager/MyWeekScreen.tsx', code);
console.log('Fixed MyWeekScreen.tsx');
