const cron = require('node-cron');
const logger = require('./logger');

// ============================================
// CONFIGURACIÓN DE TIEMPO - FIX PARA RAILWAY
// ============================================
// Railway corre en UTC, Neuquén es UTC-3 (UTC-2 en verano)
// 21:00 Neuquén = 00:00 UTC (ó 23:00 UTC en invierno)
// ============================================

// HORA EN UTC QUE CORRESPONDE A 21:00 NEUQUÉN
const HORA_UTC_PARA_21_NEUQUEN = '00'; // 00:00 UTC = 21:00 Neuquén (verano)
// Si es invierno (cuando Neuquén está en UTC-3), sería '00' también
// 21:00 Neuquén (UTC-3) = 00:00 UTC del día siguiente

// Array de mensajes aleatorios para tu novia 💖
const mensajes = [
  "Son las 21:00. ¡Recordatorio de tomar la antibebe! Te amo mucho ❤️",
  "Hora de la pastilla, mi amor. ¡No olvides tomarla! 💕",
  "21:00 - Pastillita time 💊. Te amo ❤️",
  "Recordatorio amoroso: pastilla anticonceptiva. ¡Cuídate, te amo! 😘",
  "💖 Mi amor, son las 21:00. ¡Es hora de tu pastilla anticonceptiva!",
  "¡Hora de la pastilla, mi vida! No te olvides, te amo ❤️",
  "⏰ Recordatorio amoroso: pastilla a las 21:00. ¡Te amo!",
  "💕 Mi reina, hora de tomar tu pastilla. ¡Te cuidas por nosotros!",
  "❤️‍🔥 Amor, son las 9PM. ¡Pastilla time! Cuídate por favor",
  "⭐️ Para la mujer más importante: ¡Recordatorio de pastilla a las 21:00!"
];

console.log('💖 RECORDATORIO DE PASTILLAS - CONFIGURADO');
console.log('==========================================');
console.log('⚙️  Configuración Temporal:');
console.log(`   🕒 Hora UTC programada: ${HORA_UTC_PARA_21_NEUQUEN}:00`);
console.log(`   🏠 Hora Neuquén: 21:00`);
console.log(`   💌 Mensajes: ${mensajes.length} variantes`);
console.log('');

// Función para obtener la hora actual en diferentes zonas
function obtenerHoras() {
  const ahora = new Date();
  return {
    utc: ahora.toISOString(),
    neuquen: ahora.toLocaleString('es-AR', { 
      timeZone: 'America/Argentina/Salta',
      hour12: false 
    }),
    local: ahora.toLocaleString('es-AR')
  };
}

// Función para enviar recordatorio
async function enviarRecordatorio() {
  const horas = obtenerHoras();
  
  try {
    // Seleccionar mensaje aleatorio
    const mensajeAleatorio = mensajes[Math.floor(Math.random() * mensajes.length)];
    
    logger.info(`📅 Fecha/hora actual:`);
    logger.info(`   UTC: ${horas.utc}`);
    logger.info(`   Neuquén: ${horas.neuquen}`);
    logger.info(`   Server: ${horas.local}`);
    logger.info(`💌 Enviando: "${mensajeAleatorio}"`);
    
    // Cargar Twilio dinámicamente
    const sendTwilio = require('./send-twilio');
    const resultado = await sendTwilio(mensajeAleatorio);
    
    // Registrar envío exitoso
    logger.info('✅ Recordatorio enviado exitosamente!');
    logger.info(`   📱 Para: ${process.env.TO_NUMBER}`);
    
    return resultado;
    
  } catch (error) {
    logger.error(`❌ Error enviando recordatorio: ${error.message}`);
    
    // Si es error de sandbox, dar instrucciones claras
    if (error.message.includes('21608') || error.message.includes('not verified')) {
      logger.error('⚠️  SOLUCIÓN: El número no está en el sandbox');
      logger.error('   1. Desde WhatsApp de tu novia, enviar al +14155238886:');
      logger.error('   2. El mensaje EXACTO: join learn-discave');
    }
    
    // Registrar error
    const fs = require('fs').promises;
    try {
      await fs.appendFile('logs/errores.log', 
        `${new Date().toISOString()} - ERROR: ${error.message}\n`
      );
    } catch (e) {
      // Ignorar error de escritura
    }
    
    throw error;
  }
}

// ============================================
// CONFIGURACIÓN DEL CRON
// ============================================
// Programar para 00:00 UTC (21:00 Neuquén) TODOS LOS DÍAS
// Formato: segundo minuto hora día-del-mes mes día-de-la-semana
// '0 0 * * *' = cada día a las 00:00 UTC
// ============================================

const cronSchedule = `0 ${HORA_UTC_PARA_21_NEUQUEN} * * *`; // 00:00 UTC

console.log('⏰ CONFIGURACIÓN CRON:');
console.log(`   Expresión: ${cronSchedule}`);
console.log(`   Significado: Cada día a las ${HORA_UTC_PARA_21_NEUQUEN}:00 UTC`);
console.log(`   Equivale a: 21:00 Neuquén (hora local de tu novia)`);

// Crear y configurar la tarea cron
const task = cron.schedule(cronSchedule, enviarRecordatorio, {
  scheduled: true,
  timezone: 'UTC' // IMPORTANTE: Railway corre en UTC
});

// Función para calcular próxima ejecución
function obtenerProximaEjecucion() {
  const ahora = new Date();
  const proxima = new Date(ahora);
  
  // Configurar para hoy a las 00:00 UTC
  proxima.setUTCHours(HORA_UTC_PARA_21_NEUQUEN, 0, 0, 0);
  
  // Si ya pasó esa hora hoy, programar para mañana
  if (ahora >= proxima) {
    proxima.setUTCDate(proxima.getUTCDate() + 1);
  }
  
  return {
    utc: proxima.toISOString(),
    neuquen: proxima.toLocaleString('es-AR', { 
      timeZone: 'America/Argentina/Salta',
      timeZoneName: 'short'
    })
  };
}

// Mostrar información de programación
const proxima = obtenerProximaEjecucion();
logger.info('========================================');
logger.info('⏰ RECORDATORIO PROGRAMADO CORRECTAMENTE');
logger.info(`   Próximo envío UTC: ${proxima.utc}`);
logger.info(`   Hora Neuquén: ${proxima.neuquen}`);
logger.info('========================================');

// Enviar mensaje de prueba al inicio SOLO SI ES HORA DE PRUEBA
// (no enviar automáticamente en producción)
if (process.env.NODE_ENV !== 'production') {
  setTimeout(async () => {
    try {
      logger.info('🧪 Enviando mensaje de prueba inicial...');
      await enviarRecordatorio();
      logger.info('✅ Prueba completada. Todo listo!');
    } catch (error) {
      logger.error('⚠️  Error en prueba inicial. Verifica configuración.');
    }
  }, 3000);
} else {
  logger.info('🚀 Modo producción - Sin prueba automática');
}

// Exportar funciones para uso manual
module.exports = {
  task,
  enviarRecordatorio,
  obtenerProximaEjecucion,
  mensajes,
  obtenerHoras
};