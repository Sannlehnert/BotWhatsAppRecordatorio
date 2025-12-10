const cron = require('node-cron');
const logger = require('./logger');

// Timezone para Neuquén
const timezone = process.env.TZ || 'America/Argentina/Buenos_Aires';

// Array de mensajes aleatorios para tu novia 💖
const mensajes = [
  "Son las 21:00. ¡Recordatorio de tomar la antibebe! Te amo mucho ❤️",
  "Hora de la pastilla, mi amor. ¡No olvides tomarla! 💕",
  "21:00 - Pastillita time xd 💊. Te amo ❤️",
  "Son las 21:00, no olvides tu pastilla, hermosa je",
  "PASTILLA ALERTA 🚨: Son las 21:00. Te amo mucho ❤️",
  "NENA, son las 21:00. ¡Toma tu pastilla! Te amooo 💖",
  "La antibebe te está esperando, amor. Son las 21:00 💊❤️",
];

console.log('💖 RECORDATORIO DE PASTILLAS CONFIGURADO');
console.log('========================================');
console.log(`⏰ Hora: 21:00 (${timezone})`);
console.log(`💌 Mensajes: ${mensajes.length} variantes`);
console.log('');

// Función para enviar recordatorio
async function enviarRecordatorio() {
  try {
    const mensajeAleatorio = mensajes[Math.floor(Math.random() * mensajes.length)];
    const ahora = new Date().toLocaleString('es-AR', { timeZone: timezone });
    
    logger.info(`${ahora} - 💌 Enviando recordatorio...`);
    logger.info(`Mensaje: "${mensajeAleatorio}"`);
    
    // Cargar Twilio dinámicamente
    const sendTwilio = require('./send-twilio');
    const resultado = await sendTwilio(mensajeAleatorio);
    
    logger.info('✅ Recordatorio enviado exitosamente!');
    return resultado;
    
  } catch (error) {
    logger.error(`❌ Error enviando recordatorio: ${error.message}`);
    
    // Si es error de sandbox, dar instrucciones claras
    if (error.message.includes('21608') || error.message.includes('not verified')) {
      logger.error('⚠️  SOLUCIÓN: El número no está en el sandbox');
      logger.error('   1. Desde WhatsApp de tu novia, enviar al +14155238886:');
      logger.error('   2. El mensaje EXACTO: join learn-discave');
    }
    
    throw error;
  }
}

// Crear y configurar la tarea cron (21:00 todos los días)
const task = cron.schedule('0 21 * * *', enviarRecordatorio, {
  scheduled: true,
  timezone: timezone
});

// Calcular próxima ejecución manualmente (SIN usar task.nextDate)
function obtenerProximaEjecucion() {
  const ahora = new Date();
  const hoy21hs = new Date(ahora);
  
  // Configurar para hoy 21:00 en la zona horaria correcta
  hoy21hs.setUTCHours(21 - (new Date().getTimezoneOffset() / 60), 0, 0, 0);
  
  // Si ya pasó las 21:00, programar para mañana
  if (ahora >= hoy21hs) {
    hoy21hs.setDate(hoy21hs.getDate() + 1);
  }
  
  return hoy21hs;
}

// Mostrar información de programación
const proxima = obtenerProximaEjecucion();
logger.info(`⏰ Recordatorio programado: 21:00 (${timezone})`);
logger.info(`📅 Próximo envío: ${proxima.toLocaleString('es-AR', { timeZone: timezone })}`);

// Enviar mensaje de prueba al inicio (opcional)
setTimeout(async () => {
  try {
    logger.info('🧪 Enviando mensaje de prueba inicial...');
    await enviarRecordatorio();
    logger.info('✅ Prueba completada. Todo listo!');
  } catch (error) {
    logger.error('⚠️  Error en prueba inicial. Verifica configuración.');
  }
}, 2000);

// Exportar funciones para uso manual
module.exports = {
  task,
  enviarRecordatorio,
  obtenerProximaEjecucion,
  mensajes
};