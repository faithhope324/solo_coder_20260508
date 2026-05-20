const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const services = ['api-gateway', 'user-service', 'order-service', 'payment-service', 'inventory-service', 'notification-service'];

const operations = {
  'api-gateway': ['GET /api/users', 'POST /api/orders', 'GET /api/orders/:id', 'POST /api/payments'],
  'user-service': ['getUser', 'createUser', 'updateUser', 'listUsers'],
  'order-service': ['createOrder', 'getOrder', 'listOrders', 'updateOrderStatus'],
  'payment-service': ['processPayment', 'refundPayment', 'getPaymentStatus'],
  'inventory-service': ['checkStock', 'reserveStock', 'releaseStock'],
  'notification-service': ['sendEmail', 'sendSms', 'sendPushNotification']
};

function generateSpan(serviceName, parentService = null) {
  const ops = operations[serviceName] || ['unknown'];
  const operation = ops[Math.floor(Math.random() * ops.length)];
  const isError = Math.random() < 0.08;
  
  return {
    traceId: uuidv4(),
    spanId: uuidv4(),
    traceState: null,
    parentSpanId: parentService ? uuidv4() : null,
    name: operation,
    kind: 'INTERNAL',
    startTime: Date.now() * 1000000,
    endTime: (Date.now() + Math.floor(Math.random() * 500)) * 1000000,
    status: isError ? 'ERROR' : 'OK',
    statusMessage: isError ? 'Internal Server Error' : undefined,
    serviceName: serviceName,
    parentServiceName: parentService,
    duration: Math.floor(Math.random() * 800) + 10,
    attributes: {
      'http.method': 'GET',
      'http.status_code': isError ? 500 : 200,
      'http.url': `/${operation}`
    },
    tags: {
      error: isError,
      errorMessage: isError ? 'Database connection timeout' : undefined,
      httpMethod: 'GET',
      httpStatus: isError ? 500 : 200
    }
  };
}

function generateBatch() {
  const spans = [];
  const numTraces = Math.floor(Math.random() * 15) + 5;

  for (let i = 0; i < numTraces; i++) {
    const gatewaySpan = generateSpan('api-gateway');
    spans.push(gatewaySpan);

    const downstreamServices = services.filter(s => s !== 'api-gateway');
    const numDownstream = Math.floor(Math.random() * 3) + 1;

    for (let j = 0; j < numDownstream; j++) {
      const downstream = downstreamServices[Math.floor(Math.random() * downstreamServices.length)];
      spans.push(generateSpan(downstream, 'api-gateway'));
    }
  }

  return spans;
}

async function sendSpans() {
  try {
    const spans = generateBatch();
    await axios.post('http://localhost:3001/api/v1/traces', spans);
    console.log(`Sent ${spans.length} spans at ${new Date().toLocaleTimeString()}`);
  } catch (error) {
    console.error('Error sending spans:', error.message);
  }
}

console.log('Starting to generate sample tracing data...');
console.log('Press Ctrl+C to stop');

sendSpans();
setInterval(sendSpans, 2000);
