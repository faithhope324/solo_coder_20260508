const oauth2orize = require('oauth2orize');
const { v4: uuidv4 } = require('uuid');
const store = require('./store');

const server = oauth2orize.createServer();

server.serializeClient((client, done) => {
  done(null, client.id);
});

server.deserializeClient((id, done) => {
  const client = store.getClient(id);
  if (client) {
    return done(null, client);
  }
  done(new Error('Client not found'));
});

server.grant(oauth2orize.grant.code((client, redirectUri, user, ares, done) => {
  const code = uuidv4();
  store.saveAuthorizationCode(code, client.id, redirectUri, user.id, ares.scope);
  done(null, code);
}));

server.exchange(oauth2orize.exchange.code((client, code, redirectUri, done) => {
  const authCode = store.getAuthorizationCode(code);
  if (!authCode) {
    return done(null, false);
  }
  if (authCode.expiresAt < Date.now()) {
    store.deleteAuthorizationCode(code);
    return done(null, false);
  }
  if (client.id !== authCode.clientId) {
    return done(null, false);
  }
  if (redirectUri !== authCode.redirectUri) {
    return done(null, false);
  }

  store.deleteAuthorizationCode(code);
  const token = uuidv4();
  store.saveAccessToken(token, client.id, authCode.userId, authCode.scope);
  done(null, token, null, { expires_in: 3600 });
}));

module.exports = server;
