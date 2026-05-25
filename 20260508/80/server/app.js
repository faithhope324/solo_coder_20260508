const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const path = require('path');
const store = require('./store');
const oauth2Server = require('./oauth2');

const app = express();
const PORT = 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/api', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});
app.use(cookieParser());
app.use(session({
  secret: 'oauth2-demo-secret',
  resave: false,
  saveUninitialized: true
}));

function ensureLoggedIn(req, res, next) {
  if (req.session.user) {
    return next();
  }
  req.session.returnTo = req.originalUrl;
  res.redirect('/oauth/login');
}

app.get('/', (req, res) => {
  res.json({ message: 'OAuth2 Server is running' });
});

app.get('/api/clients', (req, res) => {
  const clients = store.getAllClients();
  res.json(clients);
});

app.post('/api/clients', (req, res) => {
  const { name, redirectUri, description } = req.body;
  if (!name || !redirectUri) {
    return res.status(400).json({ error: 'Name and redirectUri are required' });
  }
  const client = store.createClient(name, redirectUri, description || '');
  res.json(client);
});

app.delete('/api/clients/:clientId', (req, res) => {
  const { clientId } = req.params;
  const client = store.getClient(clientId);
  if (!client) {
    return res.status(404).json({ error: 'Client not found' });
  }
  store.deleteClient(clientId);
  res.json({ success: true });
});

app.get('/api/authorization-records', (req, res) => {
  const records = store.getAuthorizationRecords();
  res.json(records);
});

app.post('/api/authorization-records/:id/revoke', (req, res) => {
  const { id } = req.params;
  const success = store.revokeAuthorization(id);
  if (!success) {
    return res.status(404).json({ error: 'Record not found' });
  }
  res.json({ success: true });
});

app.get('/oauth/login', (req, res) => {
  res.render('login', { error: null });
});

app.post('/oauth/login', (req, res) => {
  const { username, password } = req.body;
  const user = store.getUserByUsername(username);
  if (user && user.password === password) {
    req.session.user = user;
    const returnTo = req.session.returnTo || '/';
    delete req.session.returnTo;
    res.redirect(returnTo);
  } else {
    res.render('login', { error: '用户名或密码错误' });
  }
});

app.get('/oauth/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/oauth/login');
});

app.get('/oauth/authorize',
  ensureLoggedIn,
  (req, res, next) => {
    const { client_id, redirect_uri, response_type, scope } = req.query;
    const client = store.getClient(client_id);
    if (!client) {
      return res.status(400).send('Invalid client');
    }
    if (client.redirectUri !== redirect_uri) {
      return res.status(400).send('Invalid redirect URI');
    }
    if (response_type !== 'code') {
      return res.status(400).send('Invalid response type');
    }
    req.oauth2 = {
      client,
      redirectUri: redirect_uri,
      scope: scope || 'read write'
    };
    next();
  },
  oauth2Server.authorize((client, user, done) => {
    done(null, false, { scope: 'read write' });
  }),
  (req, res) => {
    const { transactionID, client, redirectUri, scope } = req.oauth2;
    res.render('authorize', {
      transactionID,
      client,
      scope: (scope || 'read write').split(' '),
      redirectUri,
      user: req.session.user
    });
  }
);

app.post('/oauth/authorize/decision',
  ensureLoggedIn,
  bodyParser.urlencoded({ extended: true }),
  oauth2Server.decision((req, done) => {
    const allow = req.body.allow !== undefined;
    done(null, allow, { scope: 'read write' });
  })
);

app.post('/oauth/token',
  (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Basic ')) {
      const credentials = Buffer.from(authHeader.slice(6), 'base64').toString().split(':');
      req.body.client_id = credentials[0];
      req.body.client_secret = credentials[1];
    }
    next();
  },
  (req, res, next) => {
    const client = store.getClient(req.body.client_id);
    if (!client || client.secret !== req.body.client_secret) {
      return res.status(401).json({ error: 'invalid_client' });
    }
    req.user = client;
    next();
  },
  oauth2Server.token(),
  oauth2Server.errorHandler()
);

app.get('/api/userinfo', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.slice(7);
  const accessToken = store.getAccessToken(token);
  if (!accessToken || accessToken.expiresAt < Date.now()) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  const user = store.getUserById(accessToken.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({
    id: user.id,
    username: user.username,
    scope: accessToken.scope
  });
});

app.listen(PORT, () => {
  console.log(`OAuth2 Server is running on http://localhost:${PORT}`);
  console.log('Default users:');
  console.log('  alice / password123');
  console.log('  bob / password456');
});
