const express = require('express');
const dotenv = require('dotenv');
const logger = require('./logger');

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware básico
app.use(express.json());

// Health check endpoint MEJORADO
app.get('/health', (req, res) => {
  try {
    const { obtenerProximaEjecucion, obtenerHoras } = require('./cron');
    const proxima = obtenerProximaEjecucion();
    const horas = obtenerHoras();
    
    res.status(200).json({
      status: '❤️‍🔥 FUNCIONANDO',
      sistema: 'Recordatorio de pastillas para mi novia',
      tiempo: {
        utc: horas.utc,
        neuquen: horas.neuquen,
        servidor: horas.local
      },
      programacion: {
        next_utc: proxima.utc,
        next_neuquen: proxima.neuquen,
        mensaje: '21:00 hora Neuquén (00:00 UTC)'
      },
      config: {
        provider: process.env.PROVIDER || 'twilio',
        destino: process.env.TO_NUMBER ? '✅ Configurado' : '❌ No configurado'
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

// Endpoint para enviar prueba manual
app.get('/send-test', async (req, res) => {
  try {
    const { enviarRecordatorio, obtenerHoras } = require('./cron');
    const horas = obtenerHoras();
    
    logger.info('🔄 Envío manual solicitado via /send-test');
    
    const resultado = await enviarRecordatorio();
    
    res.json({ 
      success: true, 
      message: '✅ Mensaje de prueba enviado',
      timestamp: new Date().toISOString(),
      horas: horas,
      resultado: resultado
    });
  } catch (error) {
    logger.error('Error en /send-test:', error);
    
    let solucion = 'Error desconocido';
    if (error.message.includes('21608')) {
      solucion = 'El número no está en el sandbox. Enviar "join learn-discave" al +14155238886';
    } else if (error.message.includes('AccountSid')) {
      solucion = 'TWILIO_ACCOUNT_SID incorrecto en Railway variables';
    } else if (error.message.includes('AuthToken')) {
      solucion = 'TWILIO_AUTH_TOKEN incorrecto en Railway variables';
    }
    
    res.status(500).json({ 
      success: false, 
      error: error.message,
      solucion: solucion,
      hora_actual: new Date().toLocaleString('es-AR')
    });
  }
});

// Endpoint para ver mensajes disponibles
app.get('/mensajes', (req, res) => {
  try {
    const { mensajes } = require('./cron');
    res.json({
      total: mensajes.length,
      mensajes: mensajes,
      rotacion: 'Se selecciona aleatoriamente cada día',
      proximo_envio: '21:00 hora Neuquén'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para ver configuración (sin mostrar tokens)
app.get('/config', (req, res) => {
  res.json({
    timezone: {
      servidor: 'UTC',
      destino: 'America/Argentina/Neuquén (UTC-3)',
      hora_envio: '21:00 Neuquén = 00:00 UTC'
    },
    proveedor: process.env.PROVIDER || 'twilio',
    destino_configurado: !!process.env.TO_NUMBER,
    twilio_configurado: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
    entorno: process.env.NODE_ENV || 'development'
  });
});

// Endpoint principal con HTML amigable
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
          max-width: 800px;
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
          transition: transform 0.2s;
        }
        .btn:hover { transform: translateY(-2px); }
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
      </style>
    </head>
    <body>
      <div class="container">
        <h1>💖 Recordatorio de Pastillas</h1>
        
        <div class="status">✅ SISTEMA ACTIVO</div>
        
        <div class="info-box">
          <h3>📋 Información del Sistema</h3>
          <p>Este servicio envía un recordatorio automático todos los días a las <strong>21:00 hora Neuquén</strong>.</p>
        </div>
        
        <div class="time-box">
          <h3>⏰ Próximo Envío</h3>
          <p><strong>UTC:</strong> ${proxima.utc}</p>
          <p><strong>Neuquén:</strong> ${proxima.neuquen}</p>
        </div>
        
        <div class="endpoints">
          <h3>🔗 Endpoints Disponibles</h3>
          <div class="endpoint"><a href="/health" target="_blank">/health</a> - Estado del sistema</div>
          <div class="endpoint"><a href="/send-test" target="_blank">/send-test</a> - Enviar prueba ahora</div>
          <div class="endpoint"><a href="/mensajes" target="_blank">/mensajes</a> - Ver mensajes disponibles</div>
          <div class="endpoint"><a href="/config" target="_blank">/config</a> - Ver configuración</div>
        </div>
        
        <div style="margin-top: 30px; text-align: center;">
          <a href="/send-test" class="btn">🔔 Enviar Prueba Ahora</a>
          <a href="/health" class="btn" style="background: #2196F3;">📊 Ver Estado</a>
        </div>
        
        <div style="margin-top: 30px; font-size: 14px; color: #666; text-align: center;">
          <p>💡 Consejo: Usa /send-test para verificar que todo funcione correctamente.</p>
          <p>🔄 El mensaje se enviará automáticamente todos los días a las 21:00.</p>
        </div>
      </div>
    </body>
    </html>
  `);
});

// Iniciar servidor
app.listen(PORT, () => {
  logger.info('='.repeat(50));
  logger.info(`💖 SERVICIO DE RECORDATORIO INICIADO`);
  logger.info(`📡 Puerto: ${PORT}`);
  logger.info(`⚙️  Entorno: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`📱 Proveedor: ${process.env.PROVIDER || 'twilio'}`);
  logger.info(`⏰ Hora programada: 21:00 Neuquén (00:00 UTC)`);
  logger.info('='.repeat(50));
  
  console.log('\n🚀 SERVIDOR INICIADO CORRECTAMENTE');
  console.log(`👉 URL: http://localhost:${PORT}`);
  console.log('💡 Usa /send-test para probar el envío ahora mismo\n');
  
  // Iniciar cron job
  require('./cron');
});

// Manejo de errores mejorado
process.on('uncaughtException', (error) => {
  logger.error('🚨 UNCAUGHT EXCEPTION:', error);
  // No salir del proceso para que Railway pueda reiniciar si es necesario
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('🚨 UNHANDLED REJECTION at:', promise, 'reason:', reason);
});