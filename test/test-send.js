const logger = require('../src/logger');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config();

async function testSend() {
  console.log('🧪 Iniciando prueba de envío...\n');
  
  // Verificar variables de entorno
  console.log('📋 Configuración actual:');
  console.log(`   Provider: ${process.env.PROVIDER || 'twilio'}`);
  console.log(`   To: ${process.env.TO_NUMBER || 'NO CONFIGURADO'}`);
  console.log(`   TZ: ${process.env.TZ}`);
  console.log(`   Mensaje: ${process.env.MESSAGE_TEXT?.substring(0, 50)}...\n`);
  
  // Validar config
  if (!process.env.TO_NUMBER) {
    console.error('❌ ERROR: TO_NUMBER no configurado en .env');
    process.exit(1);
  }
  
  try {
    if (process.env.PROVIDER === 'meta') {
      console.log('🔄 Probando Meta WhatsApp API...');
      const sendMeta = require('../src/send-meta');
      await sendMeta('🧪 Este es un mensaje de PRUEBA enviado desde test-send.js');
    } else {
      console.log('🔄 Probando Twilio Sandbox...');
      const sendTwilio = require('../src/send-twilio');
      await sendTwilio('🧪 Este es un mensaje de PRUEBA enviado desde test-send.js');
    }
    
    console.log('\n✅ ¡Prueba exitosa! Revisa el WhatsApp del número destino.');
    
    // Mostrar información adicional
    console.log('\n📝 Notas importantes:');
    console.log('   • Twilio Sandbox: Solo funciona con números verificados');
    console.log('   • Meta API: Puede requerir plantilla aprobada fuera de ventana de 24h');
    console.log('   • Verifica logs en caso de error');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error en prueba:');
    console.error(`   ${error.message}`);
    
    console.log('\n🔧 Solución de problemas:');
    console.log('   1. Verifica las credenciales en .env');
    console.log('   2. Para Twilio: Agrega el número al sandbox');
    console.log('   3. Para Meta: Verifica permisos y access token');
    console.log('   4. Revisa los logs con: tail -f logs/combined.log');
    
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testSend();
}

module.exports = testSend;