const cron = require('node-cron');
const logger = require('./logger');

// ============================================
// SOLUCIÓN DEFINITIVA PARA 21:00 NEUQUÉN
// ============================================
// Railway corre en UTC, necesitamos calcular el offset dinámico
// porque Argentina cambia entre UTC-3 y UTC-2
// ============================================

// Array de mensajes aleatorios para tu novia 💖
const mensajes = [
  "Son las 21:00. ¡Recordatorio de tomar la antibebe! Te amo mucho ❤️",
  "Hora de la pastilla, mi amor. ¡No olvides tomarla! 💕",
  "21:00 - Pastillita time xd 💊. Te amo ❤️",
  "Recordatorio amoroso: pastilla anticonceptiva. ¡Cuídate, te amo!",
  "💖 Mi amor, son las 21:00. ¡Es hora de la antibebe je!",
  "LA PASTILLA, no te olvides, te amo ❤️",
  "⏰ Recordatorio amoroso: pastilla a las 21:00. ¡Te amo!",
];

// ============================================
// FUNCIÓN CLAVE: Calcular hora UTC para 21:00 Neuquén
// ============================================
function calcularHoraUTC() {
  const ahora = new Date();
  
  // Crear fecha para hoy 21:00 Neuquén
  const hoy21Neuquen = new Date(ahora.toLocaleString('en-US', {
    timeZone: 'America/Argentina/Salta'
  }));
  
  hoy21Neuquen.setHours(21, 0, 0, 0);
  
  // Convertir a UTC
  const hoy21UTC = new Date(hoy21Neuquen.toISOString());
  
  // Si ya pasaron las 21:00 hoy, programar para mañana
  const ahoraNeuquen = new Date(ahora.toLocaleString('en-US', {
    timeZone: 'America/Argentina/Salta'
  }));
  
  if (ahoraNeuquen.getHours() >= 21) {
    hoy21UTC.setDate(hoy21UTC.getDate() + 1);
  }
  
  return {
    hora: hoy21UTC.getUTCHours(),
    minuto: hoy21UTC.getUTCMinutes(),
    fechaCompleta: hoy21UTC
  };
}

// ============================================
// CONFIGURACIÓN DINÁMICA
// ============================================
const horaUTC = calcularHoraUTC();
const CRON_SCHEDULE = `${horaUTC.minuto} ${horaUTC.hora} * * *`;

console.log('💖 RECORDATORIO DE PASTILLAS - CONFIGURADO');
console.log('==========================================');
console.log('⚙️  Configuración Dinámica:');
console.log(`   🕒 Hora UTC calculada: ${horaUTC.hora}:${horaUTC.minuto.toString().padStart(2, '0')}`);
console.log(`   🏠 Hora Neuquén: 21:00`);
console.log(`   📅 Próximo envío UTC: ${horaUTC.fechaCompleta.toISOString()}`);
console.log(`   💌 Mensajes: ${mensajes.length} variantes`);
console.log(`   ⚡ Expresión Cron: ${CRON_SCHEDULE}`);
console.log('');

// Función para obtener hora actual en diferentes zonas
function obtenerHoras() {
  const ahora = new Date();
  return {
    utc: ahora.toISOString(),
    neuquen: ahora.toLocaleString('es-AR', { 
      timeZone: 'America/Argentina/Salta',
      hour12: false,
      timeZoneName: 'short'
    }),
    offset: new Date().toLocaleString('en-US', {
      timeZone: 'America/Argentina/Salta',
      timeZoneName: 'long'
    }).split(' ').pop()
  };
}

