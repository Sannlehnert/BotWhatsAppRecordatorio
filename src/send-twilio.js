const twilio = require('twilio');
const logger = require('./logger');

// Validar credenciales DENTRO de la función, no al inicio
async function sendTwilioMessage(message = null) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_SANDBOX_NUMBER;
    const toNumber = process.env.TO_NUMBER;

    if (!accountSid || !authToken || !fromNumber || !toNumber) {
        logger.error('❌ Credenciales de Twilio incompletas. Verifica .env');
        throw new Error('Twilio credentials missing');
    }

    // Inicializar cliente
    const client = twilio(accountSid, authToken);

    const textToSend = message || process.env.MESSAGE_TEXT || 'Recordatorio diario';

    try {
        logger.info('📤 Enviando mensaje vía Twilio Sandbox...');

        const result = await client.messages.create({
            body: textToSend,
            from: fromNumber,
            to: toNumber
        });

        logger.info(`✅ Twilio mensaje enviado. SID: ${result.sid}`);

        return {
            success: true,
            sid: result.sid,
            status: result.status,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        logger.error('❌ Error Twilio:', error.message);

        // Manejo específico de errores comunes
        if (error.code === 21211) {
            logger.error('Número de teléfono inválido. Verifica TO_NUMBER en .env');
        } else if (error.code === 21608) {
            logger.error('Número no verificado en Twilio Sandbox. Agrega este número al sandbox.');
        } else if (error.code === 21614) {
            logger.error('Número de WhatsApp no válido. Formato requerido: whatsapp:+549XXXXXXXX');
        }

        throw error;
    }
}

// Función de prueba para uso directo
if (require.main === module) {
    sendTwilioMessage('Mensaje de prueba desde send-twilio.js')
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = sendTwilioMessage;