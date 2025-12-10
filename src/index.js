const express = require('express');
const dotenv = require('dotenv');
const logger = require('./logger');

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware básico
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  try {
    const { obtenerProximaEjecucion } = require('./cron');
    const proxima = obtenerProximaEjecucion();
    
    res.status(200).json({
      status: '❤️‍🔥 Funcionando',
      timestamp: new Date().toISOString(),
      timezone: process.env.TZ || 'America/Argentina/Buenos_Aires',
      provider: process.env.PROVIDER || 'twilio',
      nextReminder: proxima.toLocaleString('es-AR', { timeZone: process.env.TZ || 'America/Argentina/Salta' }),
      mensaje: 'Recordatorio de pastillas para mi novia 💖'
    });
  } catch (error) {
    res.status(200).json({
      status: '⚠️  Error calculando próxima ejecución',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint para enviar prueba manual
app.get('/send-test', async (req, res) => {
  try {
    const { enviarRecordatorio } = require('./cron');
    const resultado = await enviarRecordatorio();
    
    res.json({ 
      success: true, 
      message: 'Mensaje de prueba enviado',
      timestamp: new Date().toISOString(),
      resultado: resultado
    });
  } catch (error) {
    logger.error('Error en send-test:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      solucion: 'Verifica que el número haya enviado "join learn-discave" al +14155238886'
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
      proximo: 'Se selecciona aleatoriamente cada día'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint simple de verificación
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>💖 Recordatorio de Pastillas</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          h1 { color: #e91e63; }
          .container { max-width: 600px; margin: 0 auto; }
          .endpoint { background: #f5f5f5; padding: 10px; margin: 10px; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>💖 Recordatorio de Pastillas</h1>
          <p>Servicio activo para enviar recordatorios a las 21:00</p>
          <div class="endpoint"><a href="/health">/health</a> - Estado del sistema</div>
          <div class="endpoint"><a href="/send-test">/send-test</a> - Enviar prueba ahora</div>
          <div class="endpoint"><a href="/mensajes">/mensajes</a> - Ver mensajes disponibles</div>
        </div>
      </body>
    </html>
  `);
});

// Iniciar servidor
app.listen(PORT, () => {
  logger.info(`💖 Servidor iniciado en puerto ${PORT}`);
  logger.info(`📱 Proveedor: ${process.env.PROVIDER || 'twilio'}`);
  logger.info(`⏰ Timezone: ${process.env.TZ || 'America/Argentina/Buenos_Aires'}`);
  
  // Iniciar cron job (sin esperar nada)
  require('./cron');
  
  console.log('\n🚀 ENDPOINTS DISPONIBLES:');
  console.log(`   http://localhost:${PORT}/`);
  console.log(`   http://localhost:${PORT}/health`);
  console.log(`   http://localhost:${PORT}/send-test`);
  console.log(`   http://localhost:${PORT}/mensajes`);
  console.log('\n💡 Consejo: Visita /send-test para probar ahora mismo!');
});

// Manejo de errores
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', reason);
});