// Función para enviar recordatorio
async function enviarRecordatorio(mensajeEspecifico = null) {
  const horas = obtenerHoras();
  
  try {
    // Seleccionar mensaje aleatorio o usar el específico
    const mensajeAleatorio = mensajeEspecifico || mensajes[Math.floor(Math.random() * mensajes.length)];
    
    logger.info(`📅 FECHA/HORA ACTUAL:`);
    logger.info(`   UTC: ${horas.utc}`);
    logger.info(`   Neuquén: ${horas.neuquen} (${horas.offset})`);
    logger.info(`💌 MENSAJE: "${mensajeAleatorio}"`);
    
    // Cargar Twilio dinámicamente
    const sendTwilio = require('./send-twilio');
    const resultado = await sendTwilio(mensajeAleatorio);
    
    // Registrar envío exitoso
    logger.info('✅ RECORDATORIO ENVIADO EXITOSAMENTE!');
    logger.info(`   📱 Para: ${process.env.TO_NUMBER}`);
    logger.info(`   ⏰ Hora local destino: 21:00 Neuquén`);
    
    return resultado;
    
  } catch (error) {
    logger.error(`❌ ERROR ENVIANDO RECORDATORIO: ${error.message}`);
    
    // Si es error de sandbox, dar instrucciones claras
    if (error.message.includes('21608') || error.message.includes('not verified')) {
      logger.error('⚠️  SOLUCIÓN REQUERIDA:');
      logger.error('   1. Desde WhatsApp de tu novia, enviar al +14155238886');
      logger.error('   2. Mensaje EXACTO: join learn-discave');
    }
    
    throw error;
  }
}

// ============================================
// CONFIGURACIÓN DEL CRON DINÁMICO
// ============================================
logger.info('⏰ CONFIGURANDO CRON DINÁMICO...');
logger.info(`   Expresión: ${CRON_SCHEDULE}`);
logger.info(`   Significado: Cada día a las ${horaUTC.hora}:${horaUTC.minuto.toString().padStart(2, '0')} UTC`);
logger.info(`   Equivale a: 21:00 Neuquén`);

// Crear y configurar la tarea cron
let task;
try {
  task = cron.schedule(CRON_SCHEDULE, enviarRecordatorio, {
    scheduled: true,
    timezone: 'UTC'
  });
  
  logger.info('✅ CRON PROGRAMADO CORRECTAMENTE');
} catch (error) {
  logger.error(`❌ ERROR PROGRAMANDO CRON: ${error.message}`);
  // Fallback a hora fija si hay error
  task = cron.schedule('0 0 * * *', enviarRecordatorio, {
    scheduled: true,
    timezone: 'UTC'
  });
  logger.info('⚠️  Usando configuración de fallback: 00:00 UTC');
}

// Función para calcular próxima ejecución
function obtenerProximaEjecucion() {
  if (task && typeof task.nextDate === 'function') {
    const proxima = task.nextDate();
    return {
      utc: proxima.toISOString(),
      neuquen: new Date(proxima.getTime()).toLocaleString('es-AR', {
        timeZone: 'America/Argentina/Salta',
        hour12: false
      }),
      metodo: 'task.nextDate()'
    };
  } else {
    // Fallback: calcular manualmente
    const ahora = new Date();
    const proxima = new Date(horaUTC.fechaCompleta);
    
    if (ahora >= proxima) {
      proxima.setDate(proxima.getDate() + 1);
    }
    
    return {
      utc: proxima.toISOString(),
      neuquen: proxima.toLocaleString('es-AR', {
        timeZone: 'America/Argentina/Salta',
        hour12: false
      }),
      metodo: 'cálculo manual'
    };
  }
}

// Mostrar información de programación
const proxima = obtenerProximaEjecucion();
logger.info('========================================');
logger.info('📅 PRÓXIMO ENVÍO PROGRAMADO:');
logger.info(`   UTC: ${proxima.utc}`);
logger.info(`   Neuquén: ${proxima.neuquen}`);
logger.info(`   Método: ${proxima.metodo}`);
logger.info('========================================');

// ============================================
// MODO PRUEBA: Enviar mensaje de prueba si está activado
// ============================================
if (process.env.ENVIAR_PRUEBA_INICIAL === 'true') {
  setTimeout(async () => {
    try {
      logger.info('🧪 ENVIANDO MENSAJE DE PRUEBA INICIAL...');
      await enviarRecordatorio('🔔 PRUEBA: Este es un mensaje de prueba del sistema de recordatorios. Si funciona, recibirás este mensaje todos los días a las 21:00. ¡Te amo! ❤️');
      logger.info('✅ PRUEBA COMPLETADA. TODO LISTO!');
    } catch (error) {
      logger.error('⚠️  ERROR EN PRUEBA INICIAL. VERIFICA CONFIGURACIÓN.');
    }
  }, 5000);
}

// ============================================
// EXPORTACIONES
// ============================================
module.exports = {
  task,
  enviarRecordatorio,
  obtenerProximaEjecucion,
  obtenerHoras,
  mensajes,
  calcularHoraUTC,
  CRON_SCHEDULE
};