const twilio = require('twilio');
const logger = require('./logger');

async function sendTwilioMessage(message = null) {
  // Validar credenciales dentro de la función
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_SANDBOX_NUMBER;
  const toNumber = process.env.TO_NUMBER;

  if (!accountSid || !authToken) {
    const error = new Error('Credenciales de Twilio no configuradas');
    logger.error('❌ ' + error.message);
    logger.error('   Verifica TWILIO_ACCOUNT_SID y TWILIO_AUTH_TOKEN en Railway Variables');
    throw error;
  }

  if (!fromNumber || !toNumber) {
    const error = new Error('Números no configurados');
    logger.error('❌ ' + error.message);
    logger.error(`   FROM: ${fromNumber || 'NO CONFIGURADO'}`);
    logger.error(`   TO: ${toNumber || 'NO CONFIGURADO'}`);
    throw error;
  }

  const textToSend = message || process.env.MESSAGE_TEXT || 'Recordatorio diario';
  
  try {
    logger.info('📤 Iniciando envío Twilio...');
    logger.info(`   De: ${fromNumber}`);
    logger.info(`   Para: ${toNumber}`);
    
    const client = twilio(accountSid, authToken);
    const result = await client.messages.create({
      body: textToSend,
      from: fromNumber,
      to: toNumber
    });
    
    logger.info(`✅ Twilio mensaje enviado exitosamente`);
    logger.info(`   SID: ${result.sid}`);
    logger.info(`   Estado: ${result.status}`);
    logger.info(`   Hora: ${new Date().toLocaleString('es-AR')}`);
    
    return {
      success: true,
      sid: result.sid,
      status: result.status,
      timestamp: new Date().toISOString(),
      message_preview: textToSend.substring(0, 50) + '...'
    };
  } catch (error) {
    logger.error('❌ Error en Twilio API:');
    logger.error(`   Código: ${error.code || 'N/A'}`);
    logger.error(`   Mensaje: ${error.message}`);
    
    // Manejo específico de errores comunes
    if (error.code === 21608) {
      logger.error('⚠️  SOLUCIÓN REQUERIDA:');
      logger.error('   El número destino no está verificado en el sandbox');
      logger.error('   Pasos para solucionar:');
      logger.error('   1. Desde el WhatsApp de tu novia, enviar mensaje a: +14155238886');
      logger.error('   2. Contenido EXACTO: join learn-discave');
      logger.error('   3. Esperar confirmación: "You\'re ready to send and receive messages!"');
    } else if (error.code === 21211) {
      logger.error('⚠️  Número de teléfono inválido');
      logger.error(`   Verifica TO_NUMBER en Railway Variables`);
      logger.error(`   Formato requerido: whatsapp:+5492991234567`);
    } else if (error.code === 20003) {
      logger.error('⚠️  Error de autenticación Twilio');
      logger.error('   Verifica TWILIO_ACCOUNT_SID y TWILIO_AUTH_TOKEN');
    }
    
    throw error;
  }
}

module.exports = sendTwilioMessage;