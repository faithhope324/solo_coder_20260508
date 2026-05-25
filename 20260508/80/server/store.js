const { v4: uuidv4 } = require('uuid');

const clients = new Map();
const users = new Map();
const authorizationCodes = new Map();
const accessTokens = new Map();
const authorizationRecords = [];

users.set('user1', {
  id: 'user1',
  username: 'alice',
  password: 'password123'
});

users.set('user2', {
  id: 'user2',
  username: 'bob',
  password: 'password456'
});

function generateClientId() {
  return 'client_' + uuidv4().replace(/-/g, '').substring(0, 16);
}

function generateClientSecret() {
  return uuidv4().replace(/-/g, '');
}

function createClient(name, redirectUri, description) {
  const id = generateClientId();
  const secret = generateClientSecret();
  const client = {
    id,
    secret,
    name,
    redirectUri,
    description,
    createdAt: new Date().toISOString()
  };
  clients.set(id, client);
  return client;
}

function deleteClient(clientId) {
  clients.delete(clientId);
  for (let i = authorizationRecords.length - 1; i >= 0; i--) {
    if (authorizationRecords[i].clientId === clientId) {
      authorizationRecords.splice(i, 1);
    }
  }
}

function getClient(clientId) {
  return clients.get(clientId);
}

function getAllClients() {
  return Array.from(clients.values());
}

function getUserByUsername(username) {
  for (const user of users.values()) {
    if (user.username === username) {
      return user;
    }
  }
  return null;
}

function getUserById(id) {
  return users.get(id);
}

function saveAuthorizationCode(code, clientId, redirectUri, userId, scope) {
  authorizationCodes.set(code, {
    code,
    clientId,
    redirectUri,
    userId,
    scope,
    expiresAt: Date.now() + 10 * 60 * 1000
  });
}

function getAuthorizationCode(code) {
  return authorizationCodes.get(code);
}

function deleteAuthorizationCode(code) {
  authorizationCodes.delete(code);
}

function saveAccessToken(token, clientId, userId, scope) {
  accessTokens.set(token, {
    token,
    clientId,
    userId,
    scope,
    expiresAt: Date.now() + 3600 * 1000
  });

  const client = getClient(clientId);
  const user = getUserById(userId);
  authorizationRecords.unshift({
    id: uuidv4(),
    clientId,
    clientName: client ? client.name : 'Unknown',
    userId,
    username: user ? user.username : 'Unknown',
    scope,
    authorizedAt: new Date().toISOString(),
    token,
    revoked: false
  });
}

function getAccessToken(token) {
  return accessTokens.get(token);
}

function getAuthorizationRecords() {
  return [...authorizationRecords];
}

function revokeAuthorization(recordId) {
  const record = authorizationRecords.find(r => r.id === recordId);
  if (record) {
    record.revoked = true;
    accessTokens.delete(record.token);
    return true;
  }
  return false;
}

module.exports = {
  createClient,
  deleteClient,
  getClient,
  getAllClients,
  getUserByUsername,
  getUserById,
  saveAuthorizationCode,
  getAuthorizationCode,
  deleteAuthorizationCode,
  saveAccessToken,
  getAccessToken,
  getAuthorizationRecords,
  revokeAuthorization
};
