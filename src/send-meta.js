const axios = require('axios');
const logger = require('./logger');

// MOVER LA VALIDACIÓN DENTRO DE LA FUNCIÓN, NO AL INICIO
// Esto evita que falle al cargar el módulo

async function sendMetaMessage(message = null) {
    // Validar credenciales DENTRO de la función
    const accessToken = process.env.META_ACCESS_TOKEN;
    const phoneNumberId = process.env.META_PHONE_NUMBER_ID;
    const toNumber = process.env.TO_NUMBER;

    if (!accessToken || !phoneNumberId || !toNumber) {
        logger.error('❌ Credenciales de Meta incompletas. Verifica .env');
        throw new Error('Meta credentials missing');
    }

    const cleanToNumber = toNumber.replace('whatsapp:+', '');
    const apiUrl = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

    const textToSend = message || process.env.MESSAGE_TEXT || 'Recordatorio diario';

    const payload = {
        messaging_product: 'whatsapp',
        to: cleanToNumber,
        type: 'text',
        text: {
            body: textToSend
        }
    };

    // Si es un mensaje proactivo (fuera de ventana de 24h), usar template
    const isTemplate = process.env.USE_TEMPLATE === 'true';

    if (isTemplate) {
        payload.type = 'template';
        payload.template = {
            name: 'daily_reminder', // Nombre de plantilla APROBADA
            language: {
                code: 'es_AR'
            }
        };
        delete payload.text;
    }

    try {
        logger.info('📤 Enviando mensaje vía Meta WhatsApp API...');

        const response = await axios.post(apiUrl, payload, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });

        logger.info(`✅ Meta mensaje enviado. ID: ${response.data.messages[0].id}`);

        return {
            success: true,
            messageId: response.data.messages[0].id,
            timestamp: new Date().toISOString(),
            isTemplate: isTemplate
        };
    } catch (error) {
        logger.error('❌ Error Meta WhatsApp API:');

        if (error.response) {
            // Error de la API
            logger.error(`Status: ${error.response.status}`);
            logger.error(`Data: ${JSON.stringify(error.response.data, null, 2)}`);

            // Errores comunes
            if (error.response.data.error?.code === 131030) {
                logger.error('❌ Número no registrado en WhatsApp o inválido');
            } else if (error.response.data.error?.code === 132000) {
                logger.error('❌ Límite de mensajes alcanzado');
            } else if (error.response.data.error?.code === 131026) {
                logger.error('❌ Ventana de 24h cerrada. Usa plantilla aprobada.');
                logger.error('   Configura USE_TEMPLATE=true en .env y crea una plantilla en Meta');
            }
        } else if (error.request) {
            logger.error('❌ No se recibió respuesta del servidor');
        } else {
            logger.error('❌ Error configurando petición:', error.message);
        }

        throw error;
    }
}

// Función de prueba para uso directo
if (require.main === module) {
    sendMetaMessage('Mensaje de prueba desde send-meta.js')
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = sendMetaMessage;