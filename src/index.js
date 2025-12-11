const express = require('express');
const dotenv = require('dotenv');
const logger = require('./logger');

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware básico
app.use(express.json());

// ============================================
// ENDPOINTS DE PRUEBA Y CONTROL
// ============================================

// 1. Health check mejorado
app.get('/health', (req, res) => {
  try {
    const { obtenerProximaEjecucion, obtenerHoras, calcularHoraUTC, CRON_SCHEDULE } = require('./cron');
    const proxima = obtenerProximaEjecucion();
    const horas = obtenerHoras();
    const horaUTC = calcularHoraUTC();
    
    res.status(200).json({
      status: '❤️‍🔥 SISTEMA ACTIVO',
      sistema: 'Recordatorio de pastillas para mi novia',
      configuracion: {
        proveedor: process.env.PROVIDER || 'twilio',
        cron_expression: CRON_SCHEDULE,
        hora_utc_calculada: `${horaUTC.hora}:${horaUTC.minuto.toString().padStart(2, '0')}`,
        hora_neuquen: '21:00'
      },
      tiempo_actual: {
        utc: horas.utc,
        neuquen: horas.neuquen,
        offset: horas.offset
      },
      proximo_envio: {
        utc: proxima.utc,
        neuquen: proxima.neuquen,
        en: `en ${Math.round((new Date(proxima.utc) - new Date()) / (1000 * 60 * 60) * 10) / 10} horas`
      },
      pruebas: {
        send_test: `http://${req.headers.host}/send-test`,
        send_custom: `http://${req.headers.host}/send-custom?mensaje=TEXT`,
        force_21hs: `http://${req.headers.host}/force-21hs`
      }
    });
  } catch (error) {
    res.status(200).json({
      status: '⚠️  ERROR',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 2. Enviar prueba con mensaje aleatorio
app.get('/send-test', async (req, res) => {
  try {
    const { enviarRecordatorio, obtenerHoras } = require('./cron');
    const horas = obtenerHoras();
    
    logger.info('🔄 ENVÍO MANUAL SOLICITADO via /send-test');
    
    const resultado = await enviarRecordatorio();
    
    res.json({ 
      success: true, 
      message: '✅ MENSAJE DE PRUEBA ENVIADO',
      timestamp: new Date().toISOString(),
      detalles: {
        hora_actual_neuquen: horas.neuquen,
        mensaje_tipo: 'aleatorio',
        destino: process.env.TO_NUMBER
      },
      resultado: resultado
    });
  } catch (error) {
    logger.error('❌ ERROR en /send-test:', error.message);
    
    let solucion = 'Error desconocido';
    if (error.message.includes('21608')) {
      solucion = 'El número no está en el sandbox. Enviar "join learn-discave" al +14155238886 desde el WhatsApp de tu novia';
    } else if (error.message.includes('AccountSid')) {
      solucion = 'TWILIO_ACCOUNT_SID incorrecto en Railway Variables';
    } else if (error.message.includes('AuthToken')) {
      solucion = 'TWILIO_AUTH_TOKEN incorrecto en Railway Variables';
    }
    
    res.status(500).json({ 
      success: false, 
      error: error.message,
      solucion: solucion,
      hora_actual: new Date().toLocaleString('es-AR')
    });
  }
});

// 3. Enviar mensaje personalizado (para pruebas)
app.get('/send-custom', async (req, res) => {
  try {
    const { enviarRecordatorio } = require('./cron');
    const mensaje = req.query.mensaje || 'Mensaje personalizado de prueba';
    
    if (!mensaje) {
      return res.status(400).json({ error: 'Falta parámetro "mensaje"' });
    }
    
    logger.info(`📝 ENVÍO PERSONALIZADO: "${mensaje}"`);
    
    const resultado = await enviarRecordatorio(mensaje);
    
    res.json({ 
      success: true, 
      message: '✅ MENSAJE PERSONALIZADO ENVIADO',
      mensaje_enviado: mensaje,
      resultado: resultado
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// 4. Forzar envío como si fueran las 21:00 (para pruebas)
app.get('/force-21hs', async (req, res) => {
  try {
    const { mensajes } = require('./cron');
    const mensaje21hs = mensajes[Math.floor(Math.random() * mensajes.length)];
    
    logger.info('🔔 FORZANDO ENVÍO DE 21:00 (modo prueba)');
    
    const sendTwilio = require('./send-twilio');
    const resultado = await sendTwilio(`[PRUEBA 21:00] ${mensaje21hs}`);
    
    res.json({ 
      success: true, 
      message: '✅ ENVÍO DE 21:00 SIMULADO',
      simulacion: 'Se envió mensaje como si fueran las 21:00',
      mensaje: mensaje21hs,
      nota: 'Esto no afecta el cron programado',
      resultado: resultado
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// 5. Ver mensajes disponibles
app.get('/mensajes', (req, res) => {
  try {
    const { mensajes } = require('./cron');
    res.json({
      total: mensajes.length,
      mensajes: mensajes,
      rotacion: 'aleatoria cada día',
      proximo: '21:00 hora Neuquén'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Ver configuración del cron
app.get('/cron-config', (req, res) => {
  try {
    const { calcularHoraUTC, CRON_SCHEDULE, obtenerProximaEjecucion } = require('./cron');
    const horaUTC = calcularHoraUTC();
    const proxima = obtenerProximaEjecucion();
    
    res.json({
      cron_expression: CRON_SCHEDULE,
      calculo: {
        hora_utc: `${horaUTC.hora}:${horaUTC.minuto.toString().padStart(2, '0')}`,
        hora_neuquen: '21:00',
        proximo_envio_utc: horaUTC.fechaCompleta.toISOString()
      },
      proxima_ejecucion: proxima,
      timezone: {
        servidor: 'UTC',
        destino: 'America/Argentina/Salta (Neuquén)'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 7. Endpoint raíz con interfaz web
app.get('/', (req, res) => {
  const { obtenerProximaEjecucion } = require('./cron');
  const proxima = obtenerProximaEjecucion();
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>💖 Recordatorio de Pastillas</title>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <script>
        function probarEnvio() {
          fetch('/send-test')
            .then(r => r.json())
            .then(data => {
              alert(data.success ? '✅ ' + data.message : '❌ ' + data.error);
            })
            .catch(e => alert('Error: ' + e));
        }
        
        function forzar21hs() {
          fetch('/force-21hs')
            .then(r => r.json())
            .then(data => {
              alert(data.success ? '✅ ' + data.message : '❌ ' + data.error);
            })
            .catch(e => alert('Error: ' + e));
        }
      </script>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 20px;
        }
        .container { 
          background: white; 
          border-radius: 20px;
          padding: 40px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          max-width: 900px;
          width: 100%;
        }
        h1 { 
          color: #e91e63; 
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .status { 
          background: #4CAF50; 
          color: white; 
          padding: 10px 20px; 
          border-radius: 10px;
          display: inline-block;
          margin-bottom: 30px;
          font-weight: bold;
        }
        .info-box { 
          background: #f5f5f5; 
          padding: 20px; 
          border-radius: 10px; 
          margin: 15px 0;
          border-left: 5px solid #e91e63;
        }
        .btn { 
          display: inline-block; 
          background: #e91e63; 
          color: white; 
          padding: 12px 24px; 
          border-radius: 8px; 
          text-decoration: none; 
          margin: 10px 5px;
          font-weight: bold;
          border: none;
          cursor: pointer;
          font-size: 16px;
          transition: transform 0.2s;
        }
        .btn:hover { transform: translateY(-2px); }
        .btn-test { background: #2196F3; }
        .btn-force { background: #FF9800; }
        .endpoints { margin-top: 30px; }
        .endpoint { 
          background: #f0f0f0; 
          padding: 10px; 
          margin: 5px 0; 
          border-radius: 5px;
          font-family: monospace;
        }
        .time-box { 
          background: #e3f2fd; 
          padding: 15px; 
          border-radius: 10px;
          margin: 15px 0;
        }
        .success { color: #4CAF50; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>💖 Recordatorio de Pastillas</h1>
        
        <div class="status">✅ SISTEMA ACTIVO - ENVÍA A LAS 21:00 NEUQUÉN</div>
        
        <div class="info-box">
          <h3>📋 ¿CÓMO FUNCIONA?</h3>
          <p>Este servicio calcula automáticamente la diferencia horaria entre UTC (Railway) y Neuquén, y envía un recordatorio <strong>todos los días a las 21:00 hora local de tu novia</strong>.</p>
          <p class="success">¡Ya no enviará a las 15:00! Se corrigió el problema de timezone.</p>
        </div>
        
        <div class="time-box">
          <h3>⏰ PRÓXIMO ENVÍO PROGRAMADO</h3>
          <p><strong>UTC:</strong> ${proxima.utc}</p>
          <p><strong>Neuquén:</strong> ${proxima.neuquen}</p>
          <p><strong>Faltan:</strong> ${Math.round((new Date(proxima.utc) - new Date()) / (1000 * 60 * 60) * 10) / 10} horas</p>
        </div>
        
        <div style="margin-top: 30px; text-align: center;">
          <button onclick="probarEnvio()" class="btn btn-test">🔔 Probar Envío Ahora</button>
          <button onclick="forzar21hs()" class="btn btn-force">⏰ Simular 21:00</button>
          <a href="/health" class="btn" style="background: #4CAF50;">📊 Ver Estado Detallado</a>
        </div>
        
        <div class="endpoints">
          <h3>🔗 ENDPOINTS DE PRUEBA</h3>
          <div class="endpoint"><a href="/health" target="_blank">/health</a> - Estado completo del sistema</div>
          <div class="endpoint"><a href="/send-test" target="_blank">/send-test</a> - Enviar mensaje de prueba</div>
          <div class="endpoint"><a href="/force-21hs" target="_blank">/force-21hs</a> - Simular envío de 21:00</div>
          <div class="endpoint"><a href="/cron-config" target="_blank">/cron-config</a> - Ver configuración del cron</div>
          <div class="endpoint"><a href="/mensajes" target="_blank">/mensajes</a> - Ver mensajes disponibles</div>
        </div>
        
        <div style="margin-top: 30px; font-size: 14px; color: #666; text-align: center;">
          <p>💡 <strong>PARA PROBAR:</strong> Usa "Probar Envío Ahora" para verificar que Twilio funciona.</p>
          <p>✅ <strong>CONFIRMACIÓN:</strong> Tu novia debería recibir el WhatsApp inmediatamente.</p>
        </div>
      </div>
    </body>
    </html>
  `);
});

// Iniciar servidor
app.listen(PORT, () => {
  logger.info('='.repeat(60));
  logger.info(`💖 SERVICIO DE RECORDATORIO INICIADO`);
  logger.info(`📡 Puerto: ${PORT}`);
  logger.info(`⚙️  Entorno: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`📱 Proveedor: ${process.env.PROVIDER || 'twilio'}`);
  logger.info(`⏰ Sistema: Envío automático a las 21:00 Neuquén`);
  logger.info(`🔗 URL: http://localhost:${PORT}`);
  logger.info('='.repeat(60));
  
  console.log('\n🚀 ¡SISTEMA LISTO PARA PRUEBAS!');
  console.log('👉 Usa estos comandos para verificar:');
  console.log(`   1. Visita: http://localhost:${PORT}/send-test`);
  console.log('   2. Tu novia debería recibir WhatsApp inmediatamente');
  console.log('   3. Luego espera a las 21:00 para confirmar');
  console.log('\n🔧 Si hay problemas, visita /health para diagnóstico\n');
  
  // Iniciar cron job
  require('./cron');
});

// Manejo de errores
process.on('uncaughtException', (error) => {
  logger.error('🚨 UNCAUGHT EXCEPTION:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('🚨 UNHANDLED REJECTION at:', promise, 'reason:', reason);
